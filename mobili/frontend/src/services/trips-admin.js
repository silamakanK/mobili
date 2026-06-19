import api from './api'

export const listCompanyTrips = (params) => api.get('/api/trips/admin', { params })
export const createTrip = (data) => api.post('/api/trips', data)
export const updateTrip = (id, data) => api.put(`/api/trips/${id}`, data)
export const cancelTrip = (id) => api.delete(`/api/trips/${id}`)
