import api from './api'

export const searchTrips = (from, to, date) =>
  api.get('/api/trips', { params: { from, to, date: date || undefined } })
export const getTripById = (id) => api.get(`/api/trips/${id}`)
export const getTodayTrips = () => api.get('/api/trips/today')
