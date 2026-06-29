const MODE = process.env.PAYDUNYA_MODE || 'test'

// PayDunya utilise la même URL API pour test et live — le mode est déterminé par les clés
const API_BASE = 'https://app.paydunya.com/api/v1'

const CHECKOUT_BASE =
  MODE === 'live'
    ? 'https://app.paydunya.com/checkout-invoice/confirm'
    : 'https://app.paydunya.com/sandbox/checkout-invoice/confirm'

function isConfigured() {
  return !!(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_TOKEN
  )
}

function headers() {
  return {
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
    'Content-Type': 'application/json',
  }
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayDunya ${path} → HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayDunya ${path} → HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

module.exports = { isConfigured, apiPost, apiGet, CHECKOUT_BASE }
