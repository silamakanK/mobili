const { z } = require('zod')
const usersService = require('./users.service')

const createAgentSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  password: z.string().min(8),
  companyId: z.string().uuid().optional(),
})

const updateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/)
    .optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

async function listHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await usersService.listUsers(req.user, { page, limit })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function createAgentHandler(req, res, next) {
  try {
    const data = createAgentSchema.parse(req.body)
    const agent = await usersService.createAgent(req.user, data)
    res.status(201).json({ success: true, data: agent })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function updateHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)
    const user = await usersService.updateUser(req.params.id, req.user, data)
    res.json({ success: true, data: user })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function deleteHandler(req, res, next) {
  try {
    await usersService.deleteUser(req.params.id, req.user)
    res.json({ success: true, message: 'Utilisateur désactivé.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listHandler, createAgentHandler, updateHandler, deleteHandler }
