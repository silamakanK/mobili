const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  createReservationHandler,
  getMyReservationsHandler,
  getReservationByIdHandler,
  cancelReservationHandler,
  listCompanyReservationsHandler,
} = require('./reservations.controller')

const router = Router()

router.post('/', authenticate, authorize('VOYAGEUR'), createReservationHandler)
router.get('/me', authenticate, getMyReservationsHandler)
router.get(
  '/company',
  authenticate,
  authorize('ADMIN_COMPANY', 'SUPER_ADMIN'),
  listCompanyReservationsHandler
)
router.get('/:id', authenticate, getReservationByIdHandler)
router.delete('/:id', authenticate, authorize('VOYAGEUR'), cancelReservationHandler)

module.exports = router
