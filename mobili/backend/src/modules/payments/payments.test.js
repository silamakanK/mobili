const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')

const ts = Date.now()
let companyId, routeId, vehicleId, tripId, seatId, token, reservationId, reservationCode, paymentId

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `PayCo ${ts}`, contactEmail: `pay${ts}@test.ml`, contactPhone: '+22300000020' },
  })
  companyId = company.id

  const route = await prisma.route.create({
    data: {
      origin: 'Bamako',
      destination: 'Kayes',
      distance: 510,
      estimatedDuration: 360,
      companyId,
    },
  })
  routeId = route.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-PAY-${ts}`, type: 'BUS', totalSeats: 10, companyId },
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
      departureDate: new Date('2027-04-10T00:00:00.000Z'),
      departureTime: '06:00',
      price: 6000,
      availableSeats: 10,
      status: 'SCHEDULED',
    },
  })
  tripId = trip.id

  const authRes = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: 'Fatou',
      lastName: 'Diarra',
      email: `fatou.${ts}@mobili.ml`,
      phone: `+223760${(ts + 1).toString().slice(-5)}`,
      password: 'SecurePass123',
    })
  token = authRes.body.data.token

  const resaRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({ tripId, seatId })
  reservationId = resaRes.body.data.id
  reservationCode = resaRes.body.data.reservationCode
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

describe('POST /api/payments/initiate', () => {
  it('initie un paiement pour une réservation PENDING', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId, method: 'ORANGE_MONEY' })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('PENDING')
    expect(res.body.data.amount).toBe(6000)
    paymentId = res.body.data.paymentId
  })

  it('retourne le même paiement si déjà PENDING (idempotent)', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId, method: 'ORANGE_MONEY' })
    expect(res.status).toBe(201)
    expect(res.body.data.paymentId).toBe(paymentId)
  })

  it('rejette sans token avec 401', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .send({ reservationId, method: 'WAVE' })
    expect(res.status).toBe(401)
  })

  it('rejette un payload invalide avec 400', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId, method: 'BITCOIN' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/payments/webhook', () => {
  it('confirme un paiement via webhook et génère un billet', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({
        reservationCode,
        transactionId: `TXN-${ts}`,
        status: 'success',
      })
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('Paiement confirmé.')

    const ticket = await prisma.ticket.findFirst({ where: { reservation: { id: reservationId } } })
    expect(ticket).not.toBeNull()
    expect(ticket.ticketCode).toMatch(/^TKT-/)
  })

  it('est idempotent si le paiement est déjà confirmé', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({
        reservationCode,
        transactionId: `TXN-${ts}`,
        status: 'success',
      })
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('Paiement déjà confirmé.')
  })
})

describe('GET /api/payments/:id/status', () => {
  it('retourne le statut du paiement', async () => {
    const res = await request(app)
      .get(`/api/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CONFIRMED')
  })
})
