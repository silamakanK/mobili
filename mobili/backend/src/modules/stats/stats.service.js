const prisma = require('../../config/prisma')

async function getCompanyStats(companyId) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const [dailySales, totalReservations, activeTrips, vehicles, recentReservations] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'CONFIRMED',
          paidAt: { gte: startOfDay, lte: endOfDay },
          reservation: { trip: { route: { companyId } } },
        },
      }),
      prisma.reservation.count({
        where: {
          status: { not: 'CANCELLED' },
          trip: { route: { companyId } },
        },
      }),
      prisma.trip.count({
        where: {
          route: { companyId },
          departureDate: { gte: startOfDay, lte: endOfDay },
          status: 'SCHEDULED',
        },
      }),
      prisma.vehicle.count({ where: { companyId, isActive: true } }),
      prisma.reservation.findMany({
        where: { trip: { route: { companyId } } },
        include: {
          user: { select: { firstName: true, lastName: true } },
          trip: {
            select: {
              departureDate: true,
              departureTime: true,
              route: { select: { origin: true, destination: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  return {
    dailySales: dailySales._sum.amount || 0,
    totalReservations,
    activeTrips,
    vehicles,
    alerts: 0,
    recentReservations,
  }
}

async function getGlobalStats() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const [dailySales, totalReservations, activeTrips, companies, recentReservations] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'CONFIRMED', paidAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.reservation.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.trip.count({
        where: {
          departureDate: { gte: startOfDay, lte: endOfDay },
          status: 'SCHEDULED',
        },
      }),
      prisma.company.count({ where: { isActive: true } }),
      prisma.reservation.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } },
          trip: {
            select: {
              departureDate: true,
              departureTime: true,
              route: {
                select: {
                  origin: true,
                  destination: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  return {
    dailySales: dailySales._sum.amount || 0,
    totalReservations,
    activeTrips,
    companies,
    alerts: 0,
    recentReservations,
  }
}

module.exports = { getCompanyStats, getGlobalStats }
