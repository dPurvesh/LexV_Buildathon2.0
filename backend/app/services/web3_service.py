import json
import os
import hashlib
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract


CONFIG_PATH = Path(__file__).resolve().parents[1] / "web3_config.json"


def get_mst_network_info(chain_id: int | None = None) -> tuple[str, str]:
    """
    Detect network name and block explorer URL based on chain_id and environment.
    - Chain ID 54635 -> MST Coral Testnet (https://coral.mstscan.com)
    - Chain ID 91562037 -> MST Testnet (https://testnet.mstscan.com)
    - Chain ID 4646 -> MST Mainnet (https://mstscan.com)
    """
    env_explorer = os.getenv("BLOCK_EXPLORER_URL", "").strip().rstrip("/")
    if chain_id == 54635:
        name = "MST Coral Testnet"
        default_explorer = "https://coral.mstscan.com"
    elif chain_id == 91562037:
        name = "MST Testnet"
        default_explorer = "https://testnet.mstscan.com"
    elif chain_id == 4646:
        name = "MST Mainnet"
        default_explorer = "https://mstscan.com"
    else:
        name = f"MST Network ({chain_id})" if chain_id else "MST Coral Testnet"
        default_explorer = "https://coral.mstscan.com"

    explorer = env_explorer if env_explorer else default_explorer
    return name, explorer


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

    # Check if already immutably registered on-chain
    h_bytes = _hash_bytes32(web3, evidence_hash)
    try:
        exists, current_custodian, registered_at = contract.functions.verifyEvidence(h_bytes).call()
        if exists:
            # Evidence hash is already permanently registered on MST Blockchain
            tx_hex = f"0x{evidence_hash}"
            try:
                latest = web3.eth.block_number
                logs = contract.events.EvidenceRegistered.get_logs(
                    from_block=max(0, latest - 50000),
                    argument_filters={"evidenceHash": h_bytes},
                )
                if logs:
                    tx_hex = web3.to_hex(logs[0]["transactionHash"])
            except Exception:
                pass
            return {
                "tx_hash": tx_hex,
                "block_number": web3.eth.block_number,
                "already_registered": True,
                "registered_at": registered_at,
                "current_custodian": current_custodian,
            }
    except Exception:
        pass

    chain_id = web3.eth.chain_id
    gas_price = web3.eth.gas_price
    tx = contract.functions.registerEvidence(
        h_bytes,
        web3.to_checksum_address(initial_custodian),
        storage_uri,
    ).build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": chain_id,
            "gas": 300000,
            "gasPrice": gas_price,
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
    chain_id = web3.eth.chain_id
    gas_price = web3.eth.gas_price
    tx = contract.functions.transferCustody(
        _hash_bytes32(web3, evidence_hash),
        web3.to_checksum_address(from_custodian),
        web3.to_checksum_address(to_custodian),
    ).build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": chain_id,
            "gas": 250000,
            "gasPrice": gas_price,
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
    config = _load_config()
    contract_addr = os.getenv("CONTRACT_ADDRESS", config.get("contract_address", "")).strip()
    provider_url = _provider_url()
    if not provider_url:
        network_name, explorer_url = get_mst_network_info(None)
        return {
            "connected": False,
            "configured": False,
            "chain_id": None,
            "latest_block": None,
            "relayer_address": None,
            "relayer_balance_eth": 0.0,
            "contract_address": contract_addr,
            "mock_mode": True,
            "network_name": network_name,
            "explorer_url": explorer_url,
            "error": "WEB3_RPC_URL is not configured",
        }
    try:
        web3 = _web3()
        chain_id = web3.eth.chain_id
        network_name, explorer_url = get_mst_network_info(chain_id)
        mock_mode = bool(config.get("mock", False)) or provider_url.lower().startswith(
            ("mock://", "http://127.0.0.1", "http://localhost")
        )
        status: dict[str, Any] = {
            "connected": True,
            "configured": True,
            "chain_id": chain_id,
            "latest_block": web3.eth.block_number,
            "contract_address": contract_addr,
            "mock_mode": mock_mode,
            "network_name": network_name,
            "explorer_url": explorer_url,
        }
        private_key = os.getenv("WALLET_PRIVATE_KEY", "").strip()
        if private_key:
            account = _account(web3)
            status["relayer_address"] = account.address
            status["relayer_balance_wei"] = web3.eth.get_balance(account.address)
            status["relayer_balance_eth"] = float(web3.from_wei(status["relayer_balance_wei"], "ether"))
        else:
            status["relayer_address"] = None
            status["relayer_balance_eth"] = 0.0
            status["relayer_configured"] = False
        return status
    except (Web3ServiceError, Exception) as error:
        network_name, explorer_url = get_mst_network_info(None)
        return {
            "connected": False,
            "configured": True,
            "chain_id": None,
            "latest_block": None,
            "relayer_address": None,
            "relayer_balance_eth": 0.0,
            "contract_address": contract_addr,
            "mock_mode": True,
            "network_name": network_name,
            "explorer_url": explorer_url,
            "error": str(error),
        }
