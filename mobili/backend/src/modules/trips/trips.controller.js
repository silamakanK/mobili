const { z } = require('zod')
const tripsService = require('./trips.service')

const searchSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

async function searchHandler(req, res, next) {
  try {
    const params = searchSchema.parse(req.query)
    const trips = await tripsService.searchTrips(params)
    res.json({ success: true, data: trips })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors })
    }
    next(err)
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const trip = await tripsService.getTripById(req.params.id)
    res.json({ success: true, data: trip })
  } catch (err) {
    next(err)
  }
}

async function getTodayHandler(req, res, next) {
  try {
    const trips = await tripsService.getTodayTrips(req.user.companyId)
    res.json({ success: true, data: trips })
  } catch (err) {
    next(err)
  }
}

const tripAdminSchema = z.object({
  routeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().positive(),
  availableSeats: z.number().int().positive().optional(),
})

async function listCompanyHandler(req, res, next) {
  try {
    const { page, limit, from, to } = req.query
    const result = await tripsService.listCompanyTrips(req.user.companyId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      from,
      to,
    })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function createTripHandler(req, res, next) {
  try {
    const data = tripAdminSchema.parse(req.body)
    const trip = await tripsService.createTrip(req.user, data)
    res.status(201).json({ success: true, data: trip })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function updateTripHandler(req, res, next) {
  try {
    const trip = await tripsService.updateTrip(req.params.id, req.user, req.body)
    res.json({ success: true, data: trip })
  } catch (err) {
    next(err)
  }
}

async function cancelTripHandler(req, res, next) {
  try {
    await tripsService.cancelTrip(req.params.id, req.user)
    res.json({ success: true, data: { message: 'Trajet annulé.' } })
  } catch (err) {
    next(err)
  }
}

async function getPassengersHandler(req, res, next) {
  try {
    const result = await tripsService.getPassengers(req.params.id, req.user)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  searchHandler,
  getByIdHandler,
  getTodayHandler,
  listCompanyHandler,
  createTripHandler,
  updateTripHandler,
  cancelTripHandler,
  getPassengersHandler,
}
