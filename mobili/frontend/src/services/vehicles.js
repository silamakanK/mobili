import api from './api'

export const listVehicles = (params) => api.get('/api/vehicles', { params })
export const createVehicle = (data) => api.post('/api/vehicles', data)
export const updateVehicle = (id, data) => api.put(`/api/vehicles/${id}`, data)
export const deleteVehicle = (id) => api.delete(`/api/vehicles/${id}`)
