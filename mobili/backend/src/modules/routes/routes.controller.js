const { z } = require('zod')
const routesService = require('./routes.service')

const createSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  distance: z.number().int().positive().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  companyId: z.string().uuid().optional(),
})

const updateSchema = createSchema.omit({ companyId: true }).partial()

async function listHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await routesService.listRoutes(req.user, { page, limit })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const route = await routesService.getRouteById(req.params.id)
    res.json({ success: true, data: route })
  } catch (err) {
    next(err)
  }
}

async function createHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body)
    const route = await routesService.createRoute(req.user, data)
    res.status(201).json({ success: true, data: route })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function updateHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)
    const route = await routesService.updateRoute(req.params.id, req.user, data)
    res.json({ success: true, data: route })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function deleteHandler(req, res, next) {
  try {
    await routesService.deleteRoute(req.params.id, req.user)
    res.json({ success: true, message: 'Ligne désactivée.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listHandler, getByIdHandler, createHandler, updateHandler, deleteHandler }
