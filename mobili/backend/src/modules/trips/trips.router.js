const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  searchHandler,
  getByIdHandler,
  getTodayHandler,
  listCompanyHandler,
  createTripHandler,
  updateTripHandler,
  cancelTripHandler,
  getPassengersHandler,
} = require('./trips.controller')

const router = Router()
const adminOrSuper = [authenticate, authorize('ADMIN_COMPANY', 'SUPER_ADMIN')]

router.get('/', searchHandler)
router.get(
  '/today',
  authenticate,
  authorize('AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'),
  getTodayHandler
)
router.get('/admin', ...adminOrSuper, listCompanyHandler)
router.post('/', ...adminOrSuper, createTripHandler)
router.put('/:id', ...adminOrSuper, updateTripHandler)
router.delete('/:id', ...adminOrSuper, cancelTripHandler)
router.get(
  '/:id/passengers',
  authenticate,
  authorize('AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'),
  getPassengersHandler
)
router.get('/:id', getByIdHandler)

module.exports = router
