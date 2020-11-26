const bnbsdk = require('@binance-chain/javascript-sdk');
const { hdkey } = require('ethereumjs-wallet')
const bech32 = require('bech32');
const crypto = require('crypto');
const sha256 = require('sha256');
const bip39 = require('bip39');
const assert = require('assert');

function encrypt(text, password) {
  var cipher = crypto.createCipher('aes-256-ctr', password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function getEthWalletFromMnemonic(mnemonic, startIndex) {
  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(mnemonic));
  const wallet_hdpath = "m/44'/60'/0'/0/";
  const wallet = hdwallet.derivePath(wallet_hdpath + startIndex).getWallet();
  return wallet;
}

// https://github.com/binance-chain/javascript-sdk/issues/163
function bech32EncodedPubKey(pubKeyHex) {
  const aminoPrefix = 'eb5ae98721';
  compressedPubKey = compressed = bnbsdk.crypto.getPublicKey(pubKeyHex).encodeCompressed('hex');
  return bech32.encode('bnbp', bech32.toWords(Buffer.from(aminoPrefix + compressedPubKey, 'hex')));
}

assert(process.env.ISTESTNET != null, "Environment variable ISTESTNET not set!");
assert(process.env.MNEMONIC != null, "Environment variable MNEMONIC is not set!");
assert(process.env.CLIPASSWORD != null, "Environment variable CLIPASSWORD is not set!");
assert(process.env.KEY != null, "Environment variable KEY is not set!");

const ethWallet = getEthWalletFromMnemonic(process.env.MNEMONIC, 0); // Use 1st account
const ethPrivateKey = ethWallet.getPrivateKeyString();
const ethAddress = ethWallet.getChecksumAddressString();

const bnbPrivateKey = bnbsdk.crypto.getPrivateKeyFromMnemonic(process.env.MNEMONIC);
var bnbPublicKey = bnbsdk.crypto.getPublicKeyFromPrivateKey(bnbPrivateKey);
bnbPublicKey = bech32EncodedPubKey(bnbPublicKey);
const bnbAddress = bnbsdk.crypto.getAddressFromPrivateKey(bnbPrivateKey, process.env.ISTESTNET == 1 ? "tbnb" : "bnb");
// aka `encr_key` in schema
const dbPassword = bip39.generateMnemonic()
const encryptionKey = process.env.KEY + ':' + dbPassword
// aka `seed_phrase` in schema
const seed_phrase = encrypt(process.env.MNEMONIC, encryptionKey)
// aka `private_key` in schema.eth_accounts
const encryptedEthPK = encrypt(ethPrivateKey, encryptionKey);
// aka `password` in schema
const encryptedCLIPassword = encrypt(process.env.CLIPASSWORD, encryptionKey)

console.log("%s,%s,%s,%s,%s,%s,%s", bnbPublicKey, bnbAddress, seed_phrase, encryptedCLIPassword, dbPassword, encryptedEthPK, ethAddress);
