# Circuit setup
ezkl gen-settings -M ./artifacts/network.onnx -O ./artifacts/settings.json
ezkl calibrate-settings -M ./artifacts/network.onnx -D ./artifacts/input.json -O ./artifacts/settings.json --target resources
ezkl compile-circuit -M ./artifacts/network.onnx --compiled-circuit ./artifacts/model.compiled --settings-path ./artifacts/settings.json
ezkl setup -M ./artifacts/model.compiled --srs-path=~/.ezkl/kzg17.srs

# Verifier setup
ezkl create-evm-verifier --srs-path ~/.ezkl/kzg17.srs -S ./artifacts/settings.json --vk-path ./artifacts/vk.key --sol-code-path ../contracts/Halo2Verifier.sol
scp ./artifacts/vocabulary.json ./artifacts/settings.json ../contracts/config

# Copy artifacts over to the website/static folder
scp ./artifacts/vocabulary.json ./artifacts/settings.json ./artifacts/model.compiled ./artifacts/pk.key ../website/static/

