const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const prisma = require('../../config/prisma')

function makeToken(role, companyId = null) {
  return jwt.sign({ id: 'test-user-id', role, companyId }, process.env.JWT_SECRET || 'test')
}

let companyId, routeId, vehicleId, tripId

beforeAll(async () => {
  const company = await prisma.company.create({
    data: {
      name: `Test Co ${Date.now()}`,
      contactEmail: `co${Date.now()}@test.ml`,
      contactPhone: '+22300000001',
    },
  })
  companyId = company.id

  const route = await prisma.route.create({
    data: {
      origin: 'Bamako',
      destination: 'Ségou',
      distance: 240,
      estimatedDuration: 180,
      companyId,
    },
  })
  routeId = route.id

  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `BA-TEST-${Date.now()}`, type: 'BUS', totalSeats: 50, companyId },
  })
  vehicleId = vehicle.id

  const trip = await prisma.trip.create({
    data: {
      routeId,
      vehicleId,
      departureDate: new Date('2026-12-01T00:00:00.000Z'),
      departureTime: '08:00',
      price: 5000,
      availableSeats: 40,
      status: 'SCHEDULED',
    },
  })
  tripId = trip.id
})

afterAll(async () => {
  await prisma.trip.deleteMany({ where: { routeId } })
  await prisma.vehicle.deleteMany({ where: { companyId } })
  await prisma.route.deleteMany({ where: { companyId } })
  await prisma.company.delete({ where: { id: companyId } })
})

describe('GET /api/trips', () => {
  it('retourne les trajets pour from/to/date valides', async () => {
    const res = await request(app)
      .get('/api/trips')
      .query({ from: 'Bamako', to: 'Ségou', date: '2026-12-01' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0]).toHaveProperty('company')
    expect(res.body.data[0]).toHaveProperty('route')
  })

  it('retourne un tableau vide si aucun trajet', async () => {
    const res = await request(app)
      .get('/api/trips')
      .query({ from: 'Gao', to: 'Tombouctou', date: '2026-12-01' })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('retourne 400 si la date est manquante', async () => {
    const res = await request(app).get('/api/trips').query({ from: 'Bamako', to: 'Ségou' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/trips/:id', () => {
  it("retourne le détail d'un trajet existant", async () => {
    const res = await request(app).get(`/api/trips/${tripId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(tripId)
    expect(res.body.data.vehicle).toHaveProperty('seats')
  })

  it('retourne 404 pour un id inexistant', async () => {
    const res = await request(app).get('/api/trips/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/trips/:id/passengers', () => {
  it('retourne la liste des passagers (ADMIN_COMPANY)', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/passengers`)
      .set('Authorization', `Bearer ${makeToken('ADMIN_COMPANY', companyId)}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('trip')
    expect(res.body.data).toHaveProperty('passengers')
    expect(res.body.data).toHaveProperty('total')
    expect(Array.isArray(res.body.data.passengers)).toBe(true)
  })

  it('retourne la liste des passagers (AGENT de la compagnie)', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/passengers`)
      .set('Authorization', `Bearer ${makeToken('AGENT', companyId)}`)
    expect(res.status).toBe(200)
  })

  it('refuse une autre compagnie (403)', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}/passengers`)
      .set(
        'Authorization',
        `Bearer ${makeToken('ADMIN_COMPANY', '00000000-0000-0000-0000-000000000000')}`
      )
    expect(res.status).toBe(403)
  })

  it('refuse sans token (401)', async () => {
    const res = await request(app).get(`/api/trips/${tripId}/passengers`)
    expect(res.status).toBe(401)
  })

  it('retourne 404 pour un trajet inexistant', async () => {
    const res = await request(app)
      .get('/api/trips/00000000-0000-0000-0000-000000000000/passengers')
      .set('Authorization', `Bearer ${makeToken('SUPER_ADMIN')}`)
    expect(res.status).toBe(404)
  })
})
