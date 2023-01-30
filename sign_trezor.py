#!/usr/bin/env python3
from rlp import encode as rlp_encode

from trezorlib.client import get_default_client
from trezorlib import tools

from trezorlib.tools import parse_path
from trezorlib import ethereum
from dotenv import load_dotenv
import os
import json
import rlp

load_dotenv()

# https://stackoverflow.com/questions/63608705/send-signed-transaction-from-trezor-hardware-wallet
# https://ethereum.stackexchange.com/questions/73348/understanding-serialized-unsigned-raw-transaction
# https://ethereum.stackexchange.com/questions/1990/what-is-the-ethereum-transaction-data-structure
# HTTP_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/6-PByQ6WLbhhCuXdZHeyG8XWLKzsj3Fd"

from web3 import Web3

from dotenv import load_dotenv


w3 = Web3(Web3.HTTPProvider("https://mainnet.infura.io/v3/xxx"))
# w3 = Web3(Web3.HTTPProvider(HTTP_RPC_URL))
# w3.middleware_onion.add(LedgerSignerMiddleware)
ABI = json.loads("""[{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"owners","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"owner","type":"address"}],"name":"removeOwner","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"revokeConfirmation","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"},{"name":"","type":"address"}],"name":"confirmations","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"pending","type":"bool"},{"name":"executed","type":"bool"}],"name":"getTransactionCount","outputs":[{"name":"count","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"owner","type":"address"}],"name":"addOwner","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"isConfirmed","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"getConfirmationCount","outputs":[{"name":"count","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"transactions","outputs":[{"name":"destination","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"},{"name":"executed","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getOwners","outputs":[{"name":"","type":"address[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"from","type":"uint256"},{"name":"to","type":"uint256"},{"name":"pending","type":"bool"},{"name":"executed","type":"bool"}],"name":"getTransactionIds","outputs":[{"name":"_transactionIds","type":"uint256[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"getConfirmations","outputs":[{"name":"_confirmations","type":"address[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"transactionCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_required","type":"uint256"}],"name":"changeRequirement","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"confirmTransaction","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"destination","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"}],"name":"submitTransaction","outputs":[{"name":"transactionId","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"MAX_OWNER_COUNT","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"required","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"owner","type":"address"},{"name":"newOwner","type":"address"}],"name":"replaceOwner","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"transactionId","type":"uint256"}],"name":"executeTransaction","outputs":[],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"payable":true,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"transactionId","type":"uint256"}],"name":"Confirmation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"transactionId","type":"uint256"}],"name":"Revocation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"transactionId","type":"uint256"}],"name":"Submission","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"transactionId","type":"uint256"}],"name":"Execution","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"transactionId","type":"uint256"}],"name":"ExecutionFailure","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"}],"name":"OwnerAddition","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"}],"name":"OwnerRemoval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"required","type":"uint256"}],"name":"RequirementChange","type":"event"}]""")


def main():
    # Use first connected device
    client = get_default_client()

    address = "44'/60'/0'/0/0"
    address_n = tools.parse_path(address)
    from_address = ethereum.get_address(client, address_n)

    print(from_address)

    multisig = w3.eth.contract("0x16A0772b17AE004E6645E0e95BF50aD69498a34e", abi=ABI)
    gas_price = w3.toWei(int(input("enter gas price: ")), 'gwei')
    gas_limit = 200000

    data = multisig.encodeABI("confirmTransaction", [106])
    data = bytes.fromhex(data[2:])
    to_address = "0x16A0772b17AE004E6645E0e95BF50aD69498a34e"
    amount = 0

    nonce  = 0

    tx = ethereum.sign_tx(client,
        n=address_n,
        nonce=nonce,
        gas_price=gas_price,
        gas_limit=gas_limit,
        to="0x16A0772b17AE004E6645E0e95BF50aD69498a34e",
        value=amount,
        data=data,
        chain_id=1,
        # tx_type=None,
        )

    to = bytes.fromhex(to_address[2:])

    transaction = rlp_encode((nonce, gas_price, gas_limit, to, amount, data) + tx)

    print(f'{{"hex": "0x{transaction.hex()}"}}')


if __name__ == "__main__":
    main()

