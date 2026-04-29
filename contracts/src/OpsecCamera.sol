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

    uint256 public constant REGISTERS = 8;
    uint256 public constant WORDS_PER_REGISTER = 8;

    address public immutable VERIFIER;
    uint256 public immutable MAX_SUPPLY;

    string[] private _words;

    // tokenId => top word index per register (8 registers)
    mapping(uint256 => uint8[8]) private _tokenLabels;

    constructor(address _verifier, string[] memory words, address _owner, uint256 _maxSupply)
        ERC721("opsec.camera", "OPSEC")
        Ownable(_owner)
    {
        require(words.length == REGISTERS * WORDS_PER_REGISTER, "wordlist must be 64 words");
        VERIFIER = _verifier;
        MAX_SUPPLY = _maxSupply;
        _words = words;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Mint ───────────────────────────────────────────────────────────────────

    function mint(bytes calldata proof, uint256[] calldata instances) external nonReentrant whenNotPaused {
        require(instances.length == REGISTERS * WORDS_PER_REGISTER, "bad instances");

        uint256 id = totalSupply();
        require(id < MAX_SUPPLY, "max supply reached");
        _tokenLabels[id] = _topPerRegister(instances);
        _safeMint(msg.sender, id);

        require(IHalo2Verifier(VERIFIER).verifyProof(proof, instances), "proof invalid");
    }

    // ── Metadata ───────────────────────────────────────────────────────────────

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        uint8[8] memory lbls = _tokenLabels[id];

        string memory svg = _buildSvg(lbls);
        string memory json = string(abi.encodePacked(
            '{"name":"opsec.camera #', id.toString(), '",',
            '"attributes":[',
            '{"trait_type":"label 1","value":"', _words[lbls[0]], '"},',
            '{"trait_type":"label 2","value":"', _words[lbls[1]], '"},',
            '{"trait_type":"label 3","value":"', _words[lbls[2]], '"},',
            '{"trait_type":"label 4","value":"', _words[lbls[3]], '"},',
            '{"trait_type":"label 5","value":"', _words[lbls[4]], '"},',
            '{"trait_type":"label 6","value":"', _words[lbls[5]], '"},',
            '{"trait_type":"label 7","value":"', _words[lbls[6]], '"},',
            '{"trait_type":"label 8","value":"', _words[lbls[7]], '"}',
            '],"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function labels(uint256 id) external view returns (string[8] memory out) {
        _requireOwned(id);
        uint8[8] memory lbls = _tokenLabels[id];
        for (uint256 i = 0; i < 8; i++) {
            out[i] = _words[lbls[i]];
        }
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    function _topPerRegister(uint256[] calldata scores) internal pure returns (uint8[8] memory) {
        uint8[8] memory result;
        for (uint256 r = 0; r < REGISTERS; r++) {
            uint256 base = r * WORDS_PER_REGISTER;
            uint256 best = scores[base];
            uint8 bestIdx = uint8(base);
            for (uint256 j = 1; j < WORDS_PER_REGISTER; j++) {
                if (scores[base + j] > best) {
                    best = scores[base + j];
                    bestIdx = uint8(base + j);
                }
            }
            result[r] = bestIdx;
        }
        return result;
    }

    function _buildSvg(uint8[8] memory lbls) internal view returns (string memory) {
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
            '<text x="10" y="280" class="t">', _words[lbls[6]], '</text>',
            '<text x="10" y="320" class="t">', _words[lbls[7]], '</text>',
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
