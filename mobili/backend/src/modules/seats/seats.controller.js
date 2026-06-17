const { z } = require('zod')
const seatsService = require('./seats.service')

const updateSchema = z.object({
  type: z.string().min(2).optional(),
  isAvailable: z.boolean().optional(),
})

async function listHandler(req, res, next) {
  try {
    if (!req.query.vehicleId) {
      return res.status(400).json({ success: false, error: 'vehicleId requis.' })
    }
    const seats = await seatsService.listSeats(req.query.vehicleId)
    res.json({ success: true, data: seats })
  } catch (err) {
    next(err)
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const seat = await seatsService.getSeatById(req.params.id)
    res.json({ success: true, data: seat })
  } catch (err) {
    next(err)
  }
}

async function updateHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)
    const seat = await seatsService.updateSeat(req.params.id, req.user, data)
    res.json({ success: true, data: seat })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function deleteHandler(req, res, next) {
  try {
    await seatsService.deleteSeat(req.params.id, req.user)
    res.json({ success: true, message: 'Siège supprimé.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listHandler, getByIdHandler, updateHandler, deleteHandler }
