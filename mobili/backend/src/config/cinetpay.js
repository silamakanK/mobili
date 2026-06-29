const API_BASE = 'https://api-checkout.cinetpay.com/v2'
const CHECKOUT_BASE = 'https://checkout.cinetpay.com/payment'

function isConfigured() {
  return !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID)
}

async function createPayment(payload) {
  const res = await fetch(`${API_BASE}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      currency: 'XOF',
      channels: 'ALL',
      ...payload,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CinetPay /payment → HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

async function checkPayment(transactionId) {
  const res = await fetch(`${API_BASE}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CinetPay /payment/check → HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

module.exports = { isConfigured, createPayment, checkPayment, CHECKOUT_BASE }
