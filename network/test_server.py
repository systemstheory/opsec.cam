import json
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from io import BytesIO

import numpy as np
import onnxruntime as ort
from PIL import Image

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
VOCAB_PATH = os.path.join(os.path.dirname(__file__), "artifacts", "vocabulary.json")
ONNX_PATH = os.path.join(ARTIFACTS_DIR, "network.onnx")
COMPILED_PATH = os.path.join(ARTIFACTS_DIR, "model.compiled")
SETTINGS_PATH = os.path.join(ARTIFACTS_DIR, "settings.json")
VISION_ONNX_PATH = os.path.join(os.path.dirname(__file__), "..", "website", "static", "model", "onnx", "vision_model.onnx")
EZKL_BIN = os.path.join(os.path.dirname(__file__), "..", "..", "ezkl", "target", "release", "ezkl")

# ── load resources once ───────────────────────────────────────────────────────

with open(VOCAB_PATH) as f:
    raw = json.load(f)

# Support both old flat format and new register format
if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "concepts" in raw[0]:
    _registers = raw
    vocabulary = [c["label"] for reg in _registers for c in reg["concepts"]]
else:
    _registers = None
    vocabulary = raw if isinstance(raw, list) else list(raw.values())

def scores_to_registers(scores_by_index: list[dict]) -> list[dict]:
    """Given [{word, score}...] indexed by model output, return per-register top result."""
    if not _registers:
        return scores_by_index
    score_map = {item["word"]: item["score"] for item in scores_by_index}
    results = []
    for reg in _registers:
        concepts = [{"label": c["label"], "score": score_map.get(c["label"], 0.0)} for c in reg["concepts"]]
        winner = max(concepts, key=lambda x: x["score"])
        results.append({"register": reg["register"], "winner": winner["label"], "score": winner["score"], "concepts": concepts})
    return results

session = ort.InferenceSession(ONNX_PATH)
vision_session = ort.InferenceSession(VISION_ONNX_PATH)

print(f"Loaded {len(vocabulary)} vocabulary words")
print("Vision inputs:", [(i.name, i.shape) for i in vision_session.get_inputs()])
print("Vision outputs:", [(o.name, o.shape) for o in vision_session.get_outputs()])

# CLIP preprocessing constants — mirrors vision.ts exactly
SIZE = 224
MEAN = np.array([0.48145466, 0.4578275,  0.40821073], dtype=np.float32)
STD  = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)

def preprocess(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    sw, sh = image.size
    scale = SIZE / min(sw, sh)
    rw, rh = round(sw * scale), round(sh * scale)
    image = image.resize((rw, rh), Image.BILINEAR)
    ox = (rw - SIZE) // 2
    oy = (rh - SIZE) // 2
    image = image.crop((ox, oy, ox + SIZE, oy + SIZE))
    arr = np.array(image, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    return arr.transpose(2, 0, 1)[np.newaxis, :].astype(np.float32)  # (1, 3, 224, 224)

# ── inference ─────────────────────────────────────────────────────────────────

def embed_image(image: Image.Image) -> np.ndarray:
    pixel_values = preprocess(image)
    input_name = vision_session.get_inputs()[0].name
    outputs = vision_session.run(None, {input_name: pixel_values})
    output_names = [o.name for o in vision_session.get_outputs()]
    idx = next((i for i, n in enumerate(output_names) if "image_embeds" in n), 0)
    embedding = outputs[idx][0]
    embedding = embedding / (np.linalg.norm(embedding) or 1.0)
    return embedding.astype(np.float32)

def classify(embedding: np.ndarray) -> list[dict]:
    scores = session.run(None, {"input": embedding[np.newaxis, :]})[0][0]
    ranked = sorted(
        [{"word": vocabulary[i], "score": float(scores[i])} for i in range(len(vocabulary))],
        key=lambda x: x["score"],
        reverse=True,
    )
    return ranked


def ezkl_classify(embedding: np.ndarray) -> dict:
    """Run ezkl gen-witness on the embedding and decode outputs at multiple scales."""
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.json")
        witness_path = os.path.join(tmpdir, "witness.json")

        with open(input_path, "w") as f:
            json.dump({"input_data": [embedding.tolist()]}, f)

        result = subprocess.run(
            [EZKL_BIN, "gen-witness",
             "-D", input_path,
             "-M", COMPILED_PATH,
             "-O", witness_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            raise RuntimeError(f"ezkl gen-witness failed:\n{result.stderr}")

        with open(witness_path) as f:
            witness = json.load(f)

    outputs = witness["outputs"][0]  # list of N field elements, each [l0,l1,l2,l3]
    raw = [_from_limbs_montgomery(limbs) for limbs in outputs]

    ranked = sorted(
        [{"word": vocabulary[i], "score": raw[i] / 128.0} for i in range(len(vocabulary))],
        key=lambda x: x["score"],
        reverse=True,
    )
    return ranked

# ── http server ───────────────────────────────────────────────────────────────

FIELD_MOD = 21888242871839275222246405745257275088548364400416034343698204186575808495617
HALF_MOD = FIELD_MOD // 2
OUTPUT_SCALE = 63

# Montgomery form constants for BN254 — witness.json stores field elements as fe * R mod p
_MONT_R = pow(2, 256)
_MONT_R_INV = pow(_MONT_R, FIELD_MOD - 2, FIELD_MOD)

def _from_limbs_montgomery(limbs: list) -> int:
    """Convert 4×u64 little-endian Montgomery-form limbs to a signed standard integer."""
    fe = sum(int(l) * (2 ** (64 * i)) for i, l in enumerate(limbs))
    standard = (fe * _MONT_R_INV) % FIELD_MOD
    return standard - FIELD_MOD if standard > HALF_MOD else standard

def decode_instances(raw_instances: list) -> list[dict]:
    """Decode EZKL BN254 field elements and rank against vocabulary."""
    decoded = []
    for fe in raw_instances:
        fe = int(fe)
        signed = fe - FIELD_MOD if fe > HALF_MOD else fe
        decoded.append(signed / (2 ** OUTPUT_SCALE))
    n = len(vocabulary)
    scores = decoded[:n]
    return sorted(
        [{"word": vocabulary[i], "ezkl_score": scores[i]} for i in range(n)],
        key=lambda x: x["ezkl_score"],
        reverse=True,
    )

HTML = """<!DOCTYPE html>
<html>
<head>
  <title>opsec.cam test</title>
  <style>
    body { font-family: monospace; background: #111; color: #eee; padding: 2rem; max-width: 1100px; margin: 0 auto; }
    input[type=file], textarea { display: block; margin: 0.5rem 0; }
    textarea { width: 100%; height: 6rem; background: #222; color: #eee; border: 1px solid #444; padding: 0.5rem; box-sizing: border-box; }
    button { background: white; color: black; border: none; padding: 0.5rem 1.5rem; cursor: pointer; font-size: 1rem; margin-right: 0.5rem; }
    img { max-width: 100%; margin: 1rem 0; display: block; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem; }
    h3 { margin: 0 0 0.5rem; }
    .result { margin: 0.2rem 0; display: flex; justify-content: space-between; gap: 1rem; }
    .score { opacity: 0.5; }
    .match { color: #4f4; }
  </style>
</head>
<body>
  <h2>opsec.cam — pipeline debug</h2>

  <h3>image classify</h3>
  <input type="file" id="img" accept="image/*" />
  <img id="preview" style="max-height:200px" />
  <button onclick="runClassify()">onnxruntime</button>
  <button onclick="runClassifyEzkl()">ezkl compare</button>

  <h3 style="margin-top:2rem">decode EZKL instances</h3>
  <p style="opacity:0.5;margin:0">paste the <code>[instances]</code> array from browser console (JSON array of numbers/strings)</p>
  <textarea id="instances" placeholder='[15988994667232347652, ...]'></textarea>
  <button onclick="runDecode()">decode</button>

  <div class="cols" style="grid-template-columns:1fr 1fr 1fr">
    <div><h3>onnxruntime</h3><div id="out-ort"></div></div>
    <div><h3>ezkl (scale=7)</h3><div id="out-ezkl-7"></div></div>
    <div><h3>ezkl decoded (browser)</h3><div id="out-ezkl"></div></div>
  </div>

  <script>
    document.getElementById('img').onchange = e => {
      document.getElementById('preview').src = URL.createObjectURL(e.target.files[0]);
    };

    function renderResults(el, results, scoreKey) {
      // register format
      if (results.length && results[0].register) {
        el.innerHTML = results.map(r =>
          `<div class="result"><span><b>${r.register}</b> → ${r.winner}</span><span class="score">${r.score.toFixed(3)}</span></div>`
        ).join('');
        return;
      }
      // flat format fallback
      el.innerHTML = results.slice(0, 20).map(r =>
        `<div class="result"><span>${r.word}</span><span class="score">${r[scoreKey].toFixed(4)}</span></div>`
      ).join('');
    }

    async function runClassify() {
      const file = document.getElementById('img').files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/classify', { method: 'POST', body: fd });
      const data = await res.json();
      renderResults(document.getElementById('out-ort'), data.results, 'score');
    }

    async function runClassifyEzkl() {
      const file = document.getElementById('img').files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/classify-ezkl', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      renderResults(document.getElementById('out-ort'), data.ort, 'score');
      renderResults(document.getElementById('out-ezkl-7'), data.ezkl, 'score');
    }

    async function runDecode() {
      const raw = document.getElementById('instances').value.trim();
      if (!raw) return;
      const res = await fetch('/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: JSON.parse(raw) })
      });
      const data = await res.json();
      renderResults(document.getElementById('out-ezkl'), data.results, 'ezkl_score');
    }
  </script>
</body>
</html>"""

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(HTML.encode())

    def do_POST(self):
        if self.path == "/decode":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            results = decode_instances(body["instances"])
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"results": results}).encode())
            return

        if self.path not in ("/classify", "/classify-ezkl"):
            self.send_response(404)
            self.end_headers()
            return

        content_type = self.headers.get("Content-Type", "")
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        boundary = content_type.split("boundary=")[-1].encode()
        parts = body.split(b"--" + boundary)
        image_data = None
        for part in parts:
            if b"filename=" in part:
                image_data = part.split(b"\r\n\r\n", 1)[1].rsplit(b"\r\n", 1)[0]
                break

        if not image_data:
            self.send_response(400)
            self.end_headers()
            return

        image = Image.open(BytesIO(image_data)).convert("RGB")
        embedding = embed_image(image)

        if self.path == "/classify-ezkl":
            try:
                ort_flat = classify(embedding)
                ezkl_flat = ezkl_classify(embedding)
                payload = {
                    "ort":  scores_to_registers(ort_flat),
                    "ezkl": scores_to_registers(ezkl_flat),
                }
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                return
        else:
            payload = {"results": scores_to_registers(classify(embedding))}

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())


if __name__ == "__main__":
    server = HTTPServer(("localhost", 8765), Handler)
    print("http://localhost:8765")
    server.serve_forever()
