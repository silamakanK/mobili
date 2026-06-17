const { z } = require('zod')
const companiesService = require('./companies.service')

const createSchema = z.object({
  name: z.string().min(2).max(100),
  logo: z.string().url().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(/^\+?[0-9]{8,15}$/),
})

const updateSchema = createSchema.partial()

async function listHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const result = await companiesService.listCompanies({ page, limit })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function getByIdHandler(req, res, next) {
  try {
    const company = await companiesService.getCompanyById(req.params.id)
    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

async function createHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body)
    const company = await companiesService.createCompany(data)
    res.status(201).json({ success: true, data: company })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function updateHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)
    const company = await companiesService.updateCompany(req.params.id, data)
    res.json({ success: true, data: company })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

module.exports = { listHandler, getByIdHandler, createHandler, updateHandler }
