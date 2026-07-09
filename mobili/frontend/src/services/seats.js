import api from './api'

export const listSeats = (vehicleId) => api.get('/api/seats', { params: { vehicleId } })
export const updateSeat = (id, data) => api.put(`/api/seats/${id}`, data)
export const getTripSeats = (tripId) => api.get(`/api/trips/${tripId}/seats`)
export const blockTripSeat = (tripId, seatId) => api.post(`/api/trips/${tripId}/seats/${seatId}/block`)
export const unblockTripSeat = (tripId, seatId) => api.delete(`/api/trips/${tripId}/seats/${seatId}/block`)
export const initVehicleSeats = (vehicleId) => api.post('/api/seats/init', { vehicleId })
