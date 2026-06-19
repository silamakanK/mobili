const { Router } = require('express')
const { authLimiter } = require('../../middleware/rate-limit.middleware')
const { registerHandler, loginHandler, logoutHandler } = require('./auth.controller')

const router = Router()

router.post('/register', authLimiter, registerHandler)
router.post('/login', authLimiter, loginHandler)
router.post('/logout', logoutHandler)

module.exports = router
