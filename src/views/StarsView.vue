<template>
  <div class="page-content">
    <div class="stars-view">
      <!-- 搜索框 -->
      <div class="stars-search">
        <div class="topbar-search">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索明星..."
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <!-- 明星卡片网格 -->
      <div v-else-if="stars.length" class="card-grid stars-grid">
        <div
          v-for="star in stars"
          :key="star.id"
          class="card star-grid-card"
          @click="goDetail(star.id)"
        >
          <div class="star-grid-card-cover">
            <img
              :src="star.cover || star.avatar || defaultCover"
              :alt="star.name"
              loading="lazy"
            />
          </div>
          <div class="star-grid-card-overlay">
            <div class="star-grid-card-name">{{ star.name }}</div>
            <div class="star-grid-card-fans">
              <span>{{ formatFans(star.fans_count) }}</span> 粉丝
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-state-icon">&#127775;</div>
        <div class="empty-state-title">暂无明星</div>
        <div class="empty-state-desc">换个关键词试试吧</div>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination">
        <button
          class="pagination-btn"
          :disabled="page <= 1"
          @click="changePage(page - 1)"
        >
          &lt;
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          class="pagination-btn"
          :class="{ active: p === page }"
          @click="changePage(p)"
        >
          {{ p }}
        </button>
        <button
          class="pagination-btn"
          :disabled="page >= totalPages"
          @click="changePage(page + 1)"
        >
          &gt;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStars } from '@/api/modules/stars'

const router = useRouter()
const keyword = ref('')
const stars = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 12
const total = ref(0)

const defaultCover = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%22400%22%20height%22225%22%20viewBox%220%200%20400%20225%22%3E%3Crect%20fill%22%23f0f0f0%22%20width%22400%22%20height%22225%22%2F%3E%3Ctext%20fill%22%23ccc%22%20font-family%22sans-serif%22%20font-size%2224%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EStar%3C%2Ftext%3E%3C%2Fsvg%3E'

const totalPages = computed(() => Math.ceil(total.value / pageSize))

let searchTimer = null

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchStars()
  }, 300)
}

async function fetchStars() {
  loading.value = true
  try {
    const res = await getStars({
      keyword: keyword.value || undefined,
      page: page.value,
      page_size: pageSize
    })
    stars.value = res.results || res.data || res.list || res || []
    total.value = res.count ?? stars.value.length
  } catch (e) {
    console.error('获取明星列表失败', e)
  } finally {
    loading.value = false
  }
}

function changePage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchStars()
}

function formatFans(count) {
  if (count == null) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}

function goDetail(id) {
  router.push(`/stars/${id}`)
}

onMounted(() => {
  fetchStars()
})
</script>

<style scoped>
.stars-view {
  max-width: 1100px;
  margin: 0 auto;
}

.stars-search {
  margin-bottom: 20px;
}

.stars-search .topbar-search {
  max-width: 480px;
}

.stars-search .topbar-search input {
  width: 100%;
  height: 40px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0 16px 0 40px;
  font-size: 14px;
  color: var(--text);
  transition: var(--transition);
}

.stars-search .topbar-search input:focus {
  border-color: var(--primary);
  background: var(--card);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.stars-search .topbar-search input::placeholder {
  color: var(--text-light);
}

.stars-search .topbar-search .search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  width: 18px;
  height: 18px;
}

/* 三列网格 */
.card-grid.stars-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.card.star-grid-card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: var(--transition);
  background: var(--card);
}

.card.star-grid-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

/* 16:9 封面 */
.star-grid-card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg);
}

.star-grid-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.card.star-grid-card:hover .star-grid-card-cover img {
  transform: scale(1.05);
}

/* 底部浮层 */
.star-grid-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 12px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: var(--text-white);
}

.star-grid-card-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.star-grid-card-fans {
  font-size: 12px;
  opacity: 0.85;
}

@media (max-width: 900px) {
  .card-grid.stars-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .card-grid.stars-grid {
    grid-template-columns: 1fr;
  }
}
</style>
