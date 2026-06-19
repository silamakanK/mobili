const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')

function makeToken(role, companyId = null) {
  return jwt.sign({ id: 'test-user-id', role, companyId }, process.env.JWT_SECRET || 'test')
}

let companyId

afterAll(async () => {
  if (companyId) await prisma.company.delete({ where: { id: companyId } }).catch(() => {})
})

describe('GET /api/companies', () => {
  it('liste les compagnies sans auth', async () => {
    const res = await request(app).get('/api/companies')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.companies)).toBe(true)
  })
})

describe('POST /api/companies', () => {
  it('crée une compagnie (SUPER_ADMIN)', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${makeToken('SUPER_ADMIN')}`)
      .send({
        name: `TestCo ${Date.now()}`,
        contactEmail: 'co@test.ml',
        contactPhone: '+22300000099',
      })
    expect(res.status).toBe(201)
    companyId = res.body.data.id
    expect(companyId).toBeDefined()
  })

  it('refuse sans auth (401)', async () => {
    const res = await request(app)
      .post('/api/companies')
      .send({ name: 'X', contactEmail: 'x@x.ml', contactPhone: '+22300000000' })
    expect(res.status).toBe(401)
  })

  it('refuse pour ADMIN_COMPANY (403)', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY')}`)
      .send({ name: 'X', contactEmail: 'x@x.ml', contactPhone: '+22300000000' })
    expect(res.status).toBe(403)
  })

  it('retourne 400 si payload invalide', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${makeToken('SUPER_ADMIN')}`)
      .send({ name: 'X' })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/companies/:id', () => {
  it('met à jour une compagnie (SUPER_ADMIN)', async () => {
    if (!companyId) return
    const res = await request(app)
      .put(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${makeToken('SUPER_ADMIN')}`)
      .send({ contactPhone: '+22300000098' })
    expect(res.status).toBe(200)
    expect(res.body.data.contactPhone).toBe('+22300000098')
  })
})
