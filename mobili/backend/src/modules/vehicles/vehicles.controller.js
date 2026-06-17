const { z } = require('zod')
const vehiclesService = require('./vehicles.service')

const createSchema = z.object({
  registrationNumber: z.string().min(3).max(20),
  type: z.string().min(2),
  totalSeats: z.number().int().min(1).max(100),
  companyId: z.string().uuid().optional(),
})

const updateSchema = z.object({
  registrationNumber: z.string().min(3).max(20).optional(),
  type: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
})

async function listHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await vehiclesService.listVehicles(req.user, { page, limit })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const vehicle = await vehiclesService.getVehicleById(req.params.id)
    res.json({ success: true, data: vehicle })
  } catch (err) {
    next(err)
  }
}

async function createHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body)
    const vehicle = await vehiclesService.createVehicle(req.user, data)
    res.status(201).json({ success: true, data: vehicle })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function updateHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)
    const vehicle = await vehiclesService.updateVehicle(req.params.id, req.user, data)
    res.json({ success: true, data: vehicle })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function deleteHandler(req, res, next) {
  try {
    await vehiclesService.deleteVehicle(req.params.id, req.user)
    res.json({ success: true, message: 'Véhicule désactivé.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listHandler, getByIdHandler, createHandler, updateHandler, deleteHandler }
