require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const prisma = require('../src/config/prisma')

const USERS = [
  {
    firstName: 'Mobili',
    lastName: 'Admin',
    email: 'admin@mobili.ml',
    phone: '+22370000001',
    password: process.env.SEED_ADMIN_PASSWORD,
    role: 'SUPER_ADMIN',
  },
  {
    firstName: 'Oumar',
    lastName: 'Traoré',
    email: 'oumar.traore@example.ml',
    phone: '+22376543210',
    password: process.env.SEED_USER_PASSWORD,
    role: 'VOYAGEUR',
  },
]

const COMPANY_ADMINS = [
  {
    firstName: 'Moussa',
    lastName: 'Diarra',
    email: 'admin@diarra-transport.ml',
    phone: '+22370000002',
    password: process.env.SEED_ADMIN_PASSWORD,
    companyName: 'Diarra Transport',
  },
  {
    firstName: 'Fatoumata',
    lastName: 'Koné',
    email: 'admin@tilemsi.ml',
    phone: '+22370000003',
    password: process.env.SEED_ADMIN_PASSWORD,
    companyName: 'Tilemsi Voyages',
  },
  {
    firstName: 'Ibrahim',
    lastName: 'Coulibaly',
    email: 'admin@sonef.ml',
    phone: '+22370000004',
    password: process.env.SEED_ADMIN_PASSWORD,
    companyName: 'Sonef Transport',
  },
  {
    firstName: 'Aminata',
    lastName: 'Traoré',
    email: 'admin@benso.ml',
    phone: '+22370000005',
    password: process.env.SEED_ADMIN_PASSWORD,
    companyName: 'Benso Express',
  },
]

const COMPANIES = [
  {
    name: 'Diarra Transport',
    contactEmail: 'contact@diarra-transport.ml',
    contactPhone: '+22320220001',
    routes: [
      { origin: 'Bamako', destination: 'Kayes', distance: 510, estimatedDuration: 360 },
      { origin: 'Kayes', destination: 'Bamako', distance: 510, estimatedDuration: 360 },
      { origin: 'Bamako', destination: 'Sikasso', distance: 350, estimatedDuration: 240 },
    ],
    vehicles: [
      { registrationNumber: 'BA-1001-DT', type: 'BUS', totalSeats: 50 },
      { registrationNumber: 'BA-1002-DT', type: 'BUS', totalSeats: 40 },
    ],
    trips: [
      { routeIndex: 0, vehicleIndex: 0, departureTime: '06:00', price: 6500 },
      { routeIndex: 0, vehicleIndex: 1, departureTime: '14:00', price: 6500 },
      { routeIndex: 1, vehicleIndex: 0, departureTime: '08:00', price: 6500 },
      { routeIndex: 2, vehicleIndex: 1, departureTime: '07:30', price: 4500 },
    ],
  },
  {
    name: 'Tilemsi Voyages',
    contactEmail: 'info@tilemsi.ml',
    contactPhone: '+22320220002',
    routes: [
      { origin: 'Bamako', destination: 'Mopti', distance: 640, estimatedDuration: 420 },
      { origin: 'Mopti', destination: 'Bamako', distance: 640, estimatedDuration: 420 },
      { origin: 'Bamako', destination: 'Tombouctou', distance: 1050, estimatedDuration: 720 },
    ],
    vehicles: [
      { registrationNumber: 'BA-2001-TL', type: 'BUS', totalSeats: 45 },
      { registrationNumber: 'BA-2002-TL', type: 'MINIBUS', totalSeats: 25 },
    ],
    trips: [
      { routeIndex: 0, vehicleIndex: 0, departureTime: '05:30', price: 7000 },
      { routeIndex: 0, vehicleIndex: 1, departureTime: '13:00', price: 6500 },
      { routeIndex: 1, vehicleIndex: 0, departureTime: '06:00', price: 7000 },
      { routeIndex: 2, vehicleIndex: 0, departureTime: '05:00', price: 15000 },
    ],
  },
  {
    name: 'Sonef Transport',
    contactEmail: 'sonef@transport.ml',
    contactPhone: '+22320220003',
    routes: [
      { origin: 'Bamako', destination: 'Gao', distance: 1200, estimatedDuration: 780 },
      { origin: 'Gao', destination: 'Bamako', distance: 1200, estimatedDuration: 780 },
      { origin: 'Bamako', destination: 'Sikasso', distance: 350, estimatedDuration: 240 },
      { origin: 'Sikasso', destination: 'Bamako', distance: 350, estimatedDuration: 240 },
    ],
    vehicles: [
      { registrationNumber: 'BA-3001-SN', type: 'BUS', totalSeats: 55 },
      { registrationNumber: 'BA-3002-SN', type: 'BUS', totalSeats: 45 },
    ],
    trips: [
      { routeIndex: 0, vehicleIndex: 0, departureTime: '05:00', price: 16000 },
      { routeIndex: 1, vehicleIndex: 1, departureTime: '06:00', price: 16000 },
      { routeIndex: 2, vehicleIndex: 0, departureTime: '08:00', price: 4000 },
      { routeIndex: 3, vehicleIndex: 1, departureTime: '15:00', price: 4000 },
    ],
  },
  {
    name: 'Benso Express',
    contactEmail: 'benso@express.ml',
    contactPhone: '+22320220004',
    routes: [
      { origin: 'Bamako', destination: 'Kayes', distance: 510, estimatedDuration: 330 },
      { origin: 'Kayes', destination: 'Bamako', distance: 510, estimatedDuration: 330 },
      { origin: 'Bamako', destination: 'Mopti', distance: 640, estimatedDuration: 400 },
    ],
    vehicles: [
      { registrationNumber: 'BA-4001-BX', type: 'BUS', totalSeats: 40 },
      { registrationNumber: 'BA-4002-BX', type: 'MINIBUS', totalSeats: 20 },
    ],
    trips: [
      { routeIndex: 0, vehicleIndex: 0, departureTime: '07:00', price: 6000 },
      { routeIndex: 1, vehicleIndex: 0, departureTime: '09:00', price: 6000 },
      { routeIndex: 2, vehicleIndex: 1, departureTime: '06:30', price: 6800 },
    ],
  },
]

function getDatesFromTodayToEndOfMonth() {
  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const dates = []
  const current = new Date(today)
  current.setHours(0, 0, 0, 0)
  while (current <= endOfMonth) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function generateSeats(vehicleId, totalSeats) {
  const seats = []
  for (let i = 1; i <= totalSeats; i++) {
    seats.push({
      vehicleId,
      seatNumber: String(i).padStart(2, '0'),
      type: i <= 4 ? 'VIP' : 'STANDARD',
      isAvailable: true,
    })
  }
  return seats
}

async function seedUsers() {
  console.log('\n👤 Utilisateurs...')
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      console.log(`  ⚠️  ${u.email} déjà existant — ignoré`)
      continue
    }
    const passwordHash = await bcrypt.hash(u.password, 12)
    await prisma.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: u.role,
      },
    })
    console.log(`  ✅ ${u.role} — ${u.email}`)
  }
}

async function seedCompanyAdmins(companyMap) {
  console.log('\n🏢 Gérants de compagnies...')
  for (const a of COMPANY_ADMINS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } })
    if (existing) {
      console.log(`  ⚠️  ${a.email} déjà existant — ignoré`)
      continue
    }
    const company = companyMap[a.companyName]
    if (!company) {
      console.log(`  ⚠️  Compagnie "${a.companyName}" introuvable — ignoré`)
      continue
    }
    const passwordHash = await bcrypt.hash(a.password, 12)
    await prisma.user.create({
      data: {
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        passwordHash,
        role: 'ADMIN_COMPANY',
        companyId: company.id,
      },
    })
    console.log(`  ✅ ADMIN_COMPANY ${a.firstName} ${a.lastName} — ${a.companyName}`)
  }
}

async function main() {
  console.log('🌱 Démarrage du seed...')
  await seedUsers()
  const dates = getDatesFromTodayToEndOfMonth()
  console.log(`📅 Création des trajets du ${dates[0].toLocaleDateString('fr-FR')} au ${dates[dates.length - 1].toLocaleDateString('fr-FR')} (${dates.length} jours)`)

  const companyMap = {}

  for (const companyData of COMPANIES) {
    console.log(`\n🚌 Compagnie : ${companyData.name}`)

    const existing = await prisma.company.findUnique({ where: { name: companyData.name } })
    if (existing) {
      companyMap[companyData.name] = existing
      console.log(`  ⚠️  Déjà existante — ignorée`)
      continue
    }

    const company = await prisma.company.create({
      data: { name: companyData.name, contactEmail: companyData.contactEmail, contactPhone: companyData.contactPhone },
    })
    companyMap[companyData.name] = company

    const routes = await Promise.all(
      companyData.routes.map((r) =>
        prisma.route.create({ data: { ...r, companyId: company.id, isActive: true } })
      )
    )

    const vehicles = []
    for (const v of companyData.vehicles) {
      const vehicle = await prisma.vehicle.create({
        data: { registrationNumber: v.registrationNumber, type: v.type, totalSeats: v.totalSeats, companyId: company.id, isActive: true },
      })
      await prisma.seat.createMany({ data: generateSeats(vehicle.id, v.totalSeats) })
      vehicles.push(vehicle)
      console.log(`  🚍 Véhicule ${v.registrationNumber} — ${v.totalSeats} sièges créés`)
    }

    let tripCount = 0
    for (const tripDef of companyData.trips) {
      const route = routes[tripDef.routeIndex]
      const vehicle = vehicles[tripDef.vehicleIndex]
      for (const date of dates) {
        await prisma.trip.create({
          data: {
            routeId: route.id,
            vehicleId: vehicle.id,
            departureDate: date,
            departureTime: tripDef.departureTime,
            price: tripDef.price,
            availableSeats: vehicle.totalSeats,
            status: 'SCHEDULED',
          },
        })
        tripCount++
      }
    }
    console.log(`  ✅ ${tripCount} trajets créés`)
  }

  await seedCompanyAdmins(companyMap)

  const totalTrips = await prisma.trip.count()
  console.log(`\n✅ Seed terminé — ${totalTrips} trajets en base`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
