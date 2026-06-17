const prisma = require('../../config/prisma')

function scopeFilter(user) {
  if (user.role === 'SUPER_ADMIN') return {}
  return { companyId: user.companyId }
}

async function listRoutes(user, { page = 1, limit = 20 } = {}) {
  const where = { ...scopeFilter(user), isActive: true }
  const skip = (page - 1) * limit
  const [routes, total] = await Promise.all([
    prisma.route.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.route.count({ where }),
  ])
  return { routes, total, page, limit }
}

async function getRouteById(id) {
  const route = await prisma.route.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  })
  if (!route) {
    const err = new Error('Ligne introuvable.')
    err.status = 404
    throw err
  }
  return route
}

function assertOwnership(route, user) {
  if (user.role !== 'SUPER_ADMIN' && route.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
}

async function createRoute(user, data) {
  const companyId = user.role === 'SUPER_ADMIN' ? data.companyId : user.companyId
  if (!companyId) {
    const err = new Error('companyId requis.')
    err.status = 400
    throw err
  }
  return prisma.route.create({ data: { ...data, companyId } })
}

async function updateRoute(id, user, data) {
  const route = await getRouteById(id)
  assertOwnership(route, user)
  return prisma.route.update({ where: { id }, data })
}

async function deleteRoute(id, user) {
  const route = await getRouteById(id)
  assertOwnership(route, user)
  return prisma.route.update({ where: { id }, data: { isActive: false } })
}

module.exports = { listRoutes, getRouteById, createRoute, updateRoute, deleteRoute }
