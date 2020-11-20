# BNBridge

### Features:
- [x] Create a new BEP2 BNB account.
- [x] Swap DOS token from ERC20 to BEP2.
- [x] Swap DOS token from BEP2 to ERC20.
- [x] BEP2 <-> BEP20 token transfer guides: [1](https://medium.com/spartanprotocol/swap-bep2-token-for-its-bep20-equivalent-a5054eec314d), [2](https://community.trustwallet.com/t/how-to-swap-twt-bep2-to-twt-bep20/72718).


### Repository
## ./bnbridge
Front end website allowing for BNB to ERC bridge support.

## ./sdk
API used to interact with the CLI utility, Binance javascript SDK and Web3.js to enable BNB to ERC bridge utility.


### Installation
    git clone https://github.com/DOSNetwork/bnbridge.exchange.git
    ./install.sh  (Linux Environment)

    set (`DBUSER`, `DBNAME`, `DBPASSWORD`, `KEY`, `CLIPASSWORD`, `MNEMONIC`) to environment variables.
    run `bash <testnet/mainnet>-setup.sh` to instantiate the DB.
    Keep secrets (`MNEMONIC`, `KEY`, `DBPASSWORD`) offline and to yourself.
    unset environment variables, specifically secrets, and clear bash history.
    update ./config/index.js with
        - databse connection details (the same value as `DBUSER`, `DBNAME`, `DBPASSWORD`).
        - Binance connection details for mainnet/testnet.
        - Ethereum connection details for mainnet/testnet.
    Config https keys and certifications for production.

    cd ./sdk;
    `node ./api.bnbridge.exchange.js` or `pm2 start api.bnbridge.exchange.js`
