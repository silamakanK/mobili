import api from './api'

export const getTicket = (id) => api.get(`/api/tickets/${id}`)
export const searchTicket = (q) => api.get('/api/tickets/search', { params: { q } })
export const validateTicket = (data) => api.post('/api/tickets/validate', data)
