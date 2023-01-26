// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

contract BlindDrop is ERC721, ERC721Enumerable, EIP712, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    struct VoucherInfo {
        string data;
        address wallet;
        bytes signature;
    }

    string private constant SIGNING_DOMAIN = 'GOD-Voucher';
    string private constant SIGNATURE_VERSION = '1';

    enum SalePhase {
        NotStarted,
        PreSale,
        PublicSale
    }

    event PhaseChanged(SalePhase previousPhase, SalePhase newPhase);
    event AllowListMerkleRootChanged(bytes32 previousRoot, bytes32 newRoot);
    event Revealed(string baseURI);

    Counters.Counter private _tokenIdCounter;

    string private _contractLevelMetadataURI;
    string private _provenanceHash;

    string public baseURI;
    string public placeholderURI;
    SalePhase public phase = SalePhase.NotStarted;
    bytes32 public allowListMerkleRoot;
    uint256 public maxSupply;
    uint256 public maxPurchase;
    uint256 public price = 80000000000000000; //0.08 ETH

    mapping(address => bool) private _allowedMinters;
    mapping(address => uint256) private callerNonce;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _contractLevelMetadataURIValue,
        string memory _provenanceHashValue,
        string memory _placeholderURI,
        uint256 _maxSupply,
        uint256 _maxPurchase,
        uint256 _price,
        address signer
    ) ERC721(_name, _symbol) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        _contractLevelMetadataURI = _contractLevelMetadataURIValue;
        _provenanceHash = _provenanceHashValue;

        placeholderURI = _placeholderURI;
        maxSupply = _maxSupply;
        maxPurchase = _maxPurchase;
        price = _price;

        _allowedMinters[signer] = true;
    }

    function addSigner(address signer) public onlyOwner {
        _allowedMinters[signer] = true;
    }

    function disableSigner(address signer) public onlyOwner {
        _allowedMinters[signer] = false;
    }

    function changePhase(SalePhase _phase) public onlyOwner {
        emit PhaseChanged(phase, _phase);

        phase = _phase;
    }

    function reveal(string memory _baseURIValue) public onlyOwner {
        emit Revealed(_baseURIValue);

        baseURI = _baseURIValue;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;

        (bool success, ) = msg.sender.call{value: balance}('');

        require(success, 'Error on withdraw transfer');
    }

    function claim(uint256 quantity, VoucherInfo calldata voucher) public payable {
        require(phase != SalePhase.NotStarted, 'Sale is not open');

        require(quantity > 0 && quantity <= maxPurchase, 'Quantity exceeds number of tokens per transaction');
        require(_tokenIdCounter.current() + quantity <= maxSupply, 'Not enough lazy minted tokens');
        require(msg.value >= price * quantity, 'Amount of ether sent is not correct');

        if (phase == SalePhase.PreSale) {
            address signer = verifyVoucherInfo(voucher);
            require(_allowedMinters[signer] == true, 'Voucher: Signature invalid or unauthorized');
            require(_msgSender() == voucher.wallet, 'Voucher: Invalid wallet');
        }

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
        }

        callerNonce[_msgSender()]++;
    }

    function adminMint(address to, uint256 quantity) public onlyOwner {
        require(_tokenIdCounter.current() + quantity <= maxSupply, 'Not enough lazy minted tokens');

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(to, tokenId);
        }
    }

    function getCallerNonce(address msgSigner) external view returns (uint256) {
        return callerNonce[msgSigner];
    }

    function contractURI() public view returns (string memory) {
        return _contractLevelMetadataURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURIValue = baseURI;
        return bytes(baseURIValue).length > 0 ? string(abi.encodePacked(baseURIValue, tokenId.toString())) : placeholderURI;
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function verifyVoucherInfo(VoucherInfo calldata voucher) internal view returns (address) {
        bytes32 digest = hashVoucherInfo(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function hashVoucherInfo(VoucherInfo calldata voucherInfo) internal view returns (bytes32) {
        bytes memory info = abi.encodePacked(voucherInfo.wallet, voucherInfo.data);

        bytes memory domainInfo = abi.encodePacked(
            this.getChainID(),
            SIGNING_DOMAIN,
            SIGNATURE_VERSION,
            address(this),
            callerNonce[_msgSender()]
        );

        return ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(info, domainInfo)));
    }

    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}
