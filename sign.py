import os 

from web3 import Web3
from ledgereth.web3 import LedgerSignerMiddleware
from dotenv import load_dotenv

load_dotenv()

def run():
    w3 = Web3(Web3.HTTPProvider(os.environ['HTTP_RPC_URL']))
    w3.middleware_onion.add(LedgerSignerMiddleware)

    w3.eth.default_account = w3.eth.accounts[0]

    multisig = w3.eth.contract(
        address=input("multisig address: "),
        abi=open('abi.json').read()
    )

    if not multisig.functions.isOwner(w3.eth.default_account).call():
        print(f"Ledger addres is not an owner {w3.eth.default_account}")
        return


    txn_id = int(input("txn id you want to confirm: "))
    gas_price = w3.toWei(int(input("enter gas price: ")), 'gwei')
    txn = multisig.functions.confirmTransaction(47).build_transaction({
        'gas': 200000,
        'gasPrice': gas_price
    })
    
    print("\n", txn, "\n")

    if input("sign and broadcast (y/n)? ") == "y":
        res = w3.eth.send_transaction(txn)
        print(res)
        print()

if __name__ == "__main__":
    run()
