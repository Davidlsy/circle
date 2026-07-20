import api from '../index'
export const getStars = (params) => api.get('/stars/', { params })
export const getStar = (id) => api.get(`/stars/${id}`)
export const applyFan = (starId) => api.post(`/stars/${starId}/fans/apply`)
export const getStarFans = (starId, params) => api.get(`/stars/${starId}/fans`, { params })
export const followStar = (id) => api.post(`/stars/${id}/follow`)
export const checkin = (starId) => api.post(`/stars/${starId}/checkin`)
export const getCheckinStatus = (starId) => api.get(`/stars/${starId}/checkin/status`)
