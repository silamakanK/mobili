const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')

function makeToken(role, companyId = null) {
  return jwt.sign({ id: 'test-user-id', role, companyId }, process.env.JWT_SECRET || 'test')
}

let companyId, vehicleId, seatId

beforeAll(async () => {
  const co = await prisma.company.create({
    data: {
      name: `SeatCo ${Date.now()}`,
      contactEmail: `s${Date.now()}@test.ml`,
      contactPhone: '+22300000004',
    },
  })
  companyId = co.id
  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-S-${Date.now()}`, type: 'BUS', totalSeats: 5, companyId },
  })
  vehicleId = vehicle.id
  const seat = await prisma.seat.create({
    data: { vehicleId, seatNumber: '01', type: 'STANDARD' },
  })
  seatId = seat.id
})

afterAll(async () => {
  await prisma.seat.deleteMany({ where: { vehicleId } }).catch(() => {})
  await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {})
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {})
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
