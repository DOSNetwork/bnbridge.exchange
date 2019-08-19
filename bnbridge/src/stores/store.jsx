import fetch from 'node-fetch';
import config from "../config";
// import FileSaver from 'file-saver';
import {
  ERROR,
  GET_TOKENS,
  TOKENS_UPDATED,
  // GET_FEES,
  // FEES_UPDATED,
  SWAP_TOKEN,
  TOKEN_SWAPPED,
  FINALIZE_SWAP_TOKEN,
  TOKEN_SWAP_FINALIZED,

  TOKEN_SWAP_B2E,
  TOKEN_SWAPPED_B2E,

  TOKEN_SWAP_FINALIZE_B2E,
  TOKEN_SWAP_FINALIZED_B2E,

  GET_BNB_BALANCES,
  BNB_BALANCES_UPDATED,
  GET_ETH_BALANCES,
  ETH_BALANCES_UPDATED,
  GET_ERC20_INFO,
  ERC20_INFO_UPDATED
} from '../constants'
const crypto = require('crypto');
const bip39 = require('bip39');
const sha256 = require('sha256');

const Dispatcher = require('flux').Dispatcher;
const Emitter = require('events').EventEmitter;

const dispatcher = new Dispatcher();
const emitter = new Emitter();

const apiUrl = config.apiUrl;

function encrypt(data, url) {
  const signJson = JSON.stringify(data);
  const signMnemonic = bip39.generateMnemonic();
  const cipher = crypto.createCipher('aes-256-cbc', signMnemonic);
  const signEncrypted =
    cipher.update(signJson, 'utf8', 'base64') + cipher.final('base64');
  var signData = {
    e: signEncrypted.hexEncode(),
    m: signMnemonic.hexEncode(),
    u: sha256(url).toUpperCase(),
    p: sha256(sha256(url).toUpperCase()).toUpperCase(),
    t: new Date().getTime()
  };
  const signSeed = JSON.stringify(signData);
  const signSignature = sha256(signSeed);
  signData.s = signSignature;
  return JSON.stringify(signData);
}

/* eslint-disable */
String.prototype.hexEncode = function () {
  var hex, i;
  var result = '';
  for (i = 0; i < this.length; i++) {
    hex = this.charCodeAt(i).toString(16);
    result += ('000' + hex).slice(-4);
  }
  return result;
};
/* eslint-enable */

class Store {
  constructor() {

    this.store = {
      tokens: [],
      fees: []
    }

    dispatcher.register(
      function (payload) {
        switch (payload.type) {
          case GET_TOKENS:
            this.getTokens(payload);
            break;
          // case GET_FEES:
          //   this.getFees(payload);
          //   break;
          case SWAP_TOKEN:
            this.swapToken(payload);
            break;
          case FINALIZE_SWAP_TOKEN:
            this.finalizeSwapToken(payload);
            break;
          case TOKEN_SWAP_B2E:
            this.swapTokenB2E(payload);
            break;
          case TOKEN_SWAP_FINALIZE_B2E:
            this.finalizeSwapTokenB2E(payload);
            break;            
          case GET_BNB_BALANCES:
            this.getBNBBalances(payload);
            break;
          case GET_ETH_BALANCES:
            this.getETHBalances(payload);
            break;
          case GET_ERC20_INFO:
            this.getERC20Info(payload);
            break;
          default: {
          }
        }
      }.bind(this)
    );
  }

  getStore(index) {
    return(this.store[index]);
  };

  setStore(obj) {
    this.store = {...this.store, ...obj}
    return emitter.emit('StoreUpdated');
  };

  getTokens(payload) {
    const url = "/api/v1/tokens"
    this.callApi(url, 'GET', null, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      // console.log(data)
      this.setStore({ tokens: data.result })
      emitter.emit(TOKENS_UPDATED);
    });
  };

  // getFees(payload) {
  //   const url = "/api/v1/fees"
  //   this.callApi(url, 'GET', null, payload, (err, data) => {
  //     if(err) {
  //       console.log(err)
  //       emitter.emit(ERROR, err);
  //       return
  //     }

  //     this.setStore({ fees: data.result })
  //     emitter.emit(FEES_UPDATED);
  //   });
  // };

  swapToken(payload) {
    const url = "/api/v1/swaps"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      if(data.success) {
        emitter.emit(TOKEN_SWAPPED, data.result);
      } else if (data.errorMsg) {
        emitter.emit(ERROR, data.errorMsg);
      } else {
        emitter.emit(ERROR, data.result);
      }
    });
  };

  finalizeSwapToken(payload) {
    const url = "/api/v1/finalizeSwap"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      if(data.success) {
        emitter.emit(TOKEN_SWAP_FINALIZED, data.result);
      } else if (data.errorMsg) {
        emitter.emit(ERROR, data.errorMsg);
      } else {
        emitter.emit(ERROR, data.result);
      }
    });
  };

  swapTokenB2E(payload) {
    const url = "/api/v1/swapB2E"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }
      if(data.success) {
        emitter.emit(TOKEN_SWAPPED_B2E, data.result);
      } else if (data.errorMsg) {
        emitter.emit(ERROR, data.errorMsg);
      } else {
        emitter.emit(ERROR, data.result);
      }
    })
  }

  finalizeSwapTokenB2E(payload) {
    const url = "/api/v1/finalizeSwapB2E"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      if(data.success) {
        emitter.emit(TOKEN_SWAP_FINALIZED_B2E, data.result);
      } else if (data.errorMsg) {
        emitter.emit(ERROR, data.errorMsg);
      } else {
        emitter.emit(ERROR, data.result);
      }
    });
  };

  getBNBBalances(payload) {
    const url = "/api/v1/getBnbBalances"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      if(data.success) {
        emitter.emit(BNB_BALANCES_UPDATED, data.result);
      } else if (data.errorMsg) {
        emitter.emit(ERROR, data.errorMsg);
      } else {
        emitter.emit(ERROR, data.result);
      }
    });
  };

  getETHBalances(payload) {
    const url = "/api/v1/getEthBalances"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      emitter.emit(ETH_BALANCES_UPDATED, data.result);
    });
  };

  getERC20Info(payload) {
    const url = "/api/v1/getERC20Info"
    this.callApi(url, 'POST', payload.content, payload, (err, data) => {
      if(err) {
        console.log(err)
        emitter.emit(ERROR, err);
        return
      }

      emitter.emit(ERC20_INFO_UPDATED, data.result);
    });
  }

  callApi = function (url, method, postData, payload, callback) {
    const call = apiUrl + url;

    if (method === 'GET') {
      postData = null;
    } else {
      postData = encrypt(postData, url);
    }

    fetch(call, {
      method: method,
      body: postData,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + config.apiToken,
      }
    })
      .then(res => {
        if (res.status === 401) {
          return emitter.emit('Unauthorised', null, null);
        }

        if (res.status === 400) {
          return res.json()
        }

        if (res.ok) {
          return res.json();
        } else {
          throw Error(res.statusText);
        }
      })
      .then(res => {
        callback(null, res)
      })
      .catch(error => {
        console.log(error)
        callback(error, null)
      });
  };
}

var store = new Store();

export default {
  store: store,
  dispatcher: dispatcher,
  emitter: emitter
};
