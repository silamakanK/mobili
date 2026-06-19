const { z } = require('zod')
const authService = require('./auth.service')

const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

async function registerHandler(req, res, next) {
  try {
    const data = registerSchema.parse(req.body)
    const result = await authService.register(data)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors })
    }
    next(err)
  }
}

async function loginHandler(req, res, next) {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data)
    res.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors })
    }
    next(err)
  }
}

function logoutHandler(_req, res) {
  res.json({ success: true, message: 'Déconnecté.' })
}

module.exports = { registerHandler, loginHandler, logoutHandler }
