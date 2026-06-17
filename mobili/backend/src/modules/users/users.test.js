const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')
const jwt = require('jsonwebtoken')

function makeToken(role, companyId = null) {
  return jwt.sign({ id: 'test-user-id', role, companyId }, process.env.JWT_SECRET || 'test')
}

let companyId, agentId

beforeAll(async () => {
  const co = await prisma.company.create({
    data: {
      name: `UserCo ${Date.now()}`,
      contactEmail: `u${Date.now()}@test.ml`,
      contactPhone: '+22300000005',
    },
  })
  companyId = co.id
})

afterAll(async () => {
  if (agentId) await prisma.user.delete({ where: { id: agentId } }).catch(() => {})
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {})
})

describe('POST /api/users/agents', () => {
  it('crée un agent (ADMIN_COMPANY)', async () => {
    const res = await request(app)
      .post('/api/users/agents')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({
        firstName: 'Seydou',
        lastName: 'Koné',
        email: `agent.${Date.now()}@test.ml`,
        phone: `+2237${Date.now().toString().slice(-7)}`,
        password: 'AgentPass123',
      })
    expect(res.status).toBe(201)
    agentId = res.body.data.id
    expect(res.body.data.role).toBe('AGENT')
    expect(res.body.data.companyId).toBe(companyId)
  })

  it('refuse sans auth (401)', async () => {
    const res = await request(app).post('/api/users/agents').send({})
    expect(res.status).toBe(401)
  })

  it('retourne 400 si payload invalide', async () => {
    const res = await request(app)
      .post('/api/users/agents')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ firstName: 'X', email: 'pasunemail' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/users', () => {
  it('liste les utilisateurs de la compagnie', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.users)).toBe(true)
    const ids = res.body.data.users.map((u) => u.companyId)
    ids.forEach((id) => expect(id).toBe(companyId))
  })
})

describe('PUT /api/users/:id', () => {
  it('désactive un agent', async () => {
    if (!agentId) return
    const res = await request(app)
      .put(`/api/users/${agentId}`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
      .send({ isActive: false })
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)
  })
})
