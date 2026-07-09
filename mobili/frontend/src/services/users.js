import api from './api'

export const getMe = () => api.get('/api/users/me')
export const updateMe = (data) => api.put('/api/users/me', data)
export const listUsers = (params) => api.get('/api/users', { params })
export const createAgent = (data) => api.post('/api/users/agents', data)
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/api/users/${id}`)
