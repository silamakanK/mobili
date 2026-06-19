const rateLimit = require('express-rate-limit')

const isTest = process.env.NODE_ENV === 'test'
const noopMiddleware = (_req, _res, next) => next()

const globalLimiter = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })

const authLimiter = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
    })

const paymentLimiter = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      message: { error: 'Trop de requêtes de paiement.' },
    })

const validateLimiter = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 60 * 1000,
      max: 30,
    })

module.exports = { globalLimiter, authLimiter, paymentLimiter, validateLimiter }
