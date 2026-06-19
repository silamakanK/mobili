import api from './api'

export const getGlobalStats = () => api.get('/api/stats/global')
export const getCompanyStats = (id) => api.get(`/api/stats/company/${id}`)
