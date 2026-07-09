const prisma = require('../../config/prisma')

// Construit la plage de dates selon la période demandée
function buildDateRange(period, from, to) {
  if (from && to) {
    return {
      start: new Date(`${from}T00:00:00.000Z`),
      end: new Date(`${to}T23:59:59.999Z`),
    }
  }
  const now = new Date()
  if (period === 'monthly') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }
  if (period === 'annual') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    }
  }
  // daily (défaut)
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  }
}

async function getCompanyStats(companyId, { period = 'daily', from, to, date } = {}) {
  // Rétrocompatibilité : ancienne API passait un date string
  if (date && !from) {
    const base = new Date(date)
    return getCompanyStats(companyId, {
      from: base.toISOString().slice(0, 10),
      to: base.toISOString().slice(0, 10),
    })
  }

  const { start, end } = buildDateRange(period, from, to)

  const companyWhere = { route: { companyId } }
  const periodWhere = { departureDate: { gte: start, lte: end } }

  const [
    revenue,
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalTrips,
    activeTrips,
    vehicles,
    payments,
    recentReservations,
    topRoutes,
    fillRateData,
  ] = await Promise.all([
    // Chiffre d'affaires de la période
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'CONFIRMED',
        paidAt: { gte: start, lte: end },
        reservation: { trip: companyWhere },
      },
    }),
    // Réservations totales (hors annulées)
    prisma.reservation.count({
      where: { trip: companyWhere },
    }),
    prisma.reservation.count({
      where: { status: 'CONFIRMED', trip: companyWhere },
    }),
    prisma.reservation.count({
      where: { status: 'CANCELLED', trip: companyWhere },
    }),
    prisma.trip.count({ where: { ...companyWhere, ...periodWhere } }),
    prisma.trip.count({ where: { ...companyWhere, ...periodWhere, status: 'SCHEDULED' } }),
    prisma.vehicle.count({ where: { companyId, isActive: true } }),
    // Tous les paiements de la période pour taux de succès
    prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        reservation: { trip: companyWhere },
      },
      select: { status: true },
    }),
    // Dernières réservations
    prisma.reservation.findMany({
      where: { trip: companyWhere },
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
    // Top 5 routes par nombre de réservations confirmées
    prisma.reservation.groupBy({
      by: ['tripId'],
      where: { status: 'CONFIRMED', trip: companyWhere },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    // Taux de remplissage : trips avec leurs places réservées vs capacité
    prisma.trip.findMany({
      where: { ...companyWhere, ...periodWhere },
      select: {
        availableSeats: true,
        vehicle: { select: { totalSeats: true } },
        _count: { select: { reservations: { where: { status: 'CONFIRMED' } } } },
      },
      take: 100,
    }),
  ])

  // Taux de succès paiement
  const totalPayments = payments.length
  const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED').length
  const paymentSuccessRate =
    totalPayments > 0 ? Math.round((confirmedPayments / totalPayments) * 100) : null

  // Taux d'annulation
  const cancellationRate =
    totalReservations > 0 ? Math.round((cancelledReservations / totalReservations) * 100) : 0

  // Taux de remplissage moyen
  let fillRate = null
  if (fillRateData.length > 0) {
    const rates = fillRateData.map((t) => {
      const total = t.vehicle?.totalSeats || 1
      const booked = t._count.reservations
      return booked / total
    })
    fillRate = Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100)
  }

  // Résoudre les noms de routes pour le top 5
  let topRoutesResolved = []
  if (topRoutes.length > 0) {
    const tripIds = topRoutes.map((r) => r.tripId)
    const tripsData = await prisma.trip.findMany({
      where: { id: { in: tripIds } },
      select: { id: true, route: { select: { origin: true, destination: true } } },
    })
    topRoutesResolved = topRoutes.map((r) => {
      const trip = tripsData.find((t) => t.id === r.tripId)
      return {
        label: trip ? `${trip.route.origin} → ${trip.route.destination}` : r.tripId,
        count: r._count.id,
      }
    })
  }

  return {
    period,
    dateRange: { start, end },
    revenue: revenue._sum.amount || 0,
    // Alias 'dailySales' pour rétrocompatibilité frontend existant
    dailySales: revenue._sum.amount || 0,
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalTrips,
    activeTrips,
    vehicles,
    alerts: 0,
    paymentSuccessRate,
    cancellationRate,
    fillRate,
    topRoutes: topRoutesResolved,
    recentReservations,
  }
}

async function getGlobalStats({ period = 'daily', from, to, date } = {}) {
  if (date && !from) {
    const base = new Date(date)
    return getGlobalStats({
      from: base.toISOString().slice(0, 10),
      to: base.toISOString().slice(0, 10),
    })
  }

  const { start, end } = buildDateRange(period, from, to)
  const periodWhere = { departureDate: { gte: start, lte: end } }

  const [
    revenue,
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalTrips,
    activeTrips,
    companies,
    payments,
    recentReservations,
    topRoutes,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'CONFIRMED', paidAt: { gte: start, lte: end } },
    }),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
    prisma.reservation.count({ where: { status: 'CANCELLED' } }),
    prisma.trip.count({ where: periodWhere }),
    prisma.trip.count({ where: { ...periodWhere, status: 'SCHEDULED' } }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { status: true },
    }),
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
    // Top routes globales
    prisma.reservation.groupBy({
      by: ['tripId'],
      where: { status: 'CONFIRMED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ])

  const totalPayments = payments.length
  const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED').length
  const paymentSuccessRate =
    totalPayments > 0 ? Math.round((confirmedPayments / totalPayments) * 100) : null
  const cancellationRate =
    totalReservations > 0 ? Math.round((cancelledReservations / totalReservations) * 100) : 0

  // Résoudre les noms de routes
  let topRoutesResolved = []
  if (topRoutes.length > 0) {
    const tripIds = topRoutes.map((r) => r.tripId)
    const tripsData = await prisma.trip.findMany({
      where: { id: { in: tripIds } },
      select: { id: true, route: { select: { origin: true, destination: true } } },
    })
    topRoutesResolved = topRoutes.map((r) => {
      const trip = tripsData.find((t) => t.id === r.tripId)
      return {
        label: trip ? `${trip.route.origin} → ${trip.route.destination}` : r.tripId,
        count: r._count.id,
      }
    })
  }

  return {
    period,
    dateRange: { start, end },
    revenue: revenue._sum.amount || 0,
    dailySales: revenue._sum.amount || 0,
    totalReservations,
    confirmedReservations,
    cancelledReservations,
    totalTrips,
    activeTrips,
    companies,
    alerts: 0,
    paymentSuccessRate,
    cancellationRate,
    topRoutes: topRoutesResolved,
    recentReservations,
  }
}

module.exports = { getCompanyStats, getGlobalStats }
