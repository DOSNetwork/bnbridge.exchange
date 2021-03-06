const Web3 = require('web3');
const fetch = require('node-fetch');
const config = require('../config');

const options = {
  timeout: 60000,
  reconnect: {
    auto: true,
    delay: 5000,
    maxAttempts: false,
    onTimeout: false
  }
};
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.provider, options));

async function getFastGasPriceWei() {
  let response = await fetch("https://www.etherchain.org/api/gasPriceOracle");
  let data = await response.json();
  return web3.utils.toWei(Number(data.fast).toString(), 'Gwei');
}

const eth = {
  createAccount(callback) {
    let account = web3.eth.accounts.create()
    callback(null, account)
  },

  getTransactionsForAddress(contractAddress, depositAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.getPastEvents('Transfer', {
      fromBlock: config.ethStartBlock,
      toBlock: 'latest',
      filter: { to: depositAddress }
    })
      .then((events) => {
        const returnEvents = events.map((event) => {
          return {
            from: event.returnValues.from,
            to: event.returnValues.to,
            amount: parseFloat(web3.utils.fromWei(event.returnValues.value, 'ether')),
            transactionHash: event.transactionHash
          }
        })
        return callback(null, returnEvents)
      })
      .catch((err) => {
        callback(err)
      });
  },

  getTransactions(contractAddress, accountAddress, depositAddress, depositAmount, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.getPastEvents('Transfer', {
      fromBlock: 0,
      toBlock: 'latest',
      filter: { _to: depositAddress, _from: accountAddress }
    })
      .then((events) => {
        let returnEvents = events.filter((event) => {
          if(event.returnValues._from.toUpperCase() == accountAddress.toUpperCase() && event.returnValues._to.toUpperCase() == depositAddress.toUpperCase()) {
            let amount = parseFloat(web3.utils.fromWei(event.returnValues._value._hex, 'ether'))
            return depositAmount == amount
          }
        })
        callback(null, returnEvents)
      })
      .catch((err) => {
        callback(err)
      });

  },

  getERC20Balance(address, contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.balanceOf(address).call({ from: address })
      .then((balance) => {
        const theBalance = web3.utils.fromWei(balance.toString(), 'ether')

        callback(null, theBalance)
      })
      .catch(callback)
  },

  getERC20Symbol(contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.symbol().call({ from: contractAddress })
      .then((symbol) => {
        callback(null, symbol)
      })
      .catch(callback)
  },

  getERC20Name(contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.name().call({ from: contractAddress })
      .then((name) => {
        callback(null, name)
      })
      .catch(callback)
  },

  getERC20TotalSupply(contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.totalSupply().call({ from: contractAddress })
      .then((supply) => {
        if(!supply) {
          return callback(null, null)
        }
        const theSupply = web3.utils.fromWei(supply.toString(), 'ether')
        callback(null, theSupply)
      })
      .catch(callback)
  },

  async getNonce(addr) {
    return web3.eth.getTransactionCount(addr)
  },

  async sendTransaction(contractAddress, privateKey, nonce, to, amount, callback) {
    const sendAmount = web3.utils.toWei(amount, 'ether')
    const tokenInstance = new web3.eth.Contract(config.erc20ABI, contractAddress);
    const callData = tokenInstance.methods.transfer(to, sendAmount).encodeABI();
    const gasPriceFast = await getFastGasPriceWei();

    const tx = {
      to: contractAddress,
      value: '0',
      gasPrice: gasPriceFast,
      gas: 100000,
      nonce: nonce,
      data: callData
    }

    const signed = await web3.eth.accounts.signTransaction(tx, privateKey)
    const rawTx = signed.rawTransaction

    const sendRawTx = rawTx =>
      new Promise((resolve, reject) =>
        web3.eth
        .sendSignedTransaction(rawTx)
        .on('transactionHash', resolve)
        .on('error', reject)
      )

    const result = await sendRawTx(rawTx).catch((err) => {
      return err
    })

    if(result.toString().includes('error')) {
      callback(result, null)
    } else {
      callback(null, result.toString())
    }
  },
}

module.exports = eth
