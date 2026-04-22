import json
import os

import numpy as np
import onnx
import torch
import torch.nn as nn
from onnxsim import simplify
from transformers import CLIPTextModel, CLIPTokenizer

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
WORDLIST_PATH = os.path.join(os.path.dirname(__file__), "wordlist.json")


def load_wordlist():
    with open(WORDLIST_PATH) as f:
        return json.load(f)


def encode_words(words: list[str]) -> torch.Tensor:
    tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
    model = CLIPTextModel.from_pretrained("openai/clip-vit-base-patch32")
    model.eval()

    embeddings = []
    with torch.no_grad():
        for word in words:
            inputs = tokenizer(
                word,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77,
            )
            outputs = model(**inputs)
            embeddings.append(outputs.pooler_output.squeeze(0))  # (512,)

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

    words = load_wordlist()
    print(f"Encoding {len(words)} words with CLIP text encoder...")

    concept_vectors = encode_words(words)

    model = ConceptMapper(concept_vectors)
    model.eval()

    dummy_input = torch.randn(1, 512)

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

    # input.json — flat list in EZKL format
    input_json_path = os.path.join(ARTIFACTS_DIR, "input.json")
    with open(input_json_path, "w") as f:
        json.dump({"input_data": [dummy_input.numpy().flatten().tolist()]}, f)
    print(f"Exported {input_json_path}")

    # vocabulary.json — index → word mapping
    vocab_path = os.path.join(ARTIFACTS_DIR, "vocabulary.json")
    with open(vocab_path, "w") as f:
        json.dump({str(i): word for i, word in enumerate(words)}, f, indent=2)
    print(f"Exported {vocab_path}")


if __name__ == "__main__":
    main()
