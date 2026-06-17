const { z } = require('zod')
const tripsService = require('./trips.service')

const searchSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

module.exports = { searchHandler, getByIdHandler, getTodayHandler }
