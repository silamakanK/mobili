const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const { listHandler, getByIdHandler, updateHandler, deleteHandler } = require('./seats.controller')

const router = Router()
const adminOrSuper = [authenticate, authorize('ADMIN_COMPANY', 'SUPER_ADMIN')]

router.get('/', authenticate, listHandler)
router.get('/:id', authenticate, getByIdHandler)
router.put('/:id', ...adminOrSuper, updateHandler)
router.delete('/:id', ...adminOrSuper, deleteHandler)

module.exports = router
