/**
 * Orange Money WebPay — intégration marchande West Africa.
 *
 * Variables d'environnement requises (fournies par Orange Business) :
 *   OM_CLIENT_ID       — identifiant OAuth de l'application
 *   OM_CLIENT_SECRET   — secret OAuth de l'application
 *   OM_MERCHANT_KEY    — clé marchand unique (X-AUTH-TOKEN dans certaines versions)
 *   OM_BASE_URL        — base URL de l'API (ex: https://api.orange.com)
 *   OM_COUNTRY         — code pays 2 lettres (ML pour Mali)
 *
 * Flux :
 *   1. getAccessToken()    → Bearer token (TTL ~3600s)
 *   2. createWebPayment()  → payment_url (page de paiement Orange hébergée)
 *   3. Orange redirige vers return_url et envoie IPN vers notif_url
 *   4. checkPaymentStatus() → vérification du statut côté serveur
 */

const logger = require('./logger')

function isConfigured() {
  return !!(
    process.env.OM_CLIENT_ID &&
    process.env.OM_CLIENT_SECRET &&
    process.env.OM_MERCHANT_KEY &&
    process.env.OM_BASE_URL
  )
}

const country = () => process.env.OM_COUNTRY || 'ML'
const baseUrl = () => (process.env.OM_BASE_URL || '').replace(/\/$/, '')

// Cache du token pour éviter un appel OAuth à chaque paiement
let _tokenCache = { token: null, expiresAt: 0 }

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token
  }

  const credentials = Buffer.from(
    `${process.env.OM_CLIENT_ID}:${process.env.OM_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${baseUrl()}/oauth/v3/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Orange Money OAuth → HTTP ${res.status}: ${text}`)
  }

  const data = await res.json()
  const expiresIn = (data.expires_in || 3600) * 1000
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + expiresIn - 30_000 }
  return data.access_token
}

/**
 * Initie un paiement WebPay Orange Money.
 * Retourne { payment_url, pay_token, notif_token } si succès.
 *
 * @param {object} payload
 * @param {string} payload.order_id        — identifiant unique de la commande (notre payment.id)
 * @param {number} payload.amount          — montant en XOF (entier)
 * @param {string} payload.reference       — description courte affichée au client
 * @param {string} payload.return_url      — URL de retour après paiement
 * @param {string} payload.cancel_url      — URL si le client annule
 * @param {string} payload.notif_url       — URL du webhook IPN Orange
 * @param {string} [payload.lang]          — langue (fr / en), défaut fr
 */
async function createWebPayment(payload) {
  const token = await getAccessToken()

  const res = await fetch(`${baseUrl()}/orange-money-webpay/${country()}/v1/webpayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-AUTH-TOKEN': process.env.OM_MERCHANT_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      merchant_key: process.env.OM_MERCHANT_KEY,
      currency: 'OUV',
      order_id: payload.order_id,
      amount: payload.amount,
      return_url: payload.return_url,
      cancel_url: payload.cancel_url,
      notif_url: payload.notif_url,
      lang: payload.lang || 'fr',
      reference: payload.reference,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Orange Money /webpayment → HTTP ${res.status}: ${text}`)
  }

  const data = await res.json()
  logger.info('Orange Money createWebPayment', { order_id: payload.order_id, status: data.status })
  return data
}

/**
 * Vérifie le statut d'un paiement auprès d'Orange (re-vérification manuelle).
 * @param {string} orderId — notre payment.id (utilisé comme order_id)
 */
async function checkPaymentStatus(orderId) {
  const token = await getAccessToken()

  const res = await fetch(
    `${baseUrl()}/orange-money-webpay/${country()}/v1/transactionstatus/${orderId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AUTH-TOKEN': process.env.OM_MERCHANT_KEY,
        Accept: 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Orange Money /transactionstatus → HTTP ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Vérifie la signature IPN reçue par le webhook Orange.
 * Orange Money envoie un notif_token dans le body IPN.
 * On le compare à celui retourné lors de createWebPayment et stocké en DB.
 *
 * @param {string} receivedToken  — notif_token du body IPN
 * @param {string} storedToken    — notif_token stocké lors de l'initiation
 */
function verifyIpnToken(receivedToken, storedToken) {
  if (!receivedToken || !storedToken) return false
  return receivedToken === storedToken
}

module.exports = {
  isConfigured,
  getAccessToken,
  createWebPayment,
  checkPaymentStatus,
  verifyIpnToken,
}
