# Circuit setup
ezkl gen-settings -M ./artifacts/network.onnx -O ./artifacts/settings.json
ezkl calibrate-settings -M ./artifacts/network.onnx -D ./artifacts/input.json -O ./artifacts/settings.json --target resources
ezkl compile-circuit -M ./artifacts/network.onnx --compiled-circuit ./artifacts/model.compiled --settings-path ./artifacts/settings.json

LOGROWS=$(python3 -c "import json; print(json.load(open('./artifacts/settings.json'))['run_args']['logrows'])")
SRS_PATH=~/.ezkl/srs/kzg${LOGROWS}.srs

ezkl setup --compiled-circuit ./artifacts/model.compiled --srs-path=${SRS_PATH} \
  --vk-path=./artifacts/vk.key --pk-path=./artifacts/pk.key

# Verifier setup
ezkl create-evm-verifier --srs-path ${SRS_PATH} -S ./artifacts/settings.json --vk-path ./artifacts/vk.key --sol-code-path ../contracts/src/Halo2Verifier.sol
scp ./artifacts/vocabulary.json ./artifacts/settings.json ../contracts/config

# Copy artifacts over to the website/static/artifacts folder
scp ./artifacts/vocabulary.json ./artifacts/settings.json ./artifacts/model.compiled ./artifacts/pk.key ${SRS_PATH} ../website/static/artifacts/

