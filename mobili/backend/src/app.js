require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const { globalLimiter } = require('./middleware/rate-limit.middleware')
const logger = require('./config/logger')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
)
app.use(express.json())
app.use(globalLimiter)

app.use('/api/auth', require('./modules/auth/auth.router'))
app.use('/api/trips', require('./modules/trips/trips.router'))
app.use('/api/reservations', require('./modules/reservations/reservations.router'))
app.use('/api/payments', require('./modules/payments/payments.router'))
app.use('/api/tickets', require('./modules/tickets/tickets.router'))
app.use('/api/companies', require('./modules/companies/companies.router'))
app.use('/api/routes', require('./modules/routes/routes.router'))
app.use('/api/vehicles', require('./modules/vehicles/vehicles.router'))
app.use('/api/seats', require('./modules/seats/seats.router'))
app.use('/api/users', require('./modules/users/users.router'))
app.use('/api/stats', require('./modules/stats/stats.router'))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use((err, _req, res, _next) => {
  logger.error(err)
  res.status(500).json({ error: 'Erreur interne du serveur.' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  logger.info(`Mobili API démarré sur le port ${PORT}`)
})

module.exports = app
