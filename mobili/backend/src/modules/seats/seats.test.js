const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

let companyId, vehicleId, seatId, adminCompanyId, otherAdminId, otherCompanyId

function makeToken(role, cId = null) {
  const id = cId && cId !== companyId ? otherAdminId : adminCompanyId
  return jwt.sign({ id, role, companyId: cId }, process.env.JWT_SECRET || 'test')
}

beforeAll(async () => {
  const ts = Date.now()
  const hash = await bcrypt.hash('TestPass123', 10)

  const co = await prisma.company.create({
    data: { name: `SeatCo ${ts}`, contactEmail: `s${ts}@test.ml`, contactPhone: '+22300000004' },
  })
  companyId = co.id

  const otherCo = await prisma.company.create({
    data: {
      name: `OtherSeatCo ${ts}`,
      contactEmail: `os${ts}@test.ml`,
      contactPhone: '+22300000044',
    },
  })
  otherCompanyId = otherCo.id

  const [ac, oa] = await Promise.all([
    prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'AdminSeat',
        email: `as.${ts}@test.ml`,
        phone: `+2230${ts.toString().slice(-7)}`,
        passwordHash: hash,
        role: 'ADMIN_COMPANY',
        companyId,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        firstName: 'Other',
        lastName: 'AdminSeat',
        email: `oas.${ts}@test.ml`,
        phone: `+2241${ts.toString().slice(-7)}`,
        passwordHash: hash,
        role: 'ADMIN_COMPANY',
        companyId: otherCompanyId,
        isActive: true,
      },
    }),
  ])
  adminCompanyId = ac.id
  otherAdminId = oa.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-S-${ts}`, type: 'BUS', totalSeats: 5, companyId },
  })
  vehicleId = vehicle.id
  const seat = await prisma.seat.create({ data: { vehicleId, seatNumber: '01', type: 'STANDARD' } })
  seatId = seat.id
})

afterAll(async () => {
  await prisma.seat.deleteMany({ where: { vehicleId } }).catch(() => {})
  await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {})
  await prisma.user
    .deleteMany({ where: { id: { in: [adminCompanyId, otherAdminId].filter(Boolean) } } })
    .catch(() => {})
  await prisma.company
    .deleteMany({ where: { id: { in: [companyId, otherCompanyId].filter(Boolean) } } })
    .catch(() => {})
})

describe('GET /api/seats', () => {
  it("liste les sièges d'un véhicule", async () => {
    const res = await request(app)
      .get('/api/seats')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .query({ vehicleId })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('retourne 400 sans vehicleId', async () => {
    const res = await request(app)
      .get('/api/seats')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/seats/:id', () => {
  it('met à jour un siège', async () => {
    const res = await request(app)
      .put(`/api/seats/${seatId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ type: 'VIP', isAvailable: false })
    expect(res.status).toBe(200)
    expect(res.body.data.type).toBe('VIP')
  })

  it('refuse pour une autre compagnie (403)', async () => {
    const res = await request(app)
      .put(`/api/seats/${seatId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', 'autre-company-id')}`)
      .send({ type: 'STANDARD' })
    expect(res.status).toBe(403)
  })
})
