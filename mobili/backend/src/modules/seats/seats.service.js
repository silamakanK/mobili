const prisma = require('../../config/prisma')

async function listSeats(vehicleId) {
  return prisma.seat.findMany({
    where: { vehicleId },
    orderBy: { seatNumber: 'asc' },
  })
}

async function getSeatById(id) {
  const seat = await prisma.seat.findUnique({ where: { id } })
  if (!seat) {
    const err = new Error('Siège introuvable.')
    err.status = 404
    throw err
  }
  return seat
}

async function updateSeat(id, user, data) {
  const seat = await getSeatById(id)
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: seat.vehicleId },
    select: { companyId: true },
  })
  if (user.role !== 'SUPER_ADMIN' && vehicle?.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
  return prisma.seat.update({ where: { id }, data })
}

async function deleteSeat(id, user) {
  const seat = await getSeatById(id)
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: seat.vehicleId },
    select: { companyId: true },
  })
  if (user.role !== 'SUPER_ADMIN' && vehicle?.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
  return prisma.seat.delete({ where: { id } })
}

module.exports = { listSeats, getSeatById, updateSeat, deleteSeat }
