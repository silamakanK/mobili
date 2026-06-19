const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')

const ts = Date.now()
let companyId, routeId, vehicleId, tripId, seatId, token, ticketId

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `TktCo ${ts}`, contactEmail: `tkt${ts}@test.ml`, contactPhone: '+22300000030' },
  })
  companyId = company.id

  const route = await prisma.route.create({
    data: {
      origin: 'Bamako',
      destination: 'Sikasso',
      distance: 350,
      estimatedDuration: 240,
      companyId,
    },
  })
  routeId = route.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-TKT-${ts}`, type: 'BUS', totalSeats: 10, companyId },
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
      departureDate: new Date('2027-05-20T00:00:00.000Z'),
      departureTime: '09:00',
      price: 4500,
      availableSeats: 10,
      status: 'SCHEDULED',
    },
  })
  tripId = trip.id

  const authRes = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: 'Mariam',
      lastName: 'Coulibaly',
      email: `mariam.${ts}@mobili.ml`,
      phone: `+223760${(ts + 2).toString().slice(-5)}`,
      password: 'SecurePass123',
    })
  token = authRes.body.data.token

  const resaRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({ tripId, seatId })
  const reservationCode = resaRes.body.data.reservationCode

  await request(app).post('/api/payments/initiate').set('Authorization', `Bearer ${token}`).send({
    reservationId: resaRes.body.data.id,
    method: 'WAVE',
  })

  await request(app)
    .post('/api/payments/webhook')
    .send({
      reservationCode,
      transactionId: `TXN-TKT-${ts}`,
      status: 'success',
    })

  const ticket = await prisma.ticket.findFirst({
    where: { reservation: { id: resaRes.body.data.id } },
  })
  ticketId = ticket.id
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

describe('GET /api/tickets/:id', () => {
  it("retourne le détail d'un billet", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.ticketCode).toMatch(/^TKT-/)
    expect(res.body.data.isUsed).toBe(false)
  })

  it('retourne 404 pour un id inexistant', async () => {
    const res = await request(app)
      .get('/api/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('retourne 401 sans token', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/tickets/:id/download', () => {
  it('retourne un PDF binaire', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/download`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.body).toBeInstanceOf(Buffer)
  })
})
