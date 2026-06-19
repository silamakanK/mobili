const prisma = require('../../config/prisma')

async function searchTrips({ from, to, date }) {
  const departureDateStart = new Date(`${date}T00:00:00.000Z`)
  const departureDateEnd = new Date(`${date}T23:59:59.999Z`)

  const trips = await prisma.trip.findMany({
    where: {
      status: 'SCHEDULED',
      availableSeats: { gt: 0 },
      departureDate: { gte: departureDateStart, lte: departureDateEnd },
      route: {
        origin: { contains: from, mode: 'insensitive' },
        destination: { contains: to, mode: 'insensitive' },
      },
    },
    include: {
      route: {
        select: {
          origin: true,
          destination: true,
          distance: true,
          estimatedDuration: true,
          company: { select: { id: true, name: true, logo: true } },
        },
      },
      vehicle: { select: { type: true, totalSeats: true } },
    },
    orderBy: { departureTime: 'asc' },
  })

  return trips.map(({ route, ...trip }) => ({
    ...trip,
    company: route.company,
    route: {
      origin: route.origin,
      destination: route.destination,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
    },
  }))
}

async function getTripById(id) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: {
        include: { company: { select: { id: true, name: true, logo: true, contactPhone: true } } },
      },
      vehicle: {
        select: {
          type: true,
          totalSeats: true,
          seats: {
            select: { id: true, seatNumber: true, type: true, isAvailable: true },
            orderBy: { seatNumber: 'asc' },
          },
        },
      },
    },
  })
  if (!trip) {
    const err = new Error('Trajet introuvable.')
    err.status = 404
    throw err
  }
  return trip
}

async function getTodayTrips(companyId) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  return prisma.trip.findMany({
    where: {
      route: { companyId },
      departureDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ['SCHEDULED', 'COMPLETED'] },
    },
    include: {
      route: { select: { origin: true, destination: true } },
      vehicle: { select: { type: true, totalSeats: true } },
      reservations: {
        where: { status: 'CONFIRMED' },
        select: { id: true },
      },
    },
    orderBy: { departureTime: 'asc' },
  })
}

async function listCompanyTrips(companyId, { page = 1, limit = 20, from, to } = {}) {
  const skip = (page - 1) * limit
  const where = {
    route: { companyId },
    ...(from && to
      ? {
          departureDate: {
            gte: new Date(`${from}T00:00:00.000Z`),
            lte: new Date(`${to}T23:59:59.999Z`),
          },
        }
      : {}),
  }
  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        route: { select: { id: true, origin: true, destination: true } },
        vehicle: { select: { id: true, registrationNumber: true, type: true, totalSeats: true } },
        reservations: { where: { status: 'CONFIRMED' }, select: { id: true } },
      },
      orderBy: [{ departureDate: 'desc' }, { departureTime: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.trip.count({ where }),
  ])
  return { trips, total, page, limit }
}

async function createTrip(user, data) {
  const { routeId, vehicleId, departureDate, departureTime, price, availableSeats } = data

  const route = await prisma.route.findUnique({ where: { id: routeId } })
  if (!route) {
    const err = new Error('Ligne introuvable.')
    err.status = 404
    throw err
  }
  if (user.role !== 'SUPER_ADMIN' && route.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) {
    const err = new Error('Véhicule introuvable.')
    err.status = 404
    throw err
  }
  if (user.role !== 'SUPER_ADMIN' && vehicle.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }

  return prisma.trip.create({
    data: {
      routeId,
      vehicleId,
      departureDate: new Date(`${departureDate}T00:00:00.000Z`),
      departureTime,
      price,
      availableSeats: availableSeats ?? vehicle.totalSeats,
      status: 'SCHEDULED',
    },
    include: {
      route: { select: { origin: true, destination: true } },
      vehicle: { select: { registrationNumber: true, type: true } },
    },
  })
}

async function updateTrip(id, user, data) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { route: { select: { companyId: true } } },
  })
  if (!trip) {
    const err = new Error('Trajet introuvable.')
    err.status = 404
    throw err
  }
  if (user.role !== 'SUPER_ADMIN' && trip.route.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  const updateData = { ...data }
  if (data.departureDate) {
    updateData.departureDate = new Date(`${data.departureDate}T00:00:00.000Z`)
  }
  return prisma.trip.update({ where: { id }, data: updateData })
}

async function cancelTrip(id, user) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { route: { select: { companyId: true } } },
  })
  if (!trip) {
    const err = new Error('Trajet introuvable.')
    err.status = 404
    throw err
  }
  if (user.role !== 'SUPER_ADMIN' && trip.route.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  return prisma.trip.update({ where: { id }, data: { status: 'CANCELLED' } })
}

module.exports = {
  searchTrips,
  getTripById,
  getTodayTrips,
  listCompanyTrips,
  createTrip,
  updateTrip,
  cancelTrip,
}
