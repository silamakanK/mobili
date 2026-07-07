const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

let companyId, routeId, adminCompanyId

function makeToken(role, cId = null) {
  return jwt.sign({ id: adminCompanyId, role, companyId: cId }, process.env.JWT_SECRET || 'test')
}

beforeAll(async () => {
  const ts = Date.now()
  const co = await prisma.company.create({
    data: {
      name: `RouteCo ${ts}`,
      contactEmail: `r${ts}@test.ml`,
      contactPhone: '+22300000002',
    },
  })
  companyId = co.id

  const hash = await bcrypt.hash('TestPass123', 10)
  const ac = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: 'AdminRoute',
      email: `ar.${ts}@test.ml`,
      phone: `+2231${ts.toString().slice(-7)}`,
      passwordHash: hash,
      role: 'ADMIN_COMPANY',
      companyId,
      isActive: true,
    },
  })
  adminCompanyId = ac.id
})

afterAll(async () => {
  await prisma.route.deleteMany({ where: { companyId } }).catch(() => {})
  await prisma.user.delete({ where: { id: adminCompanyId } }).catch(() => {})
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {})
})

describe('POST /api/routes', () => {
  it('crée une ligne (ADMIN_COMPANY)', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ origin: 'Bamako', destination: 'Kayes', distance: 600, estimatedDuration: 360 })
    expect(res.status).toBe(201)
    routeId = res.body.data.id
    expect(res.body.data.companyId).toBe(companyId)
  })

  it('refuse sans auth (401)', async () => {
    const res = await request(app).post('/api/routes').send({ origin: 'A', destination: 'B' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/routes', () => {
  it('liste les lignes de sa compagnie', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.routes)).toBe(true)
  })
})

describe('PUT /api/routes/:id', () => {
  it('met à jour une ligne', async () => {
    if (!routeId) return
    const res = await request(app)
      .put(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ distance: 610 })
    expect(res.status).toBe(200)
    expect(res.body.data.distance).toBe(610)
  })
})

describe('DELETE /api/routes/:id', () => {
  it('désactive une ligne', async () => {
    if (!routeId) return
    const res = await request(app)
      .delete(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(200)
  })
})
