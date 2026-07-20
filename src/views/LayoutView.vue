<template>
  <div class="app-layout">
    <!-- 左侧固定侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">C</span>
        <span>CIRCLE</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="sidebar-nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="item.icon === 'home'">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </template>
            <template v-else-if="item.icon === 'star'">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </template>
            <template v-else-if="item.icon === 'fan-circle'">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </template>
            <template v-else-if="item.icon === 'message'">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </template>
            <template v-else-if="item.icon === 'group'">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </template>
            <template v-else-if="item.icon === 'user'">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </template>
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- 底部用户信息 -->
      <div class="sidebar-footer">
        <router-link to="/profile" class="sidebar-user">
          <div class="sidebar-user-avatar">
            {{ userAvatarText }}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ userStore.user?.nickname || userStore.user?.username || '加载中...' }}</div>
            <div class="sidebar-user-role">普通用户</div>
          </div>
        </router-link>
        <button class="logout-btn" @click="handleLogout">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>退出登录</span>
        </button>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-search">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="搜索明星、帖子、用户..." />
        </div>
        <div class="topbar-actions"></div>
      </header>

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuItems = [
  { label: '首页', path: '/', icon: 'home' },
  { label: '明星', path: '/stars', icon: 'star' },
  { label: '粉丝圈', path: '/fan-circles', icon: 'fan-circle' },
  { label: '私信', path: '/messages', icon: 'message' },
  { label: '群聊', path: '/groups', icon: 'group' },
  { label: '个人中心', path: '/profile', icon: 'user' },
]

const userAvatarText = computed(() => {
  const user = userStore.user
  if (!user) return '?'
  return (user.nickname || user.username || '?').charAt(0).toUpperCase()
})

function isActive(path) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  userStore.fetchProfile()
})
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 220px;
  height: 100vh;
  background: #2c3e50;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow-y: auto;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-logo .logo-icon {
  width: 32px;
  height: 32px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  text-decoration: none;
  transition: all 0.25s ease;
  cursor: pointer;
  position: relative;
}

.sidebar-nav-item:hover {
  color: #ffffff;
  background: #34495e;
}

.sidebar-nav-item.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: var(--primary);
  border-radius: 0 2px 2px 0;
}

.sidebar-nav-item .nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 24px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  border-radius: var(--radius);
  padding: 6px;
  text-decoration: none;
  color: inherit;
}

.sidebar-user:hover {
  background: #34495e;
}

.sidebar-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.sidebar-user-info {
  flex: 1;
  overflow: hidden;
}

.sidebar-user-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
}

.sidebar-user-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  margin-top: 8px;
  width: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  border-radius: var(--radius);
  transition: all 0.25s ease;
  background: none;
  border: none;
  cursor: pointer;
}

.logout-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
}

.logout-btn .nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.main-content {
  margin-left: 220px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  height: 56px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  z-index: 90;
  box-shadow: var(--shadow);
}

.topbar-search {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.topbar-search input {
  width: 100%;
  height: 36px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 0 16px 0 40px;
  font-size: 13px;
  color: var(--text);
  transition: all 0.25s ease;
}

.topbar-search input:focus {
  border-color: var(--primary);
  background: var(--card);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.topbar-search input::placeholder {
  color: var(--text-light);
}

.topbar-search .search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  width: 16px;
  height: 16px;
}

.page-content {
  flex: 1;
  padding: 20px 24px;
}
</style>