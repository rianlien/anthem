// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SoulboundNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable() {
        _nextTokenId = 0;
    }

    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    // Soulbound特性: トークンの転送を防止 (一時的に削除)
    // function transferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
    //     require(from == address(0), "Soulbound: Token is not transferable");
    //     super.transferFrom(from, to, tokenId);
    // }

    // function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
    //     require(from == address(0), "Soulbound: Token is not transferable");
    //     super.safeTransferFrom(from, to, tokenId);
    // }

    // function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721) {
    //     require(from == address(0), "Soulbound: Token is not transferable");
    //     super.safeTransferFrom(from, to, tokenId, data);
    // }

    // URIの更新を許可 (所有者のみ)
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    // ERC721Enumerableを実装しないため、totalSupplyは手動で管理
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }
}