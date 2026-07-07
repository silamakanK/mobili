const Sentry = require('@sentry/node')

if (process.env.DSN_ENTRY && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn: process.env.DSN_ENTRY,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
  })
}

module.exports = Sentry
