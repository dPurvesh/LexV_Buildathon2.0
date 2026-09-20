// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceTracker {
    address public immutable relayer;

    struct EvidenceRecord {
        bytes32 evidenceHash;
        address registeredBy;
        address currentCustodian;
        uint256 registeredAt;
        string storageURI;
        bool exists;
    }

    mapping(bytes32 => EvidenceRecord) public records;

    event EvidenceRegistered(
        bytes32 indexed evidenceHash,
        address indexed registeredBy,
        uint256 timestamp,
        string storageURI
    );

    event CustodyTransferred(
        bytes32 indexed evidenceHash,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Unauthorized relayer");
        _;
    }

    constructor() {
        relayer = msg.sender;
    }

    function registerEvidence(
        bytes32 _evidenceHash,
        address _initialCustodian,
        string calldata _storageURI
    ) external onlyRelayer {
        require(!records[_evidenceHash].exists, "Evidence hash already registered");
        records[_evidenceHash] = EvidenceRecord({
            evidenceHash: _evidenceHash,
            registeredBy: _initialCustodian,
            currentCustodian: _initialCustodian,
            registeredAt: block.timestamp,
            storageURI: _storageURI,
            exists: true
        });
        emit EvidenceRegistered(_evidenceHash, _initialCustodian, block.timestamp, _storageURI);
    }

    function transferCustody(
        bytes32 _evidenceHash,
        address _from,
        address _to
    ) external onlyRelayer {
        require(records[_evidenceHash].exists, "Evidence not found");
        require(records[_evidenceHash].currentCustodian == _from, "Mismatched current custodian");
        require(_to != address(0), "Invalid recipient");
        records[_evidenceHash].currentCustodian = _to;
        emit CustodyTransferred(_evidenceHash, _from, _to, block.timestamp);
    }

    function verifyEvidence(bytes32 _evidenceHash)
        external
        view
        returns (bool, address, uint256)
    {
        if (!records[_evidenceHash].exists) {
            return (false, address(0), 0);
        }
        return (
            true,
            records[_evidenceHash].currentCustodian,
            records[_evidenceHash].registeredAt
        );
    }
}