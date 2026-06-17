const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../../config/prisma')

const SALT_ROUNDS = 12

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

async function register({ firstName, lastName, email, phone, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  })
  if (existing) {
    const field = existing.email === email ? 'email' : 'téléphone'
    const err = new Error(`Ce ${field} est déjà utilisé.`)
    err.status = 409
    throw err
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { firstName, lastName, email, phone, passwordHash, role: 'VOYAGEUR' },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
  })

  const token = signToken({ id: user.id, role: user.role })
  return { user, token }
}

async function login({ email, password }) {
  const raw = await prisma.user.findUnique({ where: { email } })
  if (!raw || !raw.isActive) {
    const err = new Error('Email ou mot de passe incorrect.')
    err.status = 401
    throw err
  }

  const valid = await bcrypt.compare(password, raw.passwordHash)
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect.')
    err.status = 401
    throw err
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      companyId: true,
    },
  })
  const token = signToken({ id: user.id, role: user.role })
  return { user, token }
}

module.exports = { register, login }
