const prisma = require('../../config/prisma')

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

async function createRecurringTrip(adminUser, data) {
  const { routeId, vehicleId, dayOfWeek, departureTime, price, validFrom, validUntil } = data

  const route = await prisma.route.findUnique({ where: { id: routeId } })
  if (!route) {
    const e = new Error('Ligne introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && route.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) {
    const e = new Error('Véhicule introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && vehicle.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  return prisma.recurringTrip.create({
    data: {
      routeId,
      vehicleId,
      dayOfWeek,
      departureTime,
      price,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
    },
    include: {
      route: { select: { origin: true, destination: true } },
      vehicle: { select: { registrationNumber: true, type: true } },
    },
  })
}

async function listRecurringTrips(companyId) {
  return prisma.recurringTrip.findMany({
    where: { route: { companyId } },
    include: {
      route: { select: { origin: true, destination: true } },
      vehicle: { select: { registrationNumber: true, type: true, totalSeats: true } },
      _count: { select: { trips: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { departureTime: 'asc' }],
  })
}

async function updateRecurringTrip(id, adminUser, data) {
  const rt = await prisma.recurringTrip.findUnique({
    where: { id },
    include: { route: { select: { companyId: true } } },
  })
  if (!rt) {
    const e = new Error('Modèle introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && rt.route.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }
  const updateData = { ...data }
  if (data.validFrom) updateData.validFrom = new Date(data.validFrom)
  if (data.validUntil) updateData.validUntil = new Date(data.validUntil)
  return prisma.recurringTrip.update({ where: { id }, data: updateData })
}

async function deleteRecurringTrip(id, adminUser) {
  const rt = await prisma.recurringTrip.findUnique({
    where: { id },
    include: { route: { select: { companyId: true } } },
  })
  if (!rt) {
    const e = new Error('Modèle introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && rt.route.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }
  return prisma.recurringTrip.update({ where: { id }, data: { isActive: false } })
}

// Génère les trajets manquants pour les N prochaines semaines
async function generateTrips(id, adminUser, { weeks = 4 } = {}) {
  const rt = await prisma.recurringTrip.findUnique({
    where: { id },
    include: {
      route: { select: { companyId: true } },
      vehicle: { select: { totalSeats: true } },
    },
  })
  if (!rt) {
    const e = new Error('Modèle introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && rt.route.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }
  if (!rt.isActive) {
    const e = new Error('Ce modèle est désactivé.')
    e.status = 400
    throw e
  }

  // Construire la liste des dates cibles (dayOfWeek dans les N prochaines semaines)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = rt.validUntil
    ? new Date(rt.validUntil)
    : new Date(today.getTime() + weeks * 7 * 86400000)

  const targetDates = []
  const DAY_MS = 86400000
  for (let ms = today.getTime(); ms <= limit.getTime(); ms += DAY_MS) {
    const d = new Date(ms)
    if (d.getDay() === rt.dayOfWeek) {
      targetDates.push(d.toISOString().slice(0, 10))
    }
  }

  // Vérifier quelles dates ont déjà un trajet issu de ce modèle
  const existing = await prisma.trip.findMany({
    where: {
      recurringTripId: id,
      departureDate: {
        gte: today,
        lte: limit,
      },
    },
    select: { departureDate: true },
  })
  const existingDates = new Set(existing.map((t) => t.departureDate.toISOString().slice(0, 10)))

  const toCreate = targetDates.filter((d) => !existingDates.has(d))

  const created = await Promise.all(
    toCreate.map((dateStr) =>
      prisma.trip.create({
        data: {
          routeId: rt.routeId,
          vehicleId: rt.vehicleId,
          recurringTripId: id,
          departureDate: new Date(`${dateStr}T00:00:00.000Z`),
          departureTime: rt.departureTime,
          price: rt.price,
          availableSeats: rt.vehicle.totalSeats,
          status: 'SCHEDULED',
        },
      })
    )
  )

  return {
    generated: created.length,
    skipped: existingDates.size,
    dates: toCreate,
  }
}

// Remplacer le bus d'un trajet généré par un autre véhicule
async function replaceVehicle(tripId, adminUser, newVehicleId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: { select: { companyId: true } },
      vehicle: { select: { totalSeats: true } },
      _count: { select: { reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } },
    },
  })
  if (!trip) {
    const e = new Error('Trajet introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && trip.route.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  const newVehicle = await prisma.vehicle.findUnique({ where: { id: newVehicleId } })
  if (!newVehicle) {
    const e = new Error('Nouveau véhicule introuvable.')
    e.status = 404
    throw e
  }
  if (adminUser.role !== 'SUPER_ADMIN' && newVehicle.companyId !== adminUser.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  const confirmedSeats = trip._count.reservations
  if (newVehicle.totalSeats < confirmedSeats) {
    const e = new Error(
      `Le nouveau véhicule (${newVehicle.totalSeats} places) n'a pas assez de places pour les ${confirmedSeats} réservations existantes.`
    )
    e.status = 400
    throw e
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      vehicleId: newVehicleId,
      availableSeats: newVehicle.totalSeats - confirmedSeats,
    },
    include: {
      vehicle: { select: { registrationNumber: true, type: true, totalSeats: true } },
    },
  })
}

module.exports = {
  createRecurringTrip,
  listRecurringTrips,
  updateRecurringTrip,
  deleteRecurringTrip,
  generateTrips,
  replaceVehicle,
  DAYS_FR,
}
