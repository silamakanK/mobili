const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')

async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // Vérification DB : couvre les désactivations de compte après émission du token
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        isActive: true,
        role: true,
        companyId: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })
    if (!user?.isActive) {
      return res.status(401).json({ error: 'Compte désactivé.' })
    }
    req.user = { ...payload, ...user }
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' })
  }
}

module.exports = { authenticate }
