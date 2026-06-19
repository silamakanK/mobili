const { z } = require('zod')
const service = require('./reservations.service')

const createSchema = z.object({
  tripId: z.string().uuid(),
  seatId: z.string().uuid(),
})

async function createReservationHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body)
    const reservation = await service.createReservation({ userId: req.user.id, ...data })
    res.status(201).json({ success: true, data: reservation })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function getMyReservationsHandler(req, res, next) {
  try {
    const reservations = await service.getUserReservations(req.user.id)
    res.json({ success: true, data: reservations })
  } catch (err) {
    next(err)
  }
}

async function getReservationByIdHandler(req, res, next) {
  try {
    const reservation = await service.getReservationById(req.params.id, req.user.id)
    res.json({ success: true, data: reservation })
  } catch (err) {
    next(err)
  }
}

async function cancelReservationHandler(req, res, next) {
  try {
    const result = await service.cancelReservation(req.params.id, req.user.id)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createReservationHandler,
  getMyReservationsHandler,
  getReservationByIdHandler,
  cancelReservationHandler,
}
