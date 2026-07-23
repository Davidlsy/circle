<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">登录</h2>
      <p class="auth-subtitle">欢迎回到 CIRCLE 粉丝社群</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="btn-loading">
            <span class="spinner-sm"></span>
          </span>
          <span>{{ loading ? '登录中...' : '登录' }}</span>
        </button>
      </form>

      <div class="auth-link">
        没有账号？<router-link to="/register">去注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/modules/auth'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  errorMsg.value = ''

  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password) {
    errorMsg.value = '请输入密码'
    return
  }

  loading.value = true
  try {
    const data = await login({
      username: form.username.trim(),
      password: form.password,
    })
    userStore.setToken(data.access_token)
    router.push('/')
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || '登录失败，请检查用户名和密码'
    errorMsg.value = message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
  width: 400px;
  max-width: 90vw;
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 40px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-light);
  text-align: center;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  height: 44px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 14px;
  font-size: 14px;
  color: var(--text);
  transition: all 0.25s ease;
}

.form-input:focus {
  border-color: var(--primary);
  background: var(--card);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-input::placeholder {
  color: var(--text-light);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #fdf0ef;
  border-radius: var(--radius-sm);
  border: 1px solid #fdd;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s ease;
  white-space: nowrap;
  cursor: pointer;
  border: none;
}

.btn-primary {
  width: 100%;
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-link {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-light);
}

.auth-link a {
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.25s ease;
}

.auth-link a:hover {
  color: var(--primary-hover);
}
</style>