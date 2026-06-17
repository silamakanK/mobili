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

module.exports = { searchTrips, getTripById, getTodayTrips }
