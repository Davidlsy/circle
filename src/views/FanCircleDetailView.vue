<template>
  <div class="page-content">
    <div class="fan-circle-detail">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <template v-else-if="circle">
        <!-- 粉丝圈信息卡片 -->
        <div class="fan-circle-detail-header card">
          <div class="fan-circle-detail-icon">
            <img
              :src="circle.avatar || circle.cover || defaultIcon"
              :alt="circle.name"
            />
          </div>
          <div class="fan-circle-detail-info">
            <h1 class="fan-circle-detail-name">{{ circle.name }}</h1>
            <p v-if="circle.bio || circle.description" class="fan-circle-detail-desc">
              {{ circle.bio || circle.description }}
            </p>
            <div class="fan-circle-detail-stats">
              <div class="star-stat">
                <strong>{{ formatNumber(circle.fans_count || circle.members_count) }}</strong> 成员
              </div>
              <div class="star-stat">
                <strong>{{ formatNumber(circle.posts_count) }}</strong> 帖子
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="tabs">
          <div
            class="tab-item"
            :class="{ active: activeTab === 'posts' }"
            @click="activeTab = 'posts'"
          >
            动态
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'photos' }"
            @click="activeTab = 'photos'"
          >
            照片墙
          </div>
        </div>

        <!-- 动态 Tab -->
        <div v-if="activeTab === 'posts'" class="fan-circle-detail-tab-content">
          <div v-if="postsLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>
          <template v-else-if="posts.length">
            <div
              v-for="post in posts"
              :key="post.id"
              class="post-card"
              @click="goPost(post.id)"
            >
              <div class="post-header">
                <img
                  :src="post.author_avatar || post.user?.avatar || defaultAvatar"
                  :alt="post.author_name || post.user?.username"
                  class="post-avatar"
                />
                <div class="post-user-info">
                  <div class="post-username">{{ post.author_name || post.user?.username }}</div>
                  <div class="post-meta">
                    <span>{{ formatTime(post.created_at) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="post.content" class="post-body">{{ post.content }}</div>
              <div v-if="post.images && post.images.length" class="post-images">
                <div
                  class="post-images-grid"
                  :class="'grid-' + Math.min(post.images.length, 3)"
                >
                  <img
                    v-for="(img, idx) in post.images.slice(0, 3)"
                    :key="idx"
                    :src="img"
                    loading="lazy"
                  />
                </div>
              </div>
              <div class="post-actions">
                <div class="post-action-btn">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{{ post.likes_count || 0 }}</span>
                </div>
                <div class="post-action-btn">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{{ post.comments_count || 0 }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="empty-state">
            <div class="empty-state-icon">&#128196;</div>
            <div class="empty-state-title">暂无动态</div>
            <div class="empty-state-desc">还没有人发布动态</div>
          </div>
        </div>

        <!-- 照片墙 Tab -->
        <div v-if="activeTab === 'photos'" class="fan-circle-detail-tab-content">
          <div v-if="photosLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>
          <div v-else-if="photos.length" class="photo-wall">
            <div
              v-for="(photo, idx) in photos"
              :key="idx"
              class="photo-wall-item"
              @click="previewPhoto(photo)"
            >
              <img
                :src="photo.image || photo.url || photo"
                :alt="'照片 ' + (idx + 1)"
                loading="lazy"
              />
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">&#128247;</div>
            <div class="empty-state-title">暂无照片</div>
            <div class="empty-state-desc">还没有人上传照片</div>
          </div>
        </div>

        <!-- 图片预览 -->
        <div v-if="previewVisible" class="image-preview-overlay" @click="previewVisible = false">
          <img :src="previewUrl" alt="预览" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { getStar } from '@/api/modules/stars'
import { getPosts } from '@/api/modules/posts'

const route = useRoute()
const router = useRouter()

const circle = ref(null)
const loading = ref(false)
const posts = ref([])
const postsLoading = ref(false)
const photos = ref([])
const photosLoading = ref(false)
const activeTab = ref('posts')
const previewVisible = ref(false)
const previewUrl = ref('')

const defaultAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%2264%22%20height%2264%22%20viewBox%220%200%2064%2064%22%3E%3Crect%20fill%22%23f0f0f0%22%20width%2264%22%20height%2264%22%20rx%2232%22%2F%3E%3Ctext%20fill%22%23ccc%22%20font-family%22sans-serif%22%20font-size%2224%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EU%3C%2Ftext%3E%3C%2Fsvg%3E'
const defaultIcon = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%2264%22%20height%2264%22%20viewBox%220%200%2064%2064%22%3E%3Crect%20fill%22%23ffe0e0%22%20width%2264%22%20height%2264%22%20rx%2216%22%2F%3E%3Ctext%20fill%22%23ff6b6b%22%20font-family%22sans-serif%22%20font-size%2228%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EFC%3C%2Ftext%3E%3C%2Fsvg%3E'

async function fetchCircle() {
  loading.value = true
  try {
    const id = route.params.id
    const res = await getStar(id)
    circle.value = res.data || res
  } catch (e) {
    console.error('获取粉丝圈详情失败', e)
  } finally {
    loading.value = false
  }
}

async function fetchPosts() {
  postsLoading.value = true
  try {
    const res = await getPosts({ star_id: route.params.id })
    posts.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取帖子列表失败', e)
  } finally {
    postsLoading.value = false
  }
}

async function fetchPhotos() {
  photosLoading.value = true
  try {
    const res = await api.get(`/fan-circles/${route.params.id}/photos`)
    photos.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取照片墙失败', e)
  } finally {
    photosLoading.value = false
  }
}

function previewPhoto(photo) {
  previewUrl.value = photo.image || photo.url || photo
  previewVisible.value = true
}

function goPost(id) {
  router.push(`/posts/${id}`)
}

function formatNumber(num) {
  if (num == null) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function formatTime(time) {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString()
}

watch(activeTab, (tab) => {
  if (tab === 'posts' && posts.value.length === 0) fetchPosts()
  if (tab === 'photos' && photos.value.length === 0) fetchPhotos()
})

onMounted(() => {
  fetchCircle()
})
</script>

<style scoped>
.fan-circle-detail {
  max-width: 700px;
  margin: 0 auto;
}

/* 粉丝圈信息卡片 */
.fan-circle-detail-header {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.fan-circle-detail-icon {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg);
}

.fan-circle-detail-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fan-circle-detail-info {
  flex: 1;
  min-width: 0;
}

.fan-circle-detail-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.fan-circle-detail-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.fan-circle-detail-stats {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

/* Tab 内容区 */
.fan-circle-detail-tab-content {
  margin-top: 12px;
}

/* 照片墙 - 4列网格 */
.photo-wall {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.photo-wall-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--bg);
}

.photo-wall-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.photo-wall-item:hover img {
  transform: scale(1.08);
  opacity: 0.85;
}

.photo-wall-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  transition: background 0.3s ease;
  pointer-events: none;
}

.photo-wall-item:hover::after {
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 600px) {
  .photo-wall {
    grid-template-columns: repeat(3, 1fr);
  }

  .fan-circle-detail-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .fan-circle-detail-stats {
    justify-content: center;
  }
}
</style>
