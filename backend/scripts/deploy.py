import json
import os
from pathlib import Path

from solcx import compile_standard, install_solc
from web3 import Web3


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "EvidenceTracker.sol"
CONFIG_PATH = ROOT / "app" / "web3_config.json"
SOLC_VERSION = "0.8.20"
MOCK_ADDRESS = "0x0000000000000000000000000000000000000001"


def compile_contract() -> tuple[list, str]:
    install_solc(SOLC_VERSION)
    source = CONTRACT_PATH.read_text(encoding="utf-8")
    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {CONTRACT_PATH.name: {"content": source}},
            "settings": {"outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}}},
        },
        solc_version=SOLC_VERSION,
    )
    artifact = compiled["contracts"][CONTRACT_PATH.name]["EvidenceTracker"]
    return artifact["abi"], artifact["evm"]["bytecode"]["object"]


def save_config(address: str, abi: list, mock: bool = False) -> None:
    CONFIG_PATH.write_text(
        json.dumps(
            {
                "contract_address": address,
                "abi": abi,
                "mock": mock,
                "network": "mock" if mock else "sepolia",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def deploy() -> str:
    abi, bytecode = compile_contract()
    rpc_url = os.getenv("WEB3_RPC_URL", "").strip()
    private_key = os.getenv("WALLET_PRIVATE_KEY", "").strip()
    if not rpc_url or not private_key or rpc_url.lower().startswith(("mock://", "http://127.0.0.1", "http://localhost")):
        save_config(MOCK_ADDRESS, abi, mock=True)
        print(f"Mock deployment configured at {MOCK_ADDRESS}")
        return MOCK_ADDRESS

    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        raise RuntimeError("Unable to connect to WEB3_RPC_URL")
    account = web3.eth.account.from_key(private_key)
    contract = web3.eth.contract(abi=abi, bytecode=bytecode)
    transaction = contract.constructor().build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": web3.eth.chain_id,
            "gas": 1500000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(transaction)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    address = receipt["contractAddress"]
    save_config(address, abi)
    print(f"Contract deployed at {address}")
    print(f"Deployment transaction: {web3.to_hex(tx_hash)}")
    return address


if __name__ == "__main__":
    deploy()