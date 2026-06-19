const request = require('supertest')
const app = require('../../app')
const prisma = require('../../config/prisma')

const TEST_USER = {
  firstName: 'Moussa',
  lastName: 'Diallo',
  email: `test.auth.${Date.now()}@mobili.ml`,
  phone: '+22376000001',
  password: 'SecurePass123',
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'test.auth.' } } })
})

describe('POST /api/auth/register', () => {
  it('crée un compte et retourne un token', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.passwordHash).toBeUndefined()
    expect(res.body.data.user.role).toBe('VOYAGEUR')
  })

  it('rejette un email déjà utilisé avec 409', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER)
    expect(res.status).toBe(409)
  })

  it('rejette un payload invalide avec 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'pasunemail', password: 'court' })
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })
})

describe('POST /api/auth/login', () => {
  it('retourne un token avec des credentials valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe(TEST_USER.email)
  })

  it('retourne 401 avec un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'mauvais' })
    expect(res.status).toBe(401)
  })

  it('retourne 401 avec un email inconnu', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@mobili.ml', password: 'n importe' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('retourne success', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
