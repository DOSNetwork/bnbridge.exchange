const BnbApiClient = require('@binance-chain/javascript-sdk');
const axios = require('axios');
const config = require('../config')

const httpClient = axios.create({ baseURL: config.api });
const bnbClient = new BnbApiClient(config.api);
bnbClient.chooseNetwork(config.network);

const bnb = {
 
  validateAddress(address) {
    // console.log(bnbClient)
    const addressValid = bnbClient.checkAddress(address);
    return addressValid
  },

  transfer(mnemonic, publicTo, amount, asset, message, sequence, callback) {
    mnemonic = mnemonic.replace(/(\r\n|\n|\r)/gm, "");
    const privateFrom = BnbApiClient.crypto.getPrivateKeyFromMnemonic(mnemonic);
    const addressFrom = BnbApiClient.crypto.getAddressFromPrivateKey(privateFrom, config.prefix);
    bnbClient.setPrivateKey(privateFrom).then(_ => {
      bnbClient.initChain().then(_ => {
        // const sequence = res.data.sequence || 0
        console.log((new Date()).getTime())
        console.log("seq: " + sequence)
        return bnbClient.transfer(addressFrom, publicTo, amount, asset, message, sequence)
      })
      .then((result) => {
        if (result.status === 200) {
          callback(null, result)
        } else {
          callback(result)
        }
      })
      .catch((error) => {
        callback(error)
      });
    })
  },

  getBalance(address, callback) {
    const bnbClient = new BnbApiClient(config.api);
    bnbClient.getBalance(address).then((balances) => { callback(null, balances ) });
  },

  getTransactionsForAddress(address, symbol, fromEth, fromBnb, callback) {
    // console.log(fromEth)
    // console.log(fromBnb)
    delta = 7776000000
    time = (new Date).getTime()
    const url = `${config.api}api/v1/transactions?address=${address}&txType=TRANSFER&txAsset=${symbol}&startTime=${time-delta}&side=RECEIVE`

    httpClient
    .get(url)
    .then((res) => {
      let data = res.data.tx
      
      data = data.filter(function (item) {
        return item.fromAddr == fromBnb &&
              item.memo == fromEth 
      })

      callback(null, data)
    })
    .catch((error) => {
      callback(error)
    });

  }
}

module.exports = bnb
