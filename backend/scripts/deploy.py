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


def save_config(address: str, abi: list, mock: bool = False, network: str = "mst") -> None:
    CONFIG_PATH.write_text(
        json.dumps(
            {
                "contract_address": address,
                "abi": abi,
                "mock": mock,
                "network": network,
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
        save_config(MOCK_ADDRESS, abi, mock=True, network="mock")
        print(f"Mock deployment configured at {MOCK_ADDRESS}")
        return MOCK_ADDRESS

    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        raise RuntimeError("Unable to connect to WEB3_RPC_URL")
    account = web3.eth.account.from_key(private_key)
    contract = web3.eth.contract(abi=abi, bytecode=bytecode)

    chain_id = web3.eth.chain_id
    gas_price = web3.eth.gas_price
    transaction = contract.constructor().build_transaction(
        {
            "from": account.address,
            "nonce": web3.eth.get_transaction_count(account.address),
            "chainId": chain_id,
            "gas": 1500000,
            "gasPrice": gas_price,
        }
    )
    signed = account.sign_transaction(transaction)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    address = receipt["contractAddress"]

    network_name, explorer_url = get_mst_network_info(chain_id)
    save_config(address, abi, mock=False, network=network_name)
    print(f"Contract deployed on {network_name} (Chain ID {chain_id}) at {address}")
    print(f"Deployment transaction: {web3.to_hex(tx_hash)}")
    print(f"MSTScan Explorer: {explorer_url}/tx/{web3.to_hex(tx_hash)}")
    return address


if __name__ == "__main__":
    deploy()
