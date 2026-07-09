function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY
}

function getStripe() {
  const Stripe = require('stripe')
  return Stripe(process.env.STRIPE_SECRET_KEY)
}

module.exports = { isConfigured, getStripe }
