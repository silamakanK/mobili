const rateLimit = require('express-rate-limit')

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Trop de requêtes de paiement.' },
})

const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
})

module.exports = { globalLimiter, authLimiter, paymentLimiter, validateLimiter }
