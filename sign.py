import os 

from web3 import Web3
import ledgereth
from ledgereth.web3 import LedgerSignerMiddleware
from dotenv import load_dotenv

load_dotenv()

def run():
    w3 = Web3(Web3.HTTPProvider(os.environ['HTTP_RPC_URL']))
    w3.middleware_onion.add(LedgerSignerMiddleware)

    accounts = ledgereth.accounts.get_accounts(count=5)
    print("Ledger accounts: ")
    for i, account in enumerate(accounts):
        print(f" {i}. {account.address}")
    print("")
    account_id = input("choose account: ")
    w3.eth.default_account = accounts[int(account_id)].address

    multisig = w3.eth.contract(
        address=input("multisig address: "),
        abi=open('abi.json').read()
    )

    if not multisig.functions.isOwner(w3.eth.default_account).call():
        print(f"Ledger addres is not an owner {w3.eth.default_account}")
        return


    txn_id = int(input("txn id you want to confirm: "))
    gas_price = w3.toWei(int(input("enter gas price: ")), 'gwei')
    txn = multisig.functions.confirmTransaction(txn_id).build_transaction({
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
