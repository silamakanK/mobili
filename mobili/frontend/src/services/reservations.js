import api from './api'

export const createReservation = (data) => api.post('/api/reservations', data)
export const getMyReservations = () => api.get('/api/reservations/me')
export const getReservationById = (id) => api.get(`/api/reservations/${id}`)
