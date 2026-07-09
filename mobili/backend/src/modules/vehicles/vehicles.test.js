const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

let companyId, vehicleId, adminCompanyId

function makeToken(role, cId = null) {
  return jwt.sign({ id: adminCompanyId, role, companyId: cId }, process.env.JWT_SECRET || 'test')
}

beforeAll(async () => {
  const ts = Date.now()
  const co = await prisma.company.create({
    data: {
      name: `VehicleCo ${ts}`,
      contactEmail: `v${ts}@test.ml`,
      contactPhone: '+22300000003',
    },
  })
  companyId = co.id

  const hash = await bcrypt.hash('TestPass123', 10)
  const ac = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: 'AdminVehicle',
      email: `av.${ts}@test.ml`,
      phone: `+2239${ts.toString().slice(-7)}`,
      passwordHash: hash,
      role: 'ADMIN_COMPANY',
      companyId,
      isActive: true,
    },
  })
  adminCompanyId = ac.id
})

afterAll(async () => {
  if (vehicleId) {
    await prisma.seat.deleteMany({ where: { vehicleId } }).catch(() => {})
    await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {})
  }
  await prisma.user.delete({ where: { id: adminCompanyId } }).catch(() => {})
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {})
})

describe('POST /api/vehicles', () => {
  it('crée un véhicule avec ses sièges (ADMIN_COMPANY)', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ registrationNumber: `BA-V-${Date.now()}`, type: 'BUS', totalSeats: 10 })
    expect(res.status).toBe(201)
    vehicleId = res.body.data.id
    expect(res.body.data.seats).toHaveLength(10)
    expect(res.body.data.seats[0].seatNumber).toBe('01')
  })

  it('refuse sans auth (401)', async () => {
    const res = await request(app).post('/api/vehicles').send({ registrationNumber: 'X' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/vehicles/:id', () => {
  it('retourne le détail du véhicule avec ses sièges', async () => {
    if (!vehicleId) return
    const res = await request(app)
      .get(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(200)
    expect(res.body.data.seats).toBeDefined()
  })
})

describe('PUT /api/vehicles/:id', () => {
  it('met à jour un véhicule', async () => {
    if (!vehicleId) return
    const res = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ type: 'MINIBUS' })
    expect(res.status).toBe(200)
    expect(res.body.data.type).toBe('MINIBUS')
  })
})
