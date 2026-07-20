import api from '../index'
export const getFeed = (params) => api.get('/feed/', { params })
export const followUser = (id) => api.post(`/users/${id}/follow`)
export const unfollowUser = (id) => api.post(`/users/${id}/follow`)  // toggle
export const getFollowers = (id, params) => api.get(`/users/${id}/followers`, { params })
export const getFollowing = (id, params) => api.get(`/users/${id}/following`, { params })
export const getUserProfile = (id) => api.get(`/users/${id}`)
