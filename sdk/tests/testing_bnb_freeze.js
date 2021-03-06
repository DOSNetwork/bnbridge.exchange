var os = require('os');
var pty = require('node-pty');

var shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

var ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

const AMOUNT = "100000000000000000"
const SYMBOL = 'ANT-B90'
const KEY_NAME = 'key'
const PATH = "c:/opt/fantom/fantom-binance/cli/node-binary/cli/testnet/0.5.8.1/windows/"
const FILE = "tbnbcli.exe"

ptyProcess.on('data', function(data) {
  process.stdout.write(data);
});

ptyProcess.write('cd '+PATH+'\r');
ptyProcess.write('./'+FILE+' token freeze --amount '+AMOUNT+' --symbol '+SYMBOL+' --from '+KEY_NAME+' --chain-id=Binance-Chain-Nile --node=data-seed-pre-2-s1.binance.org:80 --trust-node\r');
