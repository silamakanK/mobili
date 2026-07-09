import api from './api'

export const getGlobalStats = (params = {}) => api.get('/api/stats/global', { params })
export const getCompanyStats = (id, params = {}) => api.get(`/api/stats/company/${id}`, { params })
