// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

contract BlindDrop is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    enum SalePhase {
        NotStarted,
        PreSale,
        PublicSale
    }

    event PhaseChanged(SalePhase previousPhase, SalePhase newPhase);
    event PresaleMerkleRootChanged(bytes32 previousRoot, bytes32 newRoot);
    event Revealed(string baseURI);

    Counters.Counter private _tokenIdCounter;

    string private _contractLevelMetadataURI;
    string public baseURI;
    SalePhase public phase = SalePhase.NotStarted;
    bytes32 public presaleMerkleRoot;
    uint256 public maxSupply;
    uint256 public maxPurchase;
    uint256 public price = 80000000000000000; //0.08 ETH
    string public provenanceHash = "";

    constructor(string memory _name, string memory _symbol, string memory _contractLevelMetadataURIValue, string memory _provenanceHash, uint256 _maxSupply, uint256 _maxPurchase, uint256 _price) ERC721(_name, _symbol) {
        _contractLevelMetadataURI = _contractLevelMetadataURIValue;
        provenanceHash = _provenanceHash;
        maxSupply = _maxSupply;
        maxPurchase = _maxPurchase;
        price = _price;
    }

    function changePhase(SalePhase _phase) public onlyOwner {
        emit PhaseChanged(phase, _phase);

        phase = _phase;
    }

    function setPresaleMerkleRoot(bytes32 _root) public onlyOwner {
        emit PresaleMerkleRootChanged(presaleMerkleRoot, _root);

        presaleMerkleRoot = _root; 
    }

    function reveal(string memory _baseURIValue) public onlyOwner {
        emit Revealed(_baseURIValue);

        baseURI = _baseURIValue;
    }

    function withdraw() public onlyOwner {
        uint balance = address(this).balance;

        (bool success, ) = msg.sender.call{value: balance}("");

        require(success, "Error on withdraw transfer");
    }

    function claim(uint256 quantity, bytes32[] memory proof) public payable {
        require(phase != SalePhase.NotStarted, 'Sale is not open');
        require(quantity > 0 && quantity <= maxPurchase, "Quantity exceeds number of tokens per transaction");
        require(_tokenIdCounter.current() + quantity <= maxSupply, "Not enough lazy minted tokens");
        require(msg.value >= price * quantity, "Amount of ether sent is not correct");
        
        if (phase == SalePhase.PreSale) {
            require(MerkleProof.verify(proof, presaleMerkleRoot, keccak256(abi.encodePacked(msg.sender))), "Not in presale whitelist");
        }

        for(uint256 i = 0; i < quantity; i++) { 
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
        }
    }

    function contractURI() public view returns (string memory) {
        return _contractLevelMetadataURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
