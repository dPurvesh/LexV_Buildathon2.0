import json
import os
import hashlib
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract


CONFIG_PATH = Path(__file__).resolve().parents[1] / "web3_config.json"


class Web3ServiceError(RuntimeError):
    """Raised when blockchain configuration or execution is unavailable."""


def _load_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise Web3ServiceError(f"Invalid Web3 configuration: {error}") from error


def _provider_url() -> str:
    return os.getenv("WEB3_RPC_URL", "").strip()


def _web3() -> Web3:
    provider_url = _provider_url()
    if not provider_url:
        raise Web3ServiceError("WEB3_RPC_URL is not configured")
    web3 = Web3(Web3.HTTPProvider(provider_url))
    if not web3.is_connected():
        raise Web3ServiceError("Unable to connect to the configured Web3 RPC")
    return web3


def _contract(web3: Web3) -> Contract:
    config = _load_config()
    address = os.getenv("CONTRACT_ADDRESS", config.get("contract_address", ""))
    abi = config.get("abi", [])
    if not address or not abi:
        raise Web3ServiceError("Contract address and ABI are not configured")
    try:
        checksum_address = web3.to_checksum_address(address)
    except ValueError as error:
        raise Web3ServiceError("CONTRACT_ADDRESS is invalid") from error
    return web3.eth.contract(address=checksum_address, abi=abi)


def _account(web3: Web3):
    private_key = os.getenv("WALLET_PRIVATE_KEY", "").strip()
    if not private_key:
        raise Web3ServiceError("WALLET_PRIVATE_KEY is not configured")
    try:
        return Account.from_key(private_key)
    except ValueError as error:
        raise Web3ServiceError("WALLET_PRIVATE_KEY is invalid") from error


def _hash_bytes32(web3: Web3, evidence_hash: str) -> bytes:
    normalized = evidence_hash.removeprefix("0x")
    if len(normalized) != 64:
        raise Web3ServiceError("evidence_hash must be a 32-byte hexadecimal value")
    try:
        return bytes.fromhex(normalized)
    except ValueError as error:
        raise Web3ServiceError("evidence_hash must be hexadecimal") from error


def _wait_for_receipt(web3: Web3, tx_hash: bytes) -> dict[str, Any]:
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt["status"] != 1:
        raise Web3ServiceError("Blockchain transaction failed")
    return {
        "tx_hash": web3.to_hex(tx_hash),
        "block_number": receipt["blockNumber"],
    }


def register_evidence_on_chain(
    evidence_hash: str,
    initial_custodian: str,
    storage_uri: str,
) -> dict[str, Any]:
    if not _provider_url():
        return _mock_transaction(evidence_hash, "register")
    web3 = _web3()
    contract = _contract(web3)
    account = _account(web3)
    tx = contract.functions.registerEvidence(
        _hash_bytes32(web3, evidence_hash),
        web3.to_checksum_address(initial_custodian),
        storage_uri,
    ).build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": web3.eth.chain_id,
            "gas": 300000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    return _wait_for_receipt(web3, web3.eth.send_raw_transaction(signed.raw_transaction))


def transfer_custody_on_chain(
    evidence_hash: str,
    from_custodian: str,
    to_custodian: str,
) -> dict[str, Any]:
    if not _provider_url():
        return _mock_transaction(evidence_hash, "transfer")
    web3 = _web3()
    contract = _contract(web3)
    account = _account(web3)
    tx = contract.functions.transferCustody(
        _hash_bytes32(web3, evidence_hash),
        web3.to_checksum_address(from_custodian),
        web3.to_checksum_address(to_custodian),
    ).build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": web3.eth.chain_id,
            "gas": 250000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    return _wait_for_receipt(web3, web3.eth.send_raw_transaction(signed.raw_transaction))


def verify_evidence_on_chain(evidence_hash: str) -> dict[str, Any]:
    if not _provider_url():
        return {"exists": False, "current_custodian": None, "registered_at": 0, "mock": True}
    web3 = _web3()
    contract = _contract(web3)
    exists, current_custodian, registered_at = contract.functions.verifyEvidence(
        _hash_bytes32(web3, evidence_hash)
    ).call()
    return {
        "exists": exists,
        "current_custodian": current_custodian,
        "registered_at": registered_at,
    }


def _mock_transaction(evidence_hash: str, operation: str) -> dict[str, Any]:
    digest = hashlib.sha256(f"{operation}:{evidence_hash}".encode("utf-8")).hexdigest()
    return {"tx_hash": f"0x{digest}", "block_number": 0, "mock": True}


def blockchain_status() -> dict[str, Any]:
    provider_url = _provider_url()
    if not provider_url:
        return {"connected": False, "configured": False, "error": "WEB3_RPC_URL is not configured"}
    try:
        web3 = _web3()
        status: dict[str, Any] = {
            "connected": True,
            "configured": True,
            "chain_id": web3.eth.chain_id,
            "latest_block": web3.eth.block_number,
        }
        private_key = os.getenv("WALLET_PRIVATE_KEY", "").strip()
        if private_key:
            account = _account(web3)
            status["relayer_address"] = account.address
            status["relayer_balance_wei"] = web3.eth.get_balance(account.address)
            status["relayer_balance_eth"] = float(web3.from_wei(status["relayer_balance_wei"], "ether"))
        else:
            status["relayer_configured"] = False
        return status
    except Web3ServiceError as error:
        return {"connected": False, "configured": True, "error": str(error)}