<template>
  <div class="page-content">
    <div class="fan-circles-view">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <!-- 粉丝圈卡片网格 -->
      <div v-else-if="circles.length" class="card-grid fan-circles-grid">
        <div
          v-for="circle in circles"
          :key="circle.id"
          class="fan-circle-card card"
          @click="goDetail(circle.id)"
        >
          <div class="fan-circle-card-inner">
            <div class="fan-circle-icon">
              <img
                :src="circle.avatar || circle.cover || defaultIcon"
                :alt="circle.name"
              />
            </div>
            <div class="fan-circle-card-name">{{ circle.name }}</div>
            <div class="fan-circle-meta">
              <span class="fan-circle-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {{ formatNumber(circle.fans_count || circle.members_count) }}
              </span>
              <span class="fan-circle-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {{ formatNumber(circle.posts_count) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-state-icon">&#127758;</div>
        <div class="empty-state-title">暂无粉丝圈</div>
        <div class="empty-state-desc">还没有创建粉丝圈</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStars } from '@/api/modules/stars'

const router = useRouter()
const circles = ref([])
const loading = ref(false)

const defaultIcon = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%2264%22%20height%2264%22%20viewBox%220%200%2064%2064%22%3E%3Crect%20fill%22%23ffe0e0%22%20width%2264%22%20height%2264%22%20rx%2216%22%2F%3E%3Ctext%20fill%22%23ff6b6b%22%20font-family%22sans-serif%22%20font-size%2228%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EFC%3C%2Ftext%3E%3C%2Fsvg%3E'

async function fetchCircles() {
  loading.value = true
  try {
    const res = await getStars({ page: 1, page_size: 12 })
    circles.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取粉丝圈列表失败', e)
  } finally {
    loading.value = false
  }
}

function formatNumber(num) {
  if (num == null) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function goDetail(id) {
  router.push(`/fan-circles/${id}`)
}

onMounted(() => {
  fetchCircles()
})
</script>

<style scoped>
.fan-circles-view {
  max-width: 1100px;
  margin: 0 auto;
}

/* 三列网格 */
.card-grid.fan-circles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.fan-circle-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition);
}

.fan-circle-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.fan-circle-card-inner {
  padding: 20px;
  text-align: center;
}

.fan-circle-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg);
}

.fan-circle-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fan-circle-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fan-circle-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-light);
}

.fan-circle-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.fan-circle-meta-item svg {
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .card-grid.fan-circles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .card-grid.fan-circles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
