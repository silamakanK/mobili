const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')

const ts = Date.now()
let companyId, routeId, vehicleId, tripId, seatId, agentToken, qrCode

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `ValCo ${ts}`, contactEmail: `val${ts}@test.ml`, contactPhone: '+22300000040' },
  })
  companyId = company.id

  const route = await prisma.route.create({
    data: {
      origin: 'Bamako',
      destination: 'Gao',
      distance: 1200,
      estimatedDuration: 720,
      companyId,
    },
  })
  routeId = route.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-VAL-${ts}`, type: 'BUS', totalSeats: 10, companyId },
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
      departureDate: new Date('2027-06-01T00:00:00.000Z'),
      departureTime: '05:00',
      price: 15000,
      availableSeats: 10,
      status: 'SCHEDULED',
    },
  })
  tripId = trip.id

  const voyageurRes = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: 'Ibrahim',
      lastName: 'Touré',
      email: `ibrahim.${ts}@mobili.ml`,
      phone: `+223760${(ts + 4).toString().slice(-5)}`,
      password: 'SecurePass123',
    })
  const voyageurToken = voyageurRes.body.data.token

  const resaRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${voyageurToken}`)
    .send({ tripId, seatId })
  const { reservationCode, id: reservationId } = resaRes.body.data

  await request(app)
    .post('/api/payments/initiate')
    .set('Authorization', `Bearer ${voyageurToken}`)
    .send({ reservationId, method: 'MOOV_MONEY' })

  await request(app)
    .post('/api/payments/webhook')
    .send({
      reservationCode,
      transactionId: `TXN-VAL-${ts}`,
      status: 'success',
    })

  const ticket = await prisma.ticket.findFirst({ where: { reservation: { id: reservationId } } })
  qrCode = ticket.qrCode

  const agent = await prisma.user.create({
    data: {
      firstName: 'Agent',
      lastName: 'Validation',
      email: `agent.val.${ts}@mobili.ml`,
      phone: `+223760${(ts + 5).toString().slice(-5)}`,
      passwordHash: require('bcryptjs').hashSync('AgentPass123', 10),
      role: 'AGENT',
      companyId,
    },
  })
  const agentLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: agent.email, password: 'AgentPass123' })
  agentToken = agentLogin.body.data.token
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

describe('POST /api/tickets/validate', () => {
  it('valide un billet avec un QR code valide', async () => {
    const res = await request(app)
      .post('/api/tickets/validate')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ qrCode })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('VALID')
    expect(res.body.data.ticket.ticketCode).toMatch(/^TKT-/)
  })

  it('retourne ALREADY_USED au second scan', async () => {
    const res = await request(app)
      .post('/api/tickets/validate')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ qrCode })
    expect(res.status).toBe(422)
    expect(res.body.data.status).toBe('ALREADY_USED')
  })

  it('retourne NOT_FOUND pour un QR code inconnu', async () => {
    const res = await request(app)
      .post('/api/tickets/validate')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ qrCode: 'QR-XXXXXXXXXXXXXX00' })
    expect(res.status).toBe(422)
    expect(res.body.data.status).toBe('NOT_FOUND')
  })

  it('rejette un voyageur avec 403', async () => {
    const authRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Voyageur',
        lastName: 'Test',
        email: `voyageur.val.${ts}@mobili.ml`,
        phone: `+223760${(ts + 6).toString().slice(-5)}`,
        password: 'SecurePass123',
      })
    const res = await request(app)
      .post('/api/tickets/validate')
      .set('Authorization', `Bearer ${authRes.body.data.token}`)
      .send({ qrCode })
    expect(res.status).toBe(403)
  })

  it('rejette sans token avec 401', async () => {
    const res = await request(app).post('/api/tickets/validate').send({ qrCode })
    expect(res.status).toBe(401)
  })
})
