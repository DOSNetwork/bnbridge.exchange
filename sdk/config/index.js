const devConfig = require('./dev.json');
const prodConfig = require('./prod.json');

const config = process.env.NODE_ENV === 'prod' ? prodConfig : devConfig;

module.exports = config
