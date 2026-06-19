const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  listHandler,
  getByIdHandler,
  createHandler,
  updateHandler,
  deleteHandler,
} = require('./routes.controller')

const router = Router()
const adminOrSuper = [authenticate, authorize('ADMIN_COMPANY', 'SUPER_ADMIN')]

router.get('/', ...adminOrSuper, listHandler)
router.get('/:id', ...adminOrSuper, getByIdHandler)
router.post('/', ...adminOrSuper, createHandler)
router.put('/:id', ...adminOrSuper, updateHandler)
router.delete('/:id', ...adminOrSuper, deleteHandler)

module.exports = router
