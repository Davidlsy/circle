import api from '../index'
// 私信
export const getConversations = () => api.get('/messages/conversations')
export const getOrCreateConversation = (data) => api.post('/messages/conversations', data)
export const getMessages = (convId, params) => api.get(`/messages/conversations/${convId}/messages`, { params })
export const sendMessage = (convId, data) => api.post(`/messages/conversations/${convId}/messages`, data)
export const markRead = (convId) => api.put(`/messages/conversations/${convId}/read`)
export const getUnreadCount = () => api.get('/messages/conversations/unread-count')
// 群聊
export const getGroups = () => api.get('/groups/')
export const getGroup = (id) => api.get(`/groups/${id}`)
export const createGroup = (data) => api.post('/groups/', data)
export const getGroupMessages = (id, params) => api.get(`/groups/${id}/messages`, { params })
export const sendGroupMessage = (id, data) => api.post(`/groups/${id}/messages`, data)
