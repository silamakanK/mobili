const { z } = require('zod')
const ticketService = require('./tickets.service')
const validationsService = require('../validations/validations.service')

const validateSchema = z.object({
  qrCode: z.string().min(1),
})

const searchSchema = z.object({
  q: z.string().min(2),
})

async function getTicketByIdHandler(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user.id)
    res.json({ success: true, data: ticket })
  } catch (err) {
    next(err)
  }
}

async function downloadTicketHandler(req, res, next) {
  try {
    const pdfBuffer = await ticketService.getTicketPdf(req.params.id, req.user.id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="billet-${req.params.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    })
    res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
}

async function searchTicketsHandler(req, res, next) {
  try {
    const { q } = searchSchema.parse(req.query)
    const tickets = await ticketService.searchTickets({ q, companyId: req.user.companyId })
    res.json({ success: true, data: tickets })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

async function validateTicketHandler(req, res, next) {
  try {
    const { qrCode } = validateSchema.parse(req.body)
    const result = await validationsService.validateTicket({ qrCode, agentId: req.user.id })
    const statusCode = result.status === 'VALID' ? 200 : 422
    res.status(statusCode).json({ success: result.status === 'VALID', data: result })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

module.exports = {
  getTicketByIdHandler,
  downloadTicketHandler,
  searchTicketsHandler,
  validateTicketHandler,
}
