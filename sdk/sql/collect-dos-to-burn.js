const crypto = require('crypto');
const Excel = require('exceljs');
const ethUtil = require('ethereumjs-util');
const assert = require('assert');
const Web3 = require('web3');
const abiJson = require('./DOSToken.json');

const nodeURI = 'https://mainnet.infura.io/v3/8e609c76fce442f8a1735fbea9999747';
const web3 = new Web3(new Web3.providers.HttpProvider(nodeURI)); 
const BN = web3.utils.toBN;
const dosAddr = '0x0A913beaD80F321E7Ac35285Ee10d9d922659cB7';
const dosContract = new web3.eth.Contract(abiJson, dosAddr);

function decryptPrivateKey(text, passwd) {
  var decipher = crypto.createDecipher('aes-256-ctr', passwd)
  var decrypted = decipher.update(text,'hex','utf8')
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Generate checksum eth address.
function genEthAddress(encryptedPrivKey, passwd) {
  let privateKey = decryptPrivateKey(encryptedPrivKey, passwd);
  assert(privateKey.length == 66 || privateKey.length == 64, "Invalid private key length!");
  if (privateKey.length == 66) {
    privateKey = privateKey.substr(2);
  }
  return ethUtil.toChecksumAddress(ethUtil.privateToAddress(Buffer.from(privateKey, 'hex')).toString('hex'))
}

const excelPath = process.env.ExcelPath;
assert(excelPath !== undefined, "Please specify path to excel file containing collect information");

assert(process.env.KEY !== undefined, "Please specify db key");
const KEY = process.env.KEY + ':';
// Collect to this address and then burn from this address.
const sinkAddr = '0x250f871E3CcaFdE7b5053f321241FD8bB67a54f8';
// 120 Gwei
const gasPrice = 120 * 1e9;
// 100 K
const gasLimit = 100000;
// gas limit for sending eth.
const ethGasLimit = 21000;

async function collectDOSToBurn(collectFrom, fromPK) {
  let nonce = await web3.eth.getTransactionCount(collectFrom);
  let bal = await dosContract.methods.balanceOf(collectFrom).call();
  let callData = dosContract.methods.transfer(sinkAddr, bal).encodeABI();
  // console.log("calldata = ", callData);
  let txObj = await web3.eth.accounts.signTransaction({
    nonce: nonce++,
    to: dosAddr,
    data: callData,
    value: '0',
    gasPrice: gasPrice,
    gas: gasLimit
  }, fromPK);
  await web3.eth.sendSignedTransaction(txObj.rawTransaction)
    .on('receipt', async function(receipt) {
      if (receipt.status) {
        // Collect resudial eth.
        let balance = await web3.eth.getBalance(collectFrom);
        let availableBalance = BN(balance).sub(BN(gasPrice * ethGasLimit)).toString();
        let txObj2 = await web3.eth.accounts.signTransaction({
          nonce: nonce++,
          to: sinkAddr,
          value: availableBalance,
          gasPrice: gasPrice,
          gas: ethGasLimit
        }, fromPK);
        await web3.eth.sendSignedTransaction(txObj2.rawTransaction)
          .on('receipt', console.log);
      }
    })
}

const workbook = new Excel.Workbook();
workbook.xlsx.readFile(excelPath)
  .then(async function() {
    const worksheet = workbook.getWorksheet(1);
    worksheet.eachRow(async function(row, rowNumber) {
      if (rowNumber != 1) {
        var ethAddr;
        var dbPasswd;
        var encryptedPK;
        row.eachCell(function(cell, colNumber) {
          if (colNumber == 1) {
            ethAddr = cell.value;
          }
          if (colNumber == 2) {
            dbPasswd = cell.value;
          }
          if (colNumber == 3) {
            encryptedPK = cell.value;
          }
        });
        const decryptedPK = decryptPrivateKey(encryptedPK, KEY + dbPasswd);
        const collectFrom = genEthAddress(encryptedPK, KEY + dbPasswd);
        if (collectFrom == ethAddr) {
          await collectDOSToBurn(collectFrom, decryptedPK);
        } else {
          console.log(`--- Abnormal status: recorded ethAddr = ${ethAddr}, computed Eth Addr = ${collectFrom}`);
        }
      }
    });
  });
