const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const {
  initiatePaymentHandler,
  webhookHandler,
  getPaymentStatusHandler,
} = require('./payments.controller')

const router = Router()

router.post('/initiate', authenticate, initiatePaymentHandler)
router.post('/webhook', webhookHandler)
router.get('/:id/status', authenticate, getPaymentStatusHandler)

module.exports = router
