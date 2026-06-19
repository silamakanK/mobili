const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')

const ts = Date.now()
let companyId, routeId, vehicleId, tripId, seatId, token, reservationId

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `ResaCo ${ts}`, contactEmail: `resa${ts}@test.ml`, contactPhone: '+22300000010' },
  })
  companyId = company.id

  const route = await prisma.route.create({
    data: {
      origin: 'Bamako',
      destination: 'Mopti',
      distance: 640,
      estimatedDuration: 420,
      companyId,
    },
  })
  routeId = route.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-RSV-${ts}`, type: 'BUS', totalSeats: 10, companyId },
  })
  vehicleId = vehicle.id

  const seat = await prisma.seat.create({
    data: { vehicleId, seatNumber: '01', type: 'STANDARD', isAvailable: true },
  })
  seatId = seat.id

  const trip = await prisma.trip.create({
    data: {
      routeId,
      vehicleId,
      departureDate: new Date('2027-03-15T00:00:00.000Z'),
      departureTime: '07:00',
      price: 7000,
      availableSeats: 10,
      status: 'SCHEDULED',
    },
  })
  tripId = trip.id

  const res = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: 'Adama',
      lastName: 'Koné',
      email: `adama.${ts}@mobili.ml`,
      phone: `+223760${ts.toString().slice(-5)}`,
      password: 'SecurePass123',
    })
  token = res.body.data.token
})

afterAll(async () => {
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: String(ts) } },
    select: { id: true },
  })
  const testUserIds = testUsers.map((u) => u.id)
  await prisma.ticketValidation.deleteMany({
    where: { ticket: { reservation: { userId: { in: testUserIds } } } },
  })
  await prisma.ticket.deleteMany({ where: { reservation: { userId: { in: testUserIds } } } })
  await prisma.payment.deleteMany({ where: { reservation: { userId: { in: testUserIds } } } })
  await prisma.reservation.deleteMany({ where: { userId: { in: testUserIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: testUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
  await prisma.trip.deleteMany({ where: { routeId } })
  await prisma.seat.deleteMany({ where: { vehicleId } })
  await prisma.vehicle.delete({ where: { id: vehicleId } })
  await prisma.route.delete({ where: { id: routeId } })
  await prisma.company.delete({ where: { id: companyId } })
})

describe('POST /api/reservations', () => {
  it('crée une réservation pour un voyageur authentifié', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ tripId, seatId })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reservationCode).toMatch(/^MOB-/)
    expect(res.body.data.status).toBe('PENDING')
    reservationId = res.body.data.id
  })

  it('rejette une double réservation sur le même siège avec 409', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ tripId, seatId })
    expect(res.status).toBe(409)
  })

  it('rejette sans token avec 401', async () => {
    const res = await request(app).post('/api/reservations').send({ tripId, seatId })
    expect(res.status).toBe(401)
  })

  it('rejette un payload invalide avec 400', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ tripId: 'pas-un-uuid' })
    expect(res.status).toBe(400)
  })

  it('retourne 404 pour un trajet inexistant', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ tripId: '00000000-0000-0000-0000-000000000000', seatId })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/reservations/me', () => {
  it("retourne les réservations de l'utilisateur connecté", async () => {
    const res = await request(app)
      .get('/api/reservations/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/reservations/me')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/reservations/:id', () => {
  it("retourne le détail d'une réservation", async () => {
    const res = await request(app)
      .get(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(reservationId)
  })

  it('retourne 404 pour un id inexistant', async () => {
    const res = await request(app)
      .get('/api/reservations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
