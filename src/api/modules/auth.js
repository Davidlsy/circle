import api from '../index'

// 登录接口：后端使用 OAuth2PasswordRequestForm，需发送 application/x-www-form-urlencoded
export const login = (data) => {
  const params = new URLSearchParams()
  params.append('username', data.username)
  params.append('password', data.password)
  return api.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}

export const register = (data) => api.post('/auth/register', data)
export const getProfile = () => api.get('/users/me')
