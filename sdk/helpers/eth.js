const Web3 = require('web3');
const config = require('../config')

var web3 = new Web3(new Web3.providers.WebsocketProvider(config.provider));

const eth = {
  createAccount(callback) {
    let account = web3.eth.accounts.create()
    callback(null, account)
  },

  validateAddress(address) {
    const addressValid = web3.utils.isAddress(address);
    return addressValid
  },

  getTransactionsForAddress(contractAddress, depositAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.getPastEvents('Transfer', {
      fromBlock: 7349343,
      toBlock: 'latest',
      filter: { to: depositAddress }
    })
    .then((events) => {
      
      const returnEvents = events.map((event) => {
        // console.log(event.returnValues.value._hex)
        return {
          from: event.returnValues.from,
          to: event.returnValues.to,
          amount: parseFloat(web3.utils.fromWei(event.returnValues.value._hex, 'ether')),
          transactionHash: event.transactionHash
        }
      })
      return callback(null, returnEvents)
    })
    .catch((err) => {
      console.log(err)
      // callback(err)
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

  async sendTransaction(contractAddress, privateKey, from, to, amount, nonce, callback) {
    let sendAmount = web3.utils.toWei(amount, 'ether')

    const consumerContract = new web3.eth.Contract(config.erc20ABI, contractAddress);
    const myData = consumerContract.methods.transfer(to, sendAmount).encodeABI();

    const estimateGas = await consumerContract.methods.transfer(to, sendAmount).estimateGas({from: from})
    const estimateGasPrice = await web3.eth.getGasPrice()

    const tx = {
      from,
      to: contractAddress,
      value: '0',
      gasPrice: estimateGasPrice,
      gas: estimateGas,
      chainId: 4,
      nonce: nonce,
      data: myData
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

  getERC20Balance(address, contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.balanceOf(address).call({ from: address })
    .then((balance) => {
      console.log(balance);
      const theBalance = web3.utils.fromWei(balance.toString(), 'ether')

      callback(null, theBalance)
    })
    .catch(callback)
  },

  getERC20Symbol(contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.symbol().call({ from: contractAddress })
    .then((symbol) => {
      console.log(symbol);

      callback(null, symbol)
    })
    .catch(callback)
  },

  getERC20Name(contractAddress, callback) {
    let myContract = new web3.eth.Contract(config.erc20ABI, contractAddress)

    myContract.methods.name().call({ from: contractAddress })
    .then((name) => {
      console.log(name);

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

      console.log(supply);
      const theSupply = web3.utils.fromWei(supply.toString(), 'ether')

      callback(null, theSupply)
    })
    .catch(callback)
  }
}

module.exports = eth
