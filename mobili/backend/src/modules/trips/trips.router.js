const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const { searchHandler, getByIdHandler, getTodayHandler } = require('./trips.controller')

const router = Router()

router.get('/', searchHandler)
router.get(
  '/today',
  authenticate,
  authorize('AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'),
  getTodayHandler
)
router.get('/:id', getByIdHandler)

module.exports = router
