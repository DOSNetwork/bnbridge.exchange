const generator = require('generate-password');
const crypto = require('crypto');
const sha256 = require('sha256');
const bip39 = require('bip39');
const algorithm = 'aes-256-ctr';
const KEY = 'witness canyon foot sing song tray task defense float bottom town obvious faint globe door tonight alpha battle purse jazz flag author choose whisper';

function encrypt(text, password){
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text, password){
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}


const pk = "c9ebfe4cf54a0f6752145151184690b3efd956d72507474fadcfab69bdc1d88a"

// const mnemonic = '411b79060b5f43472012c7cb0d615845804e8fd5ef5c86953fd368d802665132db91f08b2288bd379fac29f55229f79bc50a25dc0f9f11f1186483277888090f742b'
// const password = '78e5ddc2094f60dc156a24cb9bfe65869325e41b'
// const encr_key = 'unveil manual boss basket tribe capable corn sphere tired large small remove'

// const dbPassword = encr_key
// const password_1 = KEY+':'+dbPassword

// password_decrypted = decrypt(password, password_1)
// mnemonic_decrypted = decrypt(mnemonic, password_1)

// console.log(mnemonic_decrypted)


const dbPassword = bip39.generateMnemonic()
const password = process.env.KEY+':'+dbPassword
const aes256private = encrypt(pk, password)

console.log("dbpass:" + dbPassword)
console.log("private:" + aes256private)

console.log("+++++++++++++++++++++")


console.log(decrypt(aes256private, process.env.KEY+':'+dbPassword))






