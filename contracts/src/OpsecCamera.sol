// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IHalo2Verifier} from "./IHalo2Verifier.sol";

contract OpsecCamera is ERC721, ERC721Enumerable, ERC721Pausable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    address public immutable verifier;

    string[] private _words;

    // tokenId => top 6 word indices
    mapping(uint256 => uint8[6]) private _tokenLabels;

    constructor(address _verifier, string[] memory words, address _owner)
        ERC721("opsec.camera", "OPSEC")
        Ownable(_owner)
    {
        verifier = _verifier;
        _words = words;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Mint ───────────────────────────────────────────────────────────────────

    function mint(bytes calldata proof, uint256[] calldata instances) external nonReentrant whenNotPaused {
        require(instances.length == _words.length, "bad instances");

        uint256 id = totalSupply();
        _tokenLabels[id] = _topSix(instances);
        _safeMint(msg.sender, id);

        require(IHalo2Verifier(verifier).verifyProof(proof, instances), "proof invalid");
    }

    // ── Metadata ───────────────────────────────────────────────────────────────

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        uint8[6] memory lbls = _tokenLabels[id];

        string memory svg = _buildSVG(lbls);
        string memory json = string(abi.encodePacked(
            '{"name":"opsec.camera #', id.toString(), '",',
            '"attributes":[',
            '{"trait_type":"label 1","value":"', _words[lbls[0]], '"},',
            '{"trait_type":"label 2","value":"', _words[lbls[1]], '"},',
            '{"trait_type":"label 3","value":"', _words[lbls[2]], '"},',
            '{"trait_type":"label 4","value":"', _words[lbls[3]], '"},',
            '{"trait_type":"label 5","value":"', _words[lbls[4]], '"},',
            '{"trait_type":"label 6","value":"', _words[lbls[5]], '"}',
            '],"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function labels(uint256 id) external view returns (string[6] memory out) {
        _requireOwned(id);
        uint8[6] memory lbls = _tokenLabels[id];
        for (uint256 i = 0; i < 6; i++) {
            out[i] = _words[lbls[i]];
        }
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    function _topSix(uint256[] calldata scores) internal view returns (uint8[6] memory) {
        uint8[6] memory result;
        bool[] memory used = new bool[](_words.length);
        for (uint256 i = 0; i < 6; i++) {
            uint256 best;
            uint8 bestIdx;
            for (uint8 j = 0; j < uint8(_words.length); j++) {
                if (!used[j] && scores[j] >= best) {
                    best = scores[j];
                    bestIdx = j;
                }
            }
            result[i] = bestIdx;
            used[bestIdx] = true;
        }
        return result;
    }

    function _buildSVG(uint8[6] memory lbls) internal view returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350">',
            '<style>.t{fill:white;font-family:Georgia,serif;font-size:14px}</style>',
            '<rect width="100%" height="100%" fill="black"/>',
            '<text x="10" y="40"  class="t">', _words[lbls[0]], '</text>',
            '<text x="10" y="80"  class="t">', _words[lbls[1]], '</text>',
            '<text x="10" y="120" class="t">', _words[lbls[2]], '</text>',
            '<text x="10" y="160" class="t">', _words[lbls[3]], '</text>',
            '<text x="10" y="200" class="t">', _words[lbls[4]], '</text>',
            '<text x="10" y="240" class="t">', _words[lbls[5]], '</text>',
            '</svg>'
        ));
    }

    // ── OZ overrides ───────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable, ERC721Pausable) returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
