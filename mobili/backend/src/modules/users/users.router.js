const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  listHandler,
  createAgentHandler,
  updateHandler,
  deleteHandler,
} = require('./users.controller')

const router = Router()
const adminOrSuper = [authenticate, authorize('ADMIN_COMPANY', 'SUPER_ADMIN')]

router.get('/', ...adminOrSuper, listHandler)
router.post('/agents', ...adminOrSuper, createAgentHandler)
router.put('/:id', ...adminOrSuper, updateHandler)
router.delete('/:id', ...adminOrSuper, deleteHandler)

module.exports = router
