// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {OpsecCamera} from "../src/OpsecCamera.sol";
import {Halo2Verifier} from "../src/Halo2Verifier.sol";

contract Deploy is Script {
    using stdJson for string;

    uint256 constant MAX_SUPPLY = 500;

    function run() external {
        string memory json = vm.readFile("./config/vocabulary.json");
        uint256 wordCount = vm.parseJsonKeys(json, "$").length;

        string[] memory words = new string[](wordCount);
        for (uint256 i = 0; i < wordCount; i++) {
            words[i] = json.readString(string.concat(".", vm.toString(i)));
        }

        vm.startBroadcast();

        Halo2Verifier verifier = new Halo2Verifier();
        new OpsecCamera(address(verifier), words, msg.sender, MAX_SUPPLY);

        vm.stopBroadcast();
    }
}
