<template>
  <div class="page-content">
    <div class="star-detail">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <template v-else-if="star">
        <!-- 顶部大封面图 -->
        <div class="star-detail-banner">
          <div class="star-detail-banner-bg">
            <img
              :src="star.cover || star.avatar || defaultCover"
              :alt="star.name"
            />
          </div>
          <div class="star-detail-banner-blur"></div>
        </div>

        <!-- 明星信息 -->
        <div class="star-detail-info card">
          <div class="star-detail-avatar">
            <img
              :src="star.avatar || defaultAvatar"
              :alt="star.name"
              class="star-avatar"
            />
          </div>
          <div class="star-detail-text">
            <h1 class="star-name">{{ star.name }}</h1>
            <p v-if="star.bio" class="star-desc">{{ star.bio }}</p>
            <div class="star-stats">
              <div class="star-stat">
                <strong>{{ formatNumber(star.fans_count) }}</strong> 粉丝
              </div>
              <div class="star-stat">
                <strong>{{ formatNumber(star.posts_count) }}</strong> 帖子
              </div>
            </div>
          </div>
          <div class="star-detail-actions">
            <button
              class="btn btn-follow"
              :class="{ following: star.is_followed }"
              @click="handleFollow"
            >
              {{ star.is_followed ? '已关注' : '+ 关注' }}
            </button>
            <button class="btn btn-outline btn-sm" @click="handleApplyFan">
              申请粉丝
            </button>
          </div>
        </div>

        <!-- 签到区域 -->
        <div class="checkin-card">
          <div class="checkin-title">每日签到</div>
          <div class="checkin-desc">
            {{ checkedIn ? '今日已签到，连续签到可获得更多积分' : '每日签到，为爱豆打call' }}
          </div>
          <button
            class="checkin-btn"
            :class="{ done: checkedIn }"
            :disabled="checkedIn || checking"
            @click="handleCheckin"
          >
            {{ checking ? '签到中...' : (checkedIn ? '已签到' : '立即签到') }}
          </button>
          <div v-if="star.checkin_streak" class="checkin-streak">
            <div
              v-for="day in 7"
              :key="day"
              class="checkin-day"
              :class="{ checked: day <= star.checkin_streak }"
            >
              {{ day }}
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
            帖子
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'fans' }"
            @click="activeTab = 'fans'"
          >
            粉丝
          </div>
        </div>

        <!-- 帖子 Tab -->
        <div v-if="activeTab === 'posts'" class="star-detail-tab-content">
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
            <div class="empty-state-title">暂无帖子</div>
            <div class="empty-state-desc">还没有人发布帖子</div>
          </div>
        </div>

        <!-- 粉丝 Tab -->
        <div v-if="activeTab === 'fans'" class="star-detail-tab-content">
          <div v-if="fansLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>
          <template v-else-if="fans.length">
            <div
              v-for="fan in fans"
              :key="fan.id"
              class="star-fan-item card"
            >
              <img
                :src="fan.avatar || defaultAvatar"
                :alt="fan.username || fan.nickname"
                class="post-avatar"
              />
              <div class="star-fan-info">
                <div class="post-username">{{ fan.username || fan.nickname }}</div>
                <div class="post-meta">{{ fan.fan_level || '粉丝' }}</div>
              </div>
            </div>
          </template>
          <div v-else class="empty-state">
            <div class="empty-state-icon">&#128101;</div>
            <div class="empty-state-title">暂无粉丝</div>
            <div class="empty-state-desc">成为第一个粉丝吧</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getStar,
  getStarFans,
  followStar,
  applyFan,
  checkin,
  getCheckinStatus
} from '@/api/modules/stars'
import { getPosts } from '@/api/modules/posts'

const route = useRoute()
const router = useRouter()

const star = ref(null)
const loading = ref(false)
const posts = ref([])
const postsLoading = ref(false)
const fans = ref([])
const fansLoading = ref(false)
const activeTab = ref('posts')
const checkedIn = ref(false)
const checking = ref(false)

const defaultAvatar = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%2264%22%20height%2264%22%20viewBox%220%200%2064%2064%22%3E%3Crect%20fill%22%23f0f0f0%22%20width%2264%22%20height%2264%22%20rx%2232%22%2F%3E%3Ctext%20fill%22%23ccc%22%20font-family%22sans-serif%22%20font-size%2224%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EU%3C%2Ftext%3E%3C%2Fsvg%3E'
const defaultCover = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%22800%22%20height%22300%22%20viewBox%220%200%20800%20300%22%3E%3Crect%20fill%22%23e8e8e8%22%20width%22800%22%20height%22300%22%2F%3E%3Ctext%20fill%22%23ccc%22%20font-family%22sans-serif%22%20font-size%2236%22%20x%2250%25%22%20y%2250%25%22%20text-anchor%22middle%22%20dy%22.3em%22%3EBanner%3C%2Ftext%3E%3C%2Fsvg%3E'

async function fetchStar() {
  loading.value = true
  try {
    const id = route.params.id
    const res = await getStar(id)
    star.value = res.data || res
  } catch (e) {
    console.error('获取明星详情失败', e)
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

async function fetchFans() {
  fansLoading.value = true
  try {
    const res = await getStarFans(route.params.id)
    fans.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取粉丝列表失败', e)
  } finally {
    fansLoading.value = false
  }
}

async function fetchCheckinStatus() {
  try {
    const res = await getCheckinStatus(route.params.id)
    checkedIn.value = res.data?.checked_in ?? res.checked_in ?? false
  } catch {
    checkedIn.value = false
  }
}

async function handleFollow() {
  if (!star.value) return
  try {
    await followStar(star.value.id)
    star.value.is_followed = !star.value.is_followed
    if (star.value.is_followed) {
      star.value.fans_count = (star.value.fans_count || 0) + 1
    } else {
      star.value.fans_count = Math.max(0, (star.value.fans_count || 0) - 1)
    }
  } catch (e) {
    console.error('关注操作失败', e)
  }
}

async function handleApplyFan() {
  if (!star.value) return
  try {
    await applyFan(star.value.id)
    alert('申请已提交')
  } catch (e) {
    console.error('申请粉丝失败', e)
  }
}

async function handleCheckin() {
  if (checkedIn.value || checking.value) return
  checking.value = true
  try {
    await checkin(route.params.id)
    checkedIn.value = true
  } catch (e) {
    console.error('签到失败', e)
  } finally {
    checking.value = false
  }
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
  if (tab === 'fans' && fans.value.length === 0) fetchFans()
})

onMounted(() => {
  fetchStar()
  fetchCheckinStatus()
})
</script>

<style scoped>
.star-detail {
  max-width: 700px;
  margin: 0 auto;
}

/* 封面图 */
.star-detail-banner {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.star-detail-banner-bg {
  width: 100%;
  height: 100%;
}

.star-detail-banner-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.star-detail-banner-blur {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.2);
}

/* 明星信息卡片 */
.star-detail-info {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
}

.star-detail-avatar {
  flex-shrink: 0;
}

.star-detail-avatar .star-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--card);
  box-shadow: var(--shadow);
}

.star-detail-text {
  flex: 1;
  min-width: 200px;
}

.star-detail-text .star-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.star-detail-text .star-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.star-detail-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

/* 粉丝列表项 */
.star-fan-item {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: var(--transition);
}

.star-fan-item:hover {
  box-shadow: var(--shadow-hover);
}

.star-fan-info {
  flex: 1;
  min-width: 0;
}

/* Tab 内容区 */
.star-detail-tab-content {
  margin-top: 12px;
}
</style>
