import api from './api'

export const listRecurringTrips = (companyId) =>
  api.get('/api/recurring-trips', { params: companyId ? { companyId } : {} })

export const createRecurringTrip = (data) => api.post('/api/recurring-trips', data)

export const updateRecurringTrip = (id, data) => api.put(`/api/recurring-trips/${id}`, data)

export const deleteRecurringTrip = (id) => api.delete(`/api/recurring-trips/${id}`)

export const generateTrips = (id, weeks = 4) =>
  api.post(`/api/recurring-trips/${id}/generate`, { weeks })

export const replaceVehicle = (tripId, vehicleId) =>
  api.put(`/api/recurring-trips/trips/${tripId}/vehicle`, { vehicleId })
