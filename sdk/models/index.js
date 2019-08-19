const db = require('../helpers/db.js').db;
const config = require('../config');
const bnb = require('../helpers/bnb.js');
const eth = require('../helpers/eth.js');
const async = require('async');
const generator = require('generate-password');
const crypto = require('crypto');
const sha256 = require('sha256');
const bip39 = require('bip39');
const algorithm = 'aes-256-ctr';
const axios = require('axios');
const BnbApiClient = require('@binance-chain/javascript-sdk');
const Web3 = require('web3');
const httpClient = axios.create({ baseURL: config.api });
const KEY = process.env.KEY;


const models = {

  encrypt(text, password){
    var cipher = crypto.createCipher(algorithm,password)
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
  },

  decrypt(text, password){
    var decipher = crypto.createDecipher(algorithm,password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
  },

  descryptPayload(req, res, next, callback) {
    const {
      m,
      e,
      t,
      s,
      u,
      p
    } = req.body

    if(!m || !e || !t ||!s || !u || !p) {
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': 'Invalid payload' }
      return next(null, req, res, next)
    }

    const mnemonic = m.hexDecode()
    const encrypted = e.hexDecode()
    const time = t
    const signature = s

    const sig = {
      e: e,
      m: m,
      u: u,
      p: p,
      t: t
    }
    const seed = JSON.stringify(sig)
    const compareSignature = sha256(seed)

    if (compareSignature !== signature) {
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': 'Signature mismatch' }
      return next(null, req, res, next)
    }

    const payload = decrypt(encrypted, mnemonic)

    var data = null
    try {
      data = JSON.parse(payload)
      callback(data)
    } catch (ex) {
      res.status(501)
      res.body = { 'status': 501, 'success': false, 'message': ex }
      return next(null, req, res, next)
    }
  },

  decryptCall(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {
      res.status(200)
      res.body = { 'status': 200, 'success': true, 'result': data }
      return next(null, req, res, next)
    })
  },

  genPassword() {
    return generator.generate({
      length: 20,
      numbers: true,
      symbols: false,
      uppercase: true,
      strict: true
    })
  },

  processBNBAccount(body, callback) {
    const { symbol } = body
    const keyName = config.keyPrepend+symbol+'_key'
    const password = models.genPassword()

    bnb.createKey(keyName, password, (err, keyData) => {
      if(err) {
        console.log(err)
        callback(err)
      }

      models.insertBNBAccount(keyName, password, keyData, callback)
    })
  },

  insertBNBAccount(keyName, keyPassword, keyData, callback) {
    const dbPassword = bip39.generateMnemonic()
    const password = KEY+':'+dbPassword
    const aes256seed = models.encrypt(keyData.seedPhrase, password)
    const aes256password = models.encrypt(keyPassword, password)

    db.oneOrNone('insert into bnb_accounts (uuid, public_key, address, seed_phrase, key_name, password, encr_key, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, now()) returning uuid;', [keyData.publicKey, keyData.address, aes256seed, keyName, aes256password, dbPassword])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  processEthAccount(body, callback) {
    eth.createAccount((err, account) => {
      if(err) {
        console.log(err)
        return callback(err)
      }

      models.insertEthAccount(account, callback)
    })
  },

  insertEthAccount(account, callback) {
    const dbPassword = bip39.generateMnemonic()
    const password = KEY+':'+dbPassword
    const aes256private = models.encrypt(account.privateKey, password)

    db.oneOrNone('insert into eth_accounts (uuid, private_key, address, encr_key, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, now()) returning uuid;', [aes256private, account.address, dbPassword])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  getTokenInfo(uuid, callback) {
    db.oneOrNone('select tok.uuid, tok.name, tok.symbol, tok.unique_symbol, tok.total_supply, tok.erc20_address, tok.mintable, tok.fee_per_swap, tok.minimum_swap_amount, bnb.address as bnb_address from tokens tok left join bnb_accounts bnb on bnb.uuid = tok.bnb_account_uuid where tok.uuid = $1;',[uuid])
    .then((token) => {
      callback(null, token)
    })
    .catch(callback)
  },

  getKey(address, callback) {
    db.oneOrNone('select key_name, seed_phrase as mnemonic, password, encr_key from bnb_accounts where address = $1;', [address])
    .then((key) => {
      if(key.encr_key) {
        const dbPassword = key.encr_key
        const password = KEY+':'+dbPassword
        // console.log(password)
        // console.log(key.password)
        key.password_decrypted = models.decrypt(key.password, password)
        key.mnemonic = models.decrypt(key.mnemonic, password)
      }
      callback(null, key)
    })
    .catch(callback)
  },

  /**
   *  Returns a list of tokens
   */
  getTokens(req, res, next) {
    db.manyOrNone('select tok.uuid, tok.name, tok.symbol, tok.total_supply, tok.minimum_swap_amount, tok.fee_per_swap, tok.listed, tok.listing_proposed, tok.listing_proposal_uuid, tok.erc20_address, tok.created from tokens tok;')
    .then((tokens) => {
      if (!tokens) {
        res.status(404)
        res.body = { 'status': 404, 'success': false, 'result': 'No tokens defined' }
        return next(null, req, res, next)
      } else {
        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': tokens }
        return next(null, req, res, next)
      }
    })
    .catch((err) => {
      console.log(err)
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

  /**
   *  Returns a specific token details. Deposit addresses
   */
  getToken(req, res, next) {
    db.oneOrNone('select tok.uuid, tok.name, tok.symbol, tok.total_supply, tok.minimum_swap_amount, tok.fee_per_swap, tok.erc20_address, tok.created from tokens tok where tok.uuid = $1;',[req.params.uuid])
    .then((token) => {
      if (!token) {
        res.status(404)
        res.body = { 'status': 404, 'success': false, 'result': 'No token defined' }
        return next(null, req, res, next)
      } else {
        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': token }
        return next(null, req, res, next)
      }
    })
    .catch((err) => {
      console.log(err)
      res.status(500)
      res.body = { 'status': 500, 'success': false, 'result': err }
      return next(null, req, res, next)
    })
  },

  /**
  * check to see if the BNB address for that token exists.
  * If so, we return the eth address
  * If not, we create a new address then return it.
  */
  swapToken(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {
      let result = models.validateSwap(data)

      if(result !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      const {
        bnb_address
      } = data

      models.getClientAccountForBnbAddress(bnb_address, (err, clientAccount) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(clientAccount) {
          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': clientAccount }
          return next(null, req, res, next)
        } else {
          eth.createAccount((err, account) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            models.insertClientEthAccount(bnb_address, account, (err, clientAccount) => {
              if(err) {
                console.log(err)
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': clientAccount }
              return next(null, req, res, next)
            })
          })
        }
      })
    })
  },

  validateSwap(body) {
    const {
      bnb_address
    } = body

    if(!bnb_address) {
      return 'bnb_address is required'
    }

    if(!bnb.validateAddress(bnb_address)) {
      return 'bnb_address is invalid'
    }

    return true
  },

  getClientAccountForBnbAddress(bnbAddress, callback) {
    db.oneOrNone('select ca.uuid, ca.bnb_address, cea.address as eth_address from client_accounts ca left join client_eth_accounts cea on cea.uuid = ca.client_eth_account_uuid where ca.bnb_address = $1;', [bnbAddress])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  insertClientEthAccount(bnbAddress, ethAccount, callback) {
    const dbPassword = bip39.generateMnemonic()
    const password = KEY+':'+dbPassword
    const aes256private = models.encrypt(ethAccount.privateKey, password)

    db.oneOrNone('insert into client_eth_accounts(uuid, private_key, address, encr_key, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, now()) returning uuid, address;', [aes256private, ethAccount.address, dbPassword])
    .then((returnedEthAccount) => {
      db.oneOrNone('insert into client_accounts(uuid, bnb_address, client_eth_account_uuid, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, now()) returning uuid, bnb_address;', [bnbAddress, returnedEthAccount.uuid])
      .then((clientAccount) => {
        const returnObj = {
          uuid: clientAccount.uuid,
          bnb_address: clientAccount.bnb_address,
          eth_address: returnedEthAccount.address
        }
        callback(null, returnObj)
      })
      .catch(callback)
    })
    .catch(callback)
  },

  /**
  * Take the token with the eth address, check to see if a transfer was done.
  * Validate that against the swaps that have been recorded previously.
  * Insert all new deposits into swaps.
  * Return all new deposits.
  */
  finalizeSwap(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {

      let result = models.validateFinalizeSwap(data)

      if(result !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      const {
        uuid,
        token_uuid
      } = data

      models.getClientAccountForUuid(uuid, (err, clientAccount) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!clientAccount) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Unable to find swap details' }
          return next(null, req, res, next)
        }

        models.getTokenInfoForSwap(token_uuid, (err, tokenInfo) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          if(!tokenInfo) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'Unable to find token details' }
            return next(null, req, res, next)
          }

          async.parallel([
            (callback) => { eth.getTransactionsForAddress(tokenInfo.erc20_address, clientAccount.eth_address, callback) },
            (callback) => { models.getTransactionHashs(token_uuid, uuid, callback) }
          ], (err, data) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': 'Unable to process request: '+err }
              return next(null, req, res, next)
            }

            const ethTransactions = data[0]
            const swaps = data[1]

            if(!ethTransactions || ethTransactions.length === 0) {
              res.status(400)
              res.body = { 'status': 400, 'success': false, 'result': 'Unable to find a deposit' }
              return next(null, req, res, next)
            }

            const newTransactions = ethTransactions.filter((ethTransaction) => {
              const thisTransaction = swaps.filter((swap) => {
                return swap.deposit_transaction_hash === ethTransaction.transactionHash
              })

              if (thisTransaction.length == 0 &&
                  parseFloat(ethTransaction.amount) >= parseFloat(tokenInfo.minimum_swap_amount)) {
                return true
              } else {
                return false
              }
            })
            
            if(newTransactions.length === 0) {
              res.status(400)
              res.body = { 'status': 400, 'success': false, 'result': 'Unable to find any new deposits' }
              return next(null, req, res, next)
            }

            let accmulatedBalance = newTransactions.map(ethTransaction => ethTransaction.amount).reduce((prev, curr) => prev + curr, 0);

            if(accmulatedBalance < tokenInfo.minimum_swap_amount){
              res.status(400)
              res.body = { 'status': 400, 'success': false, 'result': 'Deposits are less than minimum swap amount' }
              return next(null, req, res, next)
            }

            models.insertSwaps(newTransactions, clientAccount, token_uuid,  (err, newSwaps) => {
              if(err) {
                console.log(err)
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              /* Live processing */
              // console.log(newSwaps)
            
              models.proccessSwaps(newSwaps, tokenInfo, (err, result) => {
                if(err) {
                  console.log(err)
                  res.status(500)
                  res.body = { 'status': 500, 'success': false, 'result': err }
                  return next(null, req, res, next)
                }

                res.status(205)
                res.body = { 'status': 200, 'success': true, 'result': newSwaps }
                return next(null, req, res, next)
              })
              /* Live processing */

            })
          })
        })
      })
    })
  },

  proccessSwaps(swaps, tokenInfo, callback) {
    models.getKey(tokenInfo.bnb_address, async (err, key) => {
      if(err || !key) {
        console.log(err)
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': 'Unable to retrieve key' }
        return next(null, req, res, next)
      }

    const privateFrom = BnbApiClient.crypto.getPrivateKeyFromMnemonic(key.mnemonic);
    const addressFrom = BnbApiClient.crypto.getAddressFromPrivateKey(privateFrom, config.prefix);
    const sequenceURL = `${config.api}api/v1/account/${addressFrom}/sequence`;
    let seq = (await httpClient.get(sequenceURL)).data.sequence;

    let swap_cbs = [];
    for (let i = 0; i < swaps.length; i++) {
      swap_cbs.push(function (callback) {
        models.processSwap(swaps[i], tokenInfo, key, seq + i, callback);
      });
    }
    async.series(swap_cbs, (err, results) => {
      if (err) {
        return callback(err);
      } else {
        callback(null, results);
      }
    });

    /*
    (async () => {
      for (let i = 0; i < swaps.length; i++) {
        await models.processSwap(swaps[i], tokenInfo, key, seq + i, (err, swapResults) => {
          if(err) {
            return callback(err)
          }
          callback(err, swapResults)
        });
      }
    })();*/

    })
  },

  processSwap(swap, tokenInfo, key, seq, callback) {
    let amount_n = parseFloat(swap.amount);
    let minimum_amount_n = parseFloat(tokenInfo.minimum_swap_amount);
    let fee_n = parseFloat(tokenInfo.fee_per_swap);
    if (amount_n < minimum_amount_n) {
      return callback("Transferred amount less than minimum fee, swap skipped");
    }
    bnb.transfer(key.mnemonic, swap.bnb_address, (amount_n - fee_n).toFixed(2), tokenInfo.unique_symbol, 'DOS Swap', seq, (err, swapResult) => {
      if(err) {
        console.log(err)

        return models.revertUpdateWithDepositTransactionHash(swap.uuid, (err) => {
          if(err) {
            console.log(err)
          }

          return callback(err)
        })
      }

      if(swapResult && swapResult.result && swapResult.result.length > 0) {
        let resultHash = swapResult.result[0].hash

        console.log(resultHash)
        models.updateWithTransferTransactionHash(swap.uuid, resultHash, (err) => {
          if(err) {
            return callback(err)
          }

          callback(null, resultHash)
        })
      } else {
        console.log(swapResult)
        return callback('Swap result is not defined')
      }
    })
  },

  revertUpdateWithDepositTransactionHash(uuid, callback) {
    db.none('update swaps set deposit_transaction_hash = null where uuid = $1 and transfer_transaction_hash is null;', [uuid])
    .then(callback)
    .catch(callback)
  },

  updateWithTransferTransactionHash(uuid, hash, callback) {
    db.none('update swaps set transfer_transaction_hash = $2 where uuid = $1;', [uuid, hash])
    .then(callback)
    .catch(callback)
  },



  validateFinalizeSwap(body) {
    const {
      uuid,
      token_uuid
    } = body

    if(!uuid) {
      return 'uuid is required'
    }

    if(!token_uuid) {
      return 'token_uuid is required'
    }

    return true
  },

  getClientAccountForUuid(uuid, callback) {
    db.oneOrNone('select ca.uuid, ca.bnb_address, cea.address as eth_address from client_accounts ca left join client_eth_accounts cea on cea.uuid = ca.client_eth_account_uuid where ca.uuid = $1;', [uuid])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  getTokenInfoForSwap(tokenUuid, callback) {
    db.oneOrNone('select tok.uuid, tok.name, tok.symbol, tok.unique_symbol, tok.total_supply, tok.fee_per_swap, tok.minimum_swap_amount, tok.erc20_address, bnb.address as bnb_address, eth.address as eth_address from tokens tok left join bnb_accounts bnb on bnb.uuid = tok.bnb_account_uuid left join eth_accounts eth on eth.uuid = tok.eth_account_uuid where tok.uuid = $1;', [tokenUuid])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  getTransactionHashs(tokenUuid, clientAccountUuid, callback) {
    db.manyOrNone('select * from swaps where token_uuid = $1 and client_account_uuid = $2;', [tokenUuid, clientAccountUuid])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  getTokenBnbAddress(tokenUuid, callback) {
    db.oneOrNone('select bnb.address from tokens tok left join bnb_accounts bnb on bnb.uuid = tok.bnb_account_uuid where tok.uuid = $1;' , [tokenUuid])
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  insertSwaps(transactions, clientAccount, tokenUuid, callback) {
    async.map(transactions,
      function (transaction, callbackInner) {
        models.insertSwap(transaction, clientAccount, tokenUuid, callbackInner)
      },
      function(err, result) {
        if (err) {
          console.log(err)
          return callback(err)
        }

        callback(null, result)
      }
    )
  },

  insertSwap(transaction, clientAccount, tokenUuid, callback) {
    db.oneOrNone('insert into swaps (uuid, token_uuid, eth_address, bnb_address, amount, client_account_uuid, deposit_transaction_hash, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, $6, now()) returning uuid, eth_address, bnb_address, amount, deposit_transaction_hash;', [tokenUuid, transaction.from, clientAccount.bnb_address, transaction.amount, clientAccount.uuid, transaction.transactionHash])
    .then((response) => {
      callback(null, response)
    })
    .catch((err) => {
      callback(err)
    })
  },

  swapTokenB2E(req, res, next){
    models.descryptPayload(req, res, next, (data) => {
      
      const {
        eth_address,
        bnb_address,
        token_uuid
      } = data

      console.log(data)

      let result = models.validateB2E(data)

      if(result!== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      models.getTokenBnbAddress(token_uuid, (err, tokenInfo) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!tokenInfo) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Unable to find token details' }
          return next(null, req, res, next)
        }

        res.status(205)
        res.body = { 'status': 200, 'success': true, 'result': tokenInfo }
        return next(null, req, res, next)
      })


    })
  },

  validateB2E(body){
    const {
      eth_address,
      bnb_address
    } = body

    if(!bnb_address) {
      return 'bnb_address is required'
    }

    if(!bnb.validateAddress(bnb_address)) {
      return 'bnb_address is invalid'
    }

    if(!eth_address) {
      return 'eth_address is required'
    }

    if(!eth.validateAddress(eth_address)) {
      return 'eth_address is invalid'
    }

    return true
  },

  finalizeSwapB2E(req, res, next){
    models.descryptPayload(req, res, next, (data) => {

      const {
        eth_address,
        bnb_address,
        token_uuid
      } = data

      models.getTokenInfoForSwap(token_uuid, (err, tokenInfo) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        if(!tokenInfo) {
          res.status(400)
          res.body = { 'status': 400, 'success': false, 'result': 'Unable to find token details' }
          return next(null, req, res, next)
        }

        async.parallel([
          (callback) => { bnb.getTransactionsForAddress(tokenInfo.bnb_address,tokenInfo.unique_symbol, eth_address, bnb_address, callback) },
          (callback) => { models.getTransactionHashsB2E(callback)}
        ], (err, info) => {
          if(err) {
            console.log(err)  
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': 'Unable to process request: '+err }
            return next(null, req, res, next)
          }
          const bnbTransactions = info[0]
          const swaps = info[1]

          // console.log(bnbTransactions)

          if(!bnbTransactions || bnbTransactions.length === 0) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'Unable to find a deposit' }
            return next(null, req, res, next)
          }

          const newTransactions = bnbTransactions.filter((bnbTransaction) => {
            if(!bnbTransaction || bnbTransaction.value <= 0) {
              return false
            }

            const thisTransaction = swaps.filter((swap) => {
              return swap.deposit_transaction_hash === bnbTransaction.txHash
            })

            if(thisTransaction.length > 0) {
              return false
            } else {
              return true
            }
          })

          if(newTransactions.length === 0) {
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'Unable to find any new deposits' }
            return next(null, req, res, next)
          }

          let accmulatedBalance = newTransactions.map(bnbTransaction => bnbTransaction.value).reduce((prev, curr) => parseFloat(prev) + parseFloat(curr), 0);
          if(accmulatedBalance < parseFloat(tokenInfo.minimum_swap_amount)){
            res.status(400)
            res.body = { 'status': 400, 'success': false, 'result': 'Deposits are less than minimum swap amount' }
            return next(null, req, res, next)
          }
          
          models.insertSwapsB2E(newTransactions, token_uuid, (err, newSwaps) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            models.proccessSwapsB2E(newSwaps, tokenInfo, (err, result) => {
              if(err) {
                console.log(err)
                res.status(500)
                res.body = { 'status': 500, 'success': false, 'result': err }
                return next(null, req, res, next)
              }

              console.log(newSwaps)

              res.status(205)
              res.body = { 'status': 200, 'success': true, 'result': newSwaps }
              return next(null, req, res, next)

            })
          })
          
        })
    })
  })
  },

   proccessSwapsB2E(swaps, tokenInfo, callback) {
    models.getEthAccount(tokenInfo.eth_address, async (err, address) => {
      if(err || !address) {
        console.log(err)
        res.status(500)
        res.body = { 'status': 500, 'success': false, 'result': 'Unable to retrieve address' }
        return next(null, req, res, next)
      }

      var web3 = new Web3(new Web3.providers.HttpProvider(config.provider));
      
      nonce = await web3.eth.getTransactionCount(tokenInfo.eth_address, "pending")
      
      let swap_cbs = [];
      for (let i = 0; i < swaps.length; i++) {
        swap_cbs.push(function (callback) {
          models.processSwapB2E(swaps[i], tokenInfo, address, nonce + i, callback);
        });
      }

      async.series(swap_cbs, (err, results) => {
        if (err) {
          return callback(err);
        } else {
          callback(null, results);
        }
      });
    })
  },

  processSwapB2E(swap, tokenInfo, address, nonce, callback) {
    let amount_n = parseFloat(swap.amount);
    let fee_n = parseFloat(tokenInfo.fee_per_swap);

    eth.sendTransaction(tokenInfo.erc20_address, address.private_key_decrypted, tokenInfo.eth_address, swap.eth_address, (amount_n - fee_n).toFixed(2), nonce, (err, swapResult) => {
      if(err) {
        console.log(err)

        return models.revertUpdateWithDepositTransactionHash(swap.uuid, (revertErr) => {
          if(revertErr) {
            console.log(revertErr)
          }
          return callback(err)
        })
      }
      if(swapResult) {
        let resultHash = swapResult

        models.updateWithTransferTransactionHash(swap.uuid, resultHash, (err) => {
          if(err) {
            return callback(err)
          }

          callback(null, resultHash)
        })
      } else {
        console.log(swapResult)
        return callback('Swap result is not defined')
      }
    })
  },


  insertSwapsB2E(transactions, tokenUuid, callback) {
    async.map(transactions,
      function (transaction, callbackInner) {
        models.insertSwapB2E(transaction, tokenUuid, callbackInner)
      },
      function(err, result) {
        if (err) {
          console.log(err)
          return callback(err)
        }

        callback(null, result)
      }
    )
  },

  insertSwapB2E(transaction, tokenUuid, callback) {
    db.oneOrNone('insert into swaps (uuid, token_uuid, eth_address, bnb_address, amount, deposit_transaction_hash, created) values (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3, $4, $5, now()) returning uuid, eth_address, bnb_address, amount, deposit_transaction_hash;', [tokenUuid,  transaction.memo, transaction.fromAddr, transaction.value, transaction.txHash])
    .then((response) => {
      callback(null, response)
    })
    .catch((err) => {
      callback(err)
    })
  },

  //Add label for B2E
  getTransactionHashsB2E(callback){
    db.manyOrNone('select * from swaps')
    .then((response) => {
      callback(null, response)
    })
    .catch(callback)
  },

  getEthAccount(ethAddress, callback) {
    db.oneOrNone('select * from eth_accounts where address = $1;', [ethAddress])
    .then((address) => {
      if(address.encr_key) {
        const dbPassword = address.encr_key
        const password = KEY+':'+dbPassword
        address.private_key_decrypted = models.decrypt(address.private_key, password)
      } else {
        address.private_key_decrypted = address.private_key
      }
      callback(null, address)
    })
    .catch(callback)
  },

  /**
  *  GetBnbBalances( bnb_address, token_uuid )
  *  -- Get the current balance BEP2 address, for the symbol specified
  *  -- Get pending transfers that haven't been processed yet
  */
  getBnbBalance(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {
      let result = models.validateGetBnbBalances(data)

      if(result !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      const {
        bnb_address,
        token_uuid
      } = data

      models.getTokenInfo(token_uuid, (err, tokenInfo) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        bnb.getBalance(bnb_address, (err, balances) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }


          let balance = 0;

          let filteredBalances = balances.filter((balance) => {
            return balance.symbol === tokenInfo.unique_symbol
          })

          if(filteredBalances.length > 0) {
              balance = filteredBalances[0].free
          }

          models.getPendingBnbBalance(token_uuid, bnb_address, (err, pendingBalance) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            const returnObj = {
              balance: parseFloat(balance),
              pendingBalance: parseFloat(pendingBalance.pending_balance ? pendingBalance.pending_balance : 0)
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': returnObj }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

  validateGetBnbBalances(body) {
    let { bnb_address, token_uuid } = body

    if(!bnb_address) {
      return 'bnb_address is required'
    }

    if(!token_uuid) {
      return 'token_uuid is required'
    }

    if(!bnb.validateAddress(bnb_address)) {
      return 'bnb_address is invalid'
    }

    return true
  },

  getPendingBnbBalance(tokenUuid, bnbAddress, callback) {
    db.oneOrNone('select sum(swaps.amount::numeric - tok.fee_per_swap::numeric) as pending_balance from swaps left join tokens tok on tok.uuid = swaps.token_uuid where swaps.token_uuid = $1 and swaps.bnb_address = $2 and swaps.deposit_transaction_hash is not null and swaps.transfer_transaction_hash is null;', [tokenUuid, bnbAddress])
    .then((info) => {
      callback(null, info)
    })
    .catch(callback)
  },


  /**
  *  GetEthBalances( eth_address, token_uuid )
  *  -- Get the current balance ErC20 address, for the symbol specified
  *  -- Get pending transfers that haven't been processed yet
  */
  getEthBalance(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {
      let result = models.validateGetEthbalances(data)

      if(result !== true) {
        res.status(400)
        res.body = { 'status': 400, 'success': false, 'result': result }
        return next(null, req, res, next)
      }

      const {
        eth_address,
        token_uuid
      } = data

      models.getTokenInfo(token_uuid, (err, tokenInfo) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }

        eth.getERC20Balance(eth_address, tokenInfo.erc20_address, (err, balance) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }

          const returnObj = {
            balance: parseFloat(balance),
          }

          res.status(205)
          res.body = { 'status': 200, 'success': true, 'result': returnObj }
          return next(null, req, res, next)

        })
      })
    })
  },

  validateGetEthbalances(body) {
    let { eth_address, token_uuid } = body

    if(!eth_address) {
      return 'eth_address is required'
    }

    if(!token_uuid) {
      return 'token_uuid is required'
    }

    return true
  },

  getERC20Info(req, res, next) {
    models.descryptPayload(req, res, next, (data) => {
      const {
        contract_address
      } = data

      eth.getERC20Name(contract_address, (err, name) => {
        if(err) {
          console.log(err)
          res.status(500)
          res.body = { 'status': 500, 'success': false, 'result': err }
          return next(null, req, res, next)
        }
        eth.getERC20Symbol(contract_address, (err, symbol) => {
          if(err) {
            console.log(err)
            res.status(500)
            res.body = { 'status': 500, 'success': false, 'result': err }
            return next(null, req, res, next)
          }
          eth.getERC20TotalSupply(contract_address, (err, totalSupply) => {
            if(err) {
              console.log(err)
              res.status(500)
              res.body = { 'status': 500, 'success': false, 'result': err }
              return next(null, req, res, next)
            }

            const returnObj = {
              name: name,
              symbol: symbol,
              total_supply: totalSupply,
              address: contract_address
            }

            res.status(205)
            res.body = { 'status': 200, 'success': true, 'result': returnObj }
            return next(null, req, res, next)
          })
        })
      })
    })
  },

}

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }
    return result
}
String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

function decrypt(text,seed){
  var decipher = crypto.createDecipher('aes-256-cbc', seed)
  var dec = decipher.update(text,'base64','utf8')
  dec += decipher.final('utf8');
  return dec;
}

module.exports = models
