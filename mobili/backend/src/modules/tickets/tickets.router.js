const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  getTicketByIdHandler,
  downloadTicketHandler,
  searchTicketsHandler,
  validateTicketHandler,
} = require('./tickets.controller')

const router = Router()

router.post(
  '/validate',
  authenticate,
  authorize('AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'),
  validateTicketHandler
)
router.get(
  '/search',
  authenticate,
  authorize('AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'),
  searchTicketsHandler
)
router.get('/:id/download', authenticate, downloadTicketHandler)
router.get('/:id', authenticate, getTicketByIdHandler)

module.exports = router
