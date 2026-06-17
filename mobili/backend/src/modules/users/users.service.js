const bcrypt = require('bcryptjs')
const prisma = require('../../config/prisma')

const SALT_ROUNDS = 12

async function listUsers(user, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const where = user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyId: true,
      },
      orderBy: { lastName: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])
  return { users, total, page, limit }
}

async function createAgent(adminUser, data) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
  })
  if (existing) {
    const field = existing.email === data.email ? 'email' : 'téléphone'
    const err = new Error(`Ce ${field} est déjà utilisé.`)
    err.status = 409
    throw err
  }

  const companyId = adminUser.role === 'SUPER_ADMIN' ? data.companyId : adminUser.companyId
  if (!companyId) {
    const err = new Error('companyId requis.')
    err.status = 400
    throw err
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
  return prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: 'AGENT',
      companyId,
    },
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
}

async function updateUser(id, callerUser, data) {
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    const err = new Error('Utilisateur introuvable.')
    err.status = 404
    throw err
  }
  if (callerUser.role === 'ADMIN_COMPANY' && target.companyId !== callerUser.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  const updateData = { ...data }
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    delete updateData.password
  }
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  })
}

async function deleteUser(id, callerUser) {
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    const err = new Error('Utilisateur introuvable.')
    err.status = 404
    throw err
  }
  if (callerUser.role === 'ADMIN_COMPANY' && target.companyId !== callerUser.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  return prisma.user.update({ where: { id }, data: { isActive: false } })
}

module.exports = { listUsers, createAgent, updateUser, deleteUser }
