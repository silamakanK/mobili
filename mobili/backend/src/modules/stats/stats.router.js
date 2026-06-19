const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const { getCompanyStats, getGlobalStats } = require('./stats.service')

const router = Router()

router.get('/global', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const data = await getGlobalStats()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get(
  '/company/:id',
  authenticate,
  authorize('ADMIN_COMPANY', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      if (req.user.role === 'ADMIN_COMPANY' && req.params.id !== req.user.companyId) {
        return res.status(403).json({ error: 'Accès non autorisé.' })
      }
      const data = await getCompanyStats(req.params.id)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
