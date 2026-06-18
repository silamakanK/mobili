const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  listHandler,
  createAgentHandler,
  createManagerHandler,
  listManagersHandler,
  updateHandler,
  deleteHandler,
} = require('./users.controller')

const router = Router()
const adminOrSuper = [authenticate, authorize('ADMIN_COMPANY', 'SUPER_ADMIN')]
const superOnly = [authenticate, authorize('SUPER_ADMIN')]

router.get('/', ...adminOrSuper, listHandler)
router.post('/agents', ...adminOrSuper, createAgentHandler)
router.post('/managers', ...superOnly, createManagerHandler)
router.get('/managers', ...superOnly, listManagersHandler)
router.put('/:id', ...adminOrSuper, updateHandler)
router.delete('/:id', ...adminOrSuper, deleteHandler)

module.exports = router
