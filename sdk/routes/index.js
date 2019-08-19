const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')

const models = require('../models')

router.get('/', function (req, res, next) {
  res.status(400)
  next(null, req, res, next)
})

router.get('/api/v1/tokens', bodyParser.json(), models.getTokens)
router.get('/api/v1/tokens/:uuid', bodyParser.json(), models.getToken)

router.post('/api/v1/swaps', bodyParser.json(), models.swapToken)
router.post('/api/v1/finalizeSwap', bodyParser.json(), models.finalizeSwap)

router.post('/api/v1/swapB2E', bodyParser.json() , models.swapTokenB2E)
router.post('/api/v1/finalizeSwapB2E', bodyParser.json(), models.finalizeSwapB2E)

router.post('/api/v1/decrypt', bodyParser.json(), models.decryptCall)

router.post('/api/v1/getBnbBalances', bodyParser.json(), models.getBnbBalance)
router.post('/api/v1/getethBalances', bodyParser.json(), models.getEthBalance)

router.post('/api/v1/getERC20Info', bodyParser.json(), models.getERC20Info)

module.exports = router
