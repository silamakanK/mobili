const { Router } = require('express')
const { z } = require('zod')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const svc = require('./recurring-trips.service')

const router = Router()
const adminRoles = ['ADMIN_COMPANY', 'SUPER_ADMIN']

const createSchema = z.object({
  routeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().int().positive(),
  validFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

// Lister les modèles récurrents de la compagnie
router.get('/', authenticate, authorize(...adminRoles), async (req, res, next) => {
  try {
    const companyId = req.user.role === 'SUPER_ADMIN' ? req.query.companyId : req.user.companyId
    if (!companyId) return res.status(400).json({ error: 'companyId requis.' })
    res.json({ success: true, data: await svc.listRecurringTrips(companyId) })
  } catch (err) {
    next(err)
  }
})

// Créer un modèle
router.post('/', authenticate, authorize(...adminRoles), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body)
    const result = await svc.createRecurringTrip(req.user, data)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
})

// Modifier un modèle
router.put('/:id', authenticate, authorize(...adminRoles), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await svc.updateRecurringTrip(req.params.id, req.user, req.body),
    })
  } catch (err) {
    next(err)
  }
})

// Désactiver un modèle
router.delete('/:id', authenticate, authorize(...adminRoles), async (req, res, next) => {
  try {
    await svc.deleteRecurringTrip(req.params.id, req.user)
    res.json({ success: true, data: { message: 'Modèle désactivé.' } })
  } catch (err) {
    next(err)
  }
})

// Générer les trajets pour les N prochaines semaines
router.post('/:id/generate', authenticate, authorize(...adminRoles), async (req, res, next) => {
  try {
    const weeks = Number(req.body.weeks) || 4
    const result = await svc.generateTrips(req.params.id, req.user, { weeks })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// Remplacer le bus d'un trajet (en cas de panne)
router.put(
  '/trips/:tripId/vehicle',
  authenticate,
  authorize(...adminRoles),
  async (req, res, next) => {
    try {
      const { vehicleId } = req.body
      if (!vehicleId) return res.status(400).json({ error: 'vehicleId requis.' })
      res.json({
        success: true,
        data: await svc.replaceVehicle(req.params.tripId, req.user, vehicleId),
      })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
