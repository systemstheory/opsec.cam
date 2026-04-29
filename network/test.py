"""
Run inference on the compiled EZKL model using input.json.
Usage: uv run test.py [--input artifacts/input.json]
"""

import argparse
import json
import os

import ezkl

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=os.path.join(ARTIFACTS_DIR, "input.json"))
    parser.add_argument("--model", default=os.path.join(ARTIFACTS_DIR, "model.compiled"))
    parser.add_argument("--settings", default=os.path.join(ARTIFACTS_DIR, "settings.json"))
    parser.add_argument("--vocab", default=os.path.join(ARTIFACTS_DIR, "vocabulary.json"))
    args = parser.parse_args()

    with open(args.settings) as f:
        settings = json.load(f)
    print(f"model_instance_shapes: {settings['model_instance_shapes']}")
    print(f"output_scale:          {settings['model_output_scales']}")

    with open(args.vocab) as f:
        vocab = json.load(f)
    labels = list(vocab.values()) if isinstance(list(vocab.keys())[0], str) and list(vocab.keys())[0].isdigit() else list(vocab)
    print(f"vocab size: {len(labels)}")

    with open(args.input) as f:
        input_data = json.load(f)
    embedding = input_data["input_data"][0]
    print(f"input dims: {len(embedding)}")

    witness_path = os.path.join(ARTIFACTS_DIR, "witness.json")
    res = ezkl.gen_witness(args.input, args.model, witness_path)
    print(f"gen_witness: {res}")

    with open(witness_path) as f:
        witness = json.load(f)

    raw_outputs = witness["outputs"][0]
    FIELD_MOD = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    output_scale = settings["model_output_scales"][0]

    scores = []
    for raw in raw_outputs:
        fe = int(raw, 16) if isinstance(raw, str) else int(raw)
        signed = fe - FIELD_MOD if fe > FIELD_MOD // 2 else fe
        scores.append(signed / (2 ** output_scale))

    ranked = sorted(zip(scores, labels), reverse=True)
    print("\nTop 10 predictions:")
    for score, label in ranked[:10]:
        print(f"  {score:+.4f}  {label}")


if __name__ == "__main__":
    main()
