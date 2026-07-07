import json
import os

import numpy as np
import onnx
import torch
import torch.nn as nn
from PIL import Image
from onnxsim import simplify
from transformers import CLIPModel, CLIPTextModelWithProjection, CLIPTokenizer, CLIPVisionModelWithProjection, CLIPImageProcessor

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
WORDLIST_PATH = os.path.join(os.path.dirname(__file__), "vocabulary.json")
REFERENCE_DIR = os.path.join(os.path.dirname(__file__), "reference_images")

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def load_vocabulary():
    """Returns (registers, labels, synonym_lists).
    registers  — list of register dicts from vocabulary.json
    labels     — flat list of concept label strings (len = N)
    synonyms   — flat list of synonym lists (len = N)
    """
    with open(WORDLIST_PATH) as f:
        registers = json.load(f)
    labels, synonyms = [], []
    for reg in registers:
        for concept in reg["concepts"]:
            labels.append(concept["label"])
            synonyms.append(concept.get("synonyms", [concept["label"]]))
    return registers, labels, synonyms


def _reference_images(label: str) -> list[str]:
    """Return sorted image paths under reference_images/<label>/, or []."""
    folder = os.path.join(REFERENCE_DIR, label)
    if not os.path.isdir(folder):
        return []
    return sorted(
        os.path.join(folder, f) for f in os.listdir(folder)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTS
    )


def encode_concepts(labels: list[str], synonym_lists: list[list[str]]) -> torch.Tensor:
    """Encode each concept from reference images if available, else from text synonyms."""
    tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
    text_model = CLIPTextModelWithProjection.from_pretrained("openai/clip-vit-base-patch32")
    text_model.eval()

    vision_model = CLIPVisionModelWithProjection.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPImageProcessor.from_pretrained("openai/clip-vit-base-patch32")
    vision_model.eval()

    embeddings = []
    with torch.no_grad():
        for label, synonyms in zip(labels, synonym_lists):
            image_paths = _reference_images(label)
            if image_paths:
                vecs = []
                for path in image_paths:
                    img = Image.open(path).convert("RGB")
                    inputs = processor(images=img, return_tensors="pt")
                    vecs.append(vision_model(**inputs).image_embeds.squeeze(0))
                embeddings.append(torch.stack(vecs).mean(0))
                print(f"  [{label}] — {len(vecs)} reference image(s)")
            else:
                vecs = []
                for s in synonyms:
                    inputs = tokenizer(s, return_tensors="pt", padding=True, truncation=True, max_length=77)
                    vecs.append(text_model(**inputs).text_embeds.squeeze(0))
                embeddings.append(torch.stack(vecs).mean(0))
                print(f"  [{label}] — text: {synonyms}")

    return torch.stack(embeddings)  # (N, 512)


class ConceptMapper(nn.Module):
    def __init__(self, concept_vectors: torch.Tensor):
        super().__init__()
        n_concepts, dim = concept_vectors.shape
        self.linear = nn.Linear(dim, n_concepts, bias=False)
        with torch.no_grad():
            self.linear.weight.copy_(concept_vectors)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear(x)


def main():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    registers, labels, synonym_lists = load_vocabulary()
    print(f"Encoding {len(labels)} concepts across {len(registers)} registers...")

    concept_vectors = encode_concepts(labels, synonym_lists)
    concept_vectors = concept_vectors / concept_vectors.norm(dim=1, keepdim=True)

    TEMPERATURE = 8.0
    concept_vectors = concept_vectors * TEMPERATURE

    model = ConceptMapper(concept_vectors)
    model.eval()

    # Unit-normalized dummy input — matches actual CLIP image embeddings (magnitude = 1)
    dummy_input = torch.randn(1, 512)
    dummy_input = dummy_input / dummy_input.norm()

    # Export ONNX (opset 14)
    onnx_path = os.path.join(ARTIFACTS_DIR, "network.onnx")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        opset_version=14,
        input_names=["input"],
        output_names=["output"],
    )

    # Simplify with onnxsim
    onnx_model = onnx.load(onnx_path)
    simplified, check = simplify(onnx_model)
    assert check, "onnxsim simplification failed"
    onnx.save(simplified, onnx_path)
    print(f"Exported {onnx_path}")

    # input.json — flat list in EZKL format, normalized to match real inference inputs
    input_json_path = os.path.join(ARTIFACTS_DIR, "input.json")
    with open(input_json_path, "w") as f:
        json.dump({"input_data": [dummy_input.numpy().flatten().tolist()]}, f)
    print(f"Exported {input_json_path}")

    # vocabulary.json — register structure with flat indices for model output alignment
    vocab_path = os.path.join(ARTIFACTS_DIR, "vocabulary.json")
    idx = 0
    export_registers = []
    for reg in registers:
        export_concepts = []
        for concept in reg["concepts"]:
            export_concepts.append({"index": idx, "label": concept["label"]})
            idx += 1
        export_registers.append({"register": reg["register"], "concepts": export_concepts})
    with open(vocab_path, "w") as f:
        json.dump(export_registers, f, indent=2)
    print(f"Exported {vocab_path}")


if __name__ == "__main__":
    main()

