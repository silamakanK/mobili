import api from './api'

export const initiatePayment = (data) => api.post('/api/payments/initiate', data)
export const getPaymentStatus = (id) => api.get(`/api/payments/${id}/status`)
export const simulateWebhook = (data) => api.post('/api/payments/webhook', data)
