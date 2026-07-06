require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const prisma = require('../src/config/prisma')

// ── Vraies distances Mali (km / minutes) ──────────────────────────────────────
const ROUTES_MALI = [
  { origin: 'Bamako',    destination: 'Kayes',     distance: 597, estimatedDuration: 420 },
  { origin: 'Kayes',     destination: 'Bamako',    distance: 597, estimatedDuration: 420 },
  { origin: 'Bamako',    destination: 'Koulikoro', distance: 57,  estimatedDuration: 60  },
  { origin: 'Koulikoro', destination: 'Bamako',    distance: 57,  estimatedDuration: 60  },
  { origin: 'Bamako',    destination: 'Ségou',     distance: 235, estimatedDuration: 180 },
  { origin: 'Ségou',     destination: 'Bamako',    distance: 235, estimatedDuration: 180 },
  { origin: 'Bamako',    destination: 'Sikasso',   distance: 373, estimatedDuration: 270 },
  { origin: 'Sikasso',   destination: 'Bamako',    distance: 373, estimatedDuration: 270 },
  { origin: 'Bamako',    destination: 'Mopti',     distance: 640, estimatedDuration: 480 },
  { origin: 'Mopti',     destination: 'Bamako',    distance: 640, estimatedDuration: 480 },
]

const COMPANIES = [
  {
    name: 'Diarra Transport', contactEmail: 'contact@diarra-transport.ml', contactPhone: '+22320220001',
    admin: { firstName: 'Moussa', lastName: 'Diarra', email: 'admin@diarra-transport.ml', phone: '+22370000002' },
    routeKeys: ['Bamako→Kayes', 'Kayes→Bamako', 'Bamako→Ségou', 'Ségou→Bamako', 'Bamako→Koulikoro', 'Koulikoro→Bamako'],
    vehicles: [
      { reg: 'BA-1001-DT', type: 'BUS',     seats: 50 },
      { reg: 'BA-1002-DT', type: 'BUS',     seats: 45 },
      { reg: 'BA-1003-DT', type: 'BUS',     seats: 40 },
      { reg: 'BA-1004-DT', type: 'MINIBUS', seats: 25 },
      { reg: 'BA-1005-DT', type: 'VAN',     seats: 12 },
    ],
    trips: [
      { routeKey: 'Bamako→Kayes',     vehicleIdx: 0, times: ['06:00', '14:00'], prices: [6500, 6500] },
      { routeKey: 'Kayes→Bamako',     vehicleIdx: 1, times: ['07:00', '15:00'], prices: [6500, 6500] },
      { routeKey: 'Bamako→Ségou',     vehicleIdx: 2, times: ['07:30', '13:00'], prices: [3500, 3500] },
      { routeKey: 'Ségou→Bamako',     vehicleIdx: 3, times: ['08:00'],          prices: [3500]       },
      { routeKey: 'Bamako→Koulikoro', vehicleIdx: 4, times: ['09:00', '16:00'], prices: [1500, 1500] },
    ],
  },
  {
    name: 'Tilemsi Voyages', contactEmail: 'info@tilemsi.ml', contactPhone: '+22320220002',
    admin: { firstName: 'Fatoumata', lastName: 'Koné', email: 'admin@tilemsi.ml', phone: '+22370000003' },
    routeKeys: ['Bamako→Mopti', 'Mopti→Bamako', 'Bamako→Sikasso', 'Sikasso→Bamako', 'Bamako→Ségou', 'Ségou→Bamako'],
    vehicles: [
      { reg: 'BA-2001-TL', type: 'BUS',     seats: 50 },
      { reg: 'BA-2002-TL', type: 'BUS',     seats: 45 },
      { reg: 'BA-2003-TL', type: 'MINIBUS', seats: 25 },
      { reg: 'BA-2004-TL', type: 'MINIBUS', seats: 20 },
      { reg: 'BA-2005-TL', type: 'VAN',     seats: 12 },
    ],
    trips: [
      { routeKey: 'Bamako→Mopti',   vehicleIdx: 0, times: ['05:30', '12:00'], prices: [8000, 8000] },
      { routeKey: 'Mopti→Bamako',   vehicleIdx: 1, times: ['06:00'],          prices: [8000]       },
      { routeKey: 'Bamako→Sikasso', vehicleIdx: 2, times: ['07:00', '14:00'], prices: [5000, 5000] },
      { routeKey: 'Sikasso→Bamako', vehicleIdx: 3, times: ['08:00'],          prices: [5000]       },
      { routeKey: 'Bamako→Ségou',   vehicleIdx: 4, times: ['10:00'],          prices: [3200]       },
    ],
  },
  {
    name: 'Sonef Transport', contactEmail: 'sonef@transport.ml', contactPhone: '+22320220003',
    admin: { firstName: 'Ibrahim', lastName: 'Coulibaly', email: 'admin@sonef.ml', phone: '+22370000004' },
    routeKeys: ['Bamako→Kayes', 'Kayes→Bamako', 'Bamako→Mopti', 'Mopti→Bamako', 'Bamako→Koulikoro', 'Koulikoro→Bamako'],
    vehicles: [
      { reg: 'BA-3001-SN', type: 'BUS',     seats: 55 },
      { reg: 'BA-3002-SN', type: 'BUS',     seats: 50 },
      { reg: 'BA-3003-SN', type: 'BUS',     seats: 45 },
      { reg: 'BA-3004-SN', type: 'MINIBUS', seats: 25 },
      { reg: 'BA-3005-SN', type: 'VAN',     seats: 12 },
    ],
    trips: [
      { routeKey: 'Bamako→Kayes',     vehicleIdx: 0, times: ['05:00', '13:00'], prices: [6800, 6800] },
      { routeKey: 'Kayes→Bamako',     vehicleIdx: 1, times: ['06:00'],          prices: [6800]       },
      { routeKey: 'Bamako→Mopti',     vehicleIdx: 2, times: ['05:30', '11:00'], prices: [7500, 7500] },
      { routeKey: 'Mopti→Bamako',     vehicleIdx: 3, times: ['06:30'],          prices: [7500]       },
      { routeKey: 'Bamako→Koulikoro', vehicleIdx: 4, times: ['08:00', '17:00'], prices: [1500, 1500] },
    ],
  },
  {
    name: 'Benso Express', contactEmail: 'benso@express.ml', contactPhone: '+22320220004',
    admin: { firstName: 'Aminata', lastName: 'Traoré', email: 'admin@benso.ml', phone: '+22370000005' },
    routeKeys: ['Bamako→Sikasso', 'Sikasso→Bamako', 'Bamako→Ségou', 'Ségou→Bamako', 'Bamako→Kayes', 'Kayes→Bamako'],
    vehicles: [
      { reg: 'BA-4001-BX', type: 'BUS',     seats: 50 },
      { reg: 'BA-4002-BX', type: 'BUS',     seats: 40 },
      { reg: 'BA-4003-BX', type: 'MINIBUS', seats: 25 },
      { reg: 'BA-4004-BX', type: 'MINIBUS', seats: 20 },
      { reg: 'BA-4005-BX', type: 'VAN',     seats: 12 },
    ],
    trips: [
      { routeKey: 'Bamako→Sikasso', vehicleIdx: 0, times: ['07:00', '15:00'], prices: [4800, 4800] },
      { routeKey: 'Sikasso→Bamako', vehicleIdx: 1, times: ['08:00'],          prices: [4800]       },
      { routeKey: 'Bamako→Ségou',   vehicleIdx: 2, times: ['06:30', '12:30'], prices: [3800, 3800] },
      { routeKey: 'Ségou→Bamako',   vehicleIdx: 3, times: ['09:00'],          prices: [3800]       },
      { routeKey: 'Bamako→Kayes',   vehicleIdx: 4, times: ['06:00'],          prices: [6200]       },
    ],
  },
]

const VOYAGEURS = [
  { firstName: 'Aminata',   lastName: 'Coulibaly', email: 'aminata.coulibaly@gmail.com', phone: '+22376100001' },
  { firstName: 'Moussa',    lastName: 'Traoré',    email: 'moussa.traore@gmail.com',      phone: '+22376100002' },
  { firstName: 'Fatoumata', lastName: 'Diarra',    email: 'fatoumata.diarra@gmail.com',   phone: '+22376100003' },
  { firstName: 'Ibrahim',   lastName: 'Keïta',     email: 'ibrahim.keita@gmail.com',      phone: '+22376100004' },
  { firstName: 'Mariam',    lastName: 'Sanogo',    email: 'mariam.sanogo@gmail.com',      phone: '+22376100005' },
  { firstName: 'Seydou',    lastName: 'Ballo',     email: 'seydou.ballo@gmail.com',       phone: '+22376100006' },
  { firstName: 'Kadiatou',  lastName: 'Cissé',     email: 'kadiatou.cisse@gmail.com',     phone: '+22376100007' },
  { firstName: 'Abdoulaye', lastName: 'Touré',     email: 'abdoulaye.toure@gmail.com',    phone: '+22376100008' },
  { firstName: 'Rokiatou',  lastName: 'Camara',    email: 'rokiatou.camara@gmail.com',    phone: '+22376100009' },
  { firstName: 'Dramane',   lastName: 'Sissoko',   email: 'dramane.sissoko@gmail.com',    phone: '+22376100010' },
  { firstName: 'Aissata',   lastName: 'Dembélé',   email: 'aissata.dembele@gmail.com',    phone: '+22376100011' },
  { firstName: 'Cheick',    lastName: 'Diabaté',   email: 'cheick.diabate@gmail.com',     phone: '+22376100012' },
  { firstName: 'Oumar',     lastName: 'Traoré',    email: 'oumar.traore@example.ml',      phone: '+22376543210' },
  { firstName: 'Silamakan', lastName: 'Kamissoko',   email: 'silamakankamissoko@gmail.com', phone: '+22376543212' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickN(arr, n) {
  const copy = [...arr]; const result = []
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}
function generateCode() { return 'MOB-' + Math.random().toString(36).substring(2, 10).toUpperCase() }
function generateSeats(vehicleId, totalSeats) {
  return Array.from({ length: totalSeats }, (_, i) => ({
    vehicleId, seatNumber: String(i + 1).padStart(2, '0'), type: 'STANDARD', isAvailable: true,
  }))
}
function getDates(daysBack, daysAhead) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Array.from({ length: daysBack + daysAhead + 1 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - daysBack + i); return d
  })
}

// ── Reset ──────────────────────────────────────────────────────────────────────
async function resetDB() {
  console.log('\n🗑️  Nettoyage...')
  await prisma.ticketValidation.deleteMany({})
  await prisma.ticket.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.payment.deleteMany({})
  await prisma.reservation.deleteMany({})
  await prisma.seat.deleteMany({})
  await prisma.trip.deleteMany({})
  await prisma.vehicle.deleteMany({})
  await prisma.route.deleteMany({})
  await prisma.user.updateMany({ data: { companyId: null } })
  await prisma.company.deleteMany({})
  await prisma.user.deleteMany({})
  console.log('  ✅ Base vidée')
}

// ── Utilisateurs ───────────────────────────────────────────────────────────────
async function seedUsers(hash, pwd) {
  await prisma.user.create({
    data: {
      firstName: 'Mobili', lastName: 'Admin', email: 'admin@mobili.ml',
      phone: '+22370000001', passwordHash: await hash('admin'), role: 'SUPER_ADMIN',
    },
  })
  const voyageurs = []
  for (const v of VOYAGEURS) {
    const u = await prisma.user.create({ data: { ...v, passwordHash: await hash(pwd), role: 'VOYAGEUR' } })
    voyageurs.push(u)
  }
  console.log(`  ✅ 1 super admin + ${voyageurs.length} voyageurs`)
  return voyageurs
}

// ── Véhicules d'une compagnie ──────────────────────────────────────────────────
async function seedVehicles(companyData, companyId) {
  const vehicles = []
  for (const vDef of companyData.vehicles) {
    const vehicle = await prisma.vehicle.create({
      data: { registrationNumber: vDef.reg, type: vDef.type, totalSeats: vDef.seats, companyId, isActive: true },
    })
    await prisma.seat.createMany({ data: generateSeats(vehicle.id, vDef.seats) })
    vehicles.push(vehicle)
  }
  return vehicles
}

// ── Trajets d'une compagnie ────────────────────────────────────────────────────
async function seedTrips(companyData, companyRoutes, vehicles, dates, status) {
  const created = []
  for (const tripDef of companyData.trips) {
    const route = companyRoutes[tripDef.routeKey]
    if (!route) continue
    const vehicle = vehicles[tripDef.vehicleIdx]
    for (const date of dates) {
      for (let t = 0; t < tripDef.times.length; t++) {
        const trip = await prisma.trip.create({
          data: {
            routeId: route.id, vehicleId: vehicle.id,
            departureDate: date, departureTime: tripDef.times[t],
            price: tripDef.prices[t], availableSeats: vehicle.totalSeats, status,
          },
        })
        created.push({ trip, price: tripDef.prices[t] })
      }
    }
  }
  return created
}

// ── Réservations confirmées (historique) ──────────────────────────────────────
async function seedPastReservations(pastTrips, voyageurs, vehicleSeatsMap) {
  let count = 0
  for (const { trip, price } of pastTrips) {
    const tripSeats = vehicleSeatsMap[trip.vehicleId] || []
    if (tripSeats.length === 0) continue
    const selected = pickN(voyageurs, randInt(3, Math.min(8, tripSeats.length)))
    const paidAt = new Date(trip.departureDate)
    paidAt.setHours(randInt(18, 23), randInt(0, 59))
    for (let i = 0; i < selected.length; i++) {
      const user = selected[i]
      const seat = tripSeats[i % tripSeats.length]
      const code = generateCode()
      const reservation = await prisma.reservation.create({
        data: {
          userId: user.id, tripId: trip.id, seatId: seat.id,
          reservationCode: code, status: 'CONFIRMED', totalAmount: price,
        },
      })
      await prisma.payment.create({
        data: {
          reservationId: reservation.id, amount: price, method: 'CARD',
          status: 'CONFIRMED', paidAt,
          transactionId: `SIM-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        },
      })
      await prisma.ticket.create({
        data: {
          reservationId: reservation.id,
          ticketCode: code.replace('MOB-', 'TKT-'),
          qrCode: `${code}|${trip.id}|${user.id}`,
          isUsed: Math.random() > 0.2,
          issuedAt: paidAt,
        },
      })
      count++
    }
  }
  return count
}

// Pas de réservations PENDING dans le seed : elles appartiendraient à des
// comptes voyageur différents de celui connecté, ce qui rend le flux de
// paiement inaccessible depuis l'interface. Les voyageurs créent leurs
// propres réservations via le parcours de réservation normal.

// ── Compagnie complète ─────────────────────────────────────────────────────────
async function seedCompany(companyData, routeMap, voyageurs, pastDates, futureDates, hash, adminPwd) {
  console.log(`\n🚌 ${companyData.name}`)
  const company = await prisma.company.create({
    data: { name: companyData.name, contactEmail: companyData.contactEmail, contactPhone: companyData.contactPhone },
  })

  await prisma.user.create({
    data: {
      firstName: companyData.admin.firstName, lastName: companyData.admin.lastName,
      email: companyData.admin.email, phone: companyData.admin.phone,
      passwordHash: await hash(adminPwd), role: 'ADMIN_COMPANY', companyId: company.id,
    },
  })

  const companyRoutes = {}
  for (const key of companyData.routeKeys) {
    const def = routeMap[key]
    if (def) companyRoutes[key] = await prisma.route.create({ data: { ...def, companyId: company.id, isActive: true } })
  }

  const vehicles = await seedVehicles(companyData, company.id)
  const totalSeats = vehicles.reduce((s, v) => s + v.totalSeats, 0)
  console.log(`  🚍 ${vehicles.length} véhicules (${totalSeats} places) · ${Object.keys(companyRoutes).length} lignes`)

  // Charger les sièges de chaque véhicule pour les réservations
  const vehicleSeatsMap = {}
  for (const v of vehicles) {
    vehicleSeatsMap[v.id] = await prisma.seat.findMany({ where: { vehicleId: v.id }, orderBy: { seatNumber: 'asc' } })
  }

  const pastTrips = await seedTrips(companyData, companyRoutes, vehicles, pastDates, 'COMPLETED')
  const futureTrips = await seedTrips(companyData, companyRoutes, vehicles, futureDates, 'SCHEDULED')
  console.log(`  📅 ${pastTrips.length + futureTrips.length} trajets`)

  const confirmed = await seedPastReservations(pastTrips, voyageurs, vehicleSeatsMap)
  console.log(`  🎫 ${confirmed} réservations confirmées`)
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seed riche — Mobili')
  await resetDB()

  const userPwd = process.env.SEED_USER_PASSWORD || 'Voyageur1234!'
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!'
  const hash = (p) => bcrypt.hash(p, 12)

  console.log('\n👥 Utilisateurs...')
  const voyageurs = await seedUsers(hash, userPwd)

  const routeMap = Object.fromEntries(ROUTES_MALI.map((r) => [`${r.origin}→${r.destination}`, r]))
  const allDates = getDates(30, 30)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const pastDates = allDates.filter((d) => d < today)
  const futureDates = allDates.filter((d) => d >= today)

  console.log(`\n📅 ${pastDates.length} jours passés + ${futureDates.length} à venir`)

  for (const company of COMPANIES) {
    await seedCompany(company, routeMap, voyageurs, pastDates, futureDates, hash, adminPwd)
  }

  const [trips, reservations, users] = await Promise.all([
    prisma.trip.count(), prisma.reservation.count(), prisma.user.count(),
  ])
  console.log(`\n✅ Seed terminé — ${users} utilisateurs · ${trips} trajets · ${reservations} réservations`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
