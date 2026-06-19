const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  listHandler,
  getByIdHandler,
  createHandler,
  updateHandler,
} = require('./companies.controller')

const router = Router()
const superAdmin = [authenticate, authorize('SUPER_ADMIN')]

router.get('/', listHandler)
router.get('/:id', getByIdHandler)
router.post('/', ...superAdmin, createHandler)
router.put('/:id', ...superAdmin, updateHandler)

module.exports = router
