import api from './api'

export const listUsers = (params) => api.get('/api/users', { params })
export const createAgent = (data) => api.post('/api/users/agents', data)
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/api/users/${id}`)
