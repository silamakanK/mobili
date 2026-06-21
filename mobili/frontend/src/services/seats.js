import api from './api'

export const listSeats = (vehicleId) => api.get('/api/seats', { params: { vehicleId } })
export const updateSeat = (id, data) => api.put(`/api/seats/${id}`, data)
