import api from './api'

export const listRoutes = (params) => api.get('/api/routes', { params })
export const createRoute = (data) => api.post('/api/routes', data)
export const updateRoute = (id, data) => api.put(`/api/routes/${id}`, data)
export const deleteRoute = (id) => api.delete(`/api/routes/${id}`)
