require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const { globalLimiter } = require('./middleware/rate-limit.middleware')
const logger = require('./config/logger')

const app = express()

app.use(helmet())
app.use('/api/docs', (_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  )
  next()
})
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
    .filter(Boolean)
    .map((o) => o.replace(/\/$/, ''))
)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origine non autorisée — ${origin}`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
)
app.use(express.json())
app.use(globalLimiter)

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

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
  const status = err.status || 500
  if (status >= 500) logger.error(err)
  else logger.error({ status, message: err.message, stack: err.stack })
  res.status(status).json({ error: err.message || 'Erreur interne du serveur.' })
})

module.exports = app
