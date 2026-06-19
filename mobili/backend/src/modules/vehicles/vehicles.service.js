const prisma = require('../../config/prisma')

function scopeFilter(user) {
  if (user.role === 'SUPER_ADMIN') return {}
  return { companyId: user.companyId }
}

async function listVehicles(user, { page = 1, limit = 20 } = {}) {
  const where = { ...scopeFilter(user), isActive: true }
  const skip = (page - 1) * limit
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { registrationNumber: 'asc' },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ])
  return { vehicles, total, page, limit }
}

async function getVehicleById(id) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      seats: { orderBy: { seatNumber: 'asc' } },
    },
  })
  if (!vehicle) {
    const err = new Error('Véhicule introuvable.')
    err.status = 404
    throw err
  }
  return vehicle
}

function assertOwnership(vehicle, user) {
  if (user.role !== 'SUPER_ADMIN' && vehicle.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
}

async function createVehicle(user, data) {
  const companyId = user.role === 'SUPER_ADMIN' ? data.companyId : user.companyId
  if (!companyId) {
    const err = new Error('companyId requis.')
    err.status = 400
    throw err
  }
  const vehicle = await prisma.vehicle.create({ data: { ...data, companyId } })

  const seats = Array.from({ length: data.totalSeats }, (_, i) => ({
    vehicleId: vehicle.id,
    seatNumber: String(i + 1).padStart(2, '0'),
    type: 'STANDARD',
  }))
  await prisma.seat.createMany({ data: seats })

  return getVehicleById(vehicle.id)
}

async function updateVehicle(id, user, data) {
  const vehicle = await getVehicleById(id)
  assertOwnership(vehicle, user)
  return prisma.vehicle.update({ where: { id }, data })
}

async function deleteVehicle(id, user) {
  const vehicle = await getVehicleById(id)
  assertOwnership(vehicle, user)
  return prisma.vehicle.update({ where: { id }, data: { isActive: false } })
}

module.exports = { listVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle }
