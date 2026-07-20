<template>
  <div class="home-view">
    <!-- 顶部 Tab 切换 -->
    <div class="tabs">
      <div
        class="tab"
        :class="{ active: activeTab === 'recommend' }"
        @click="switchTab('recommend')"
      >
        推荐
      </div>
      <div
        class="tab"
        :class="{ active: activeTab === 'following' }"
        @click="switchTab('following')"
      >
        关注
      </div>
    </div>

    <!-- 推荐页 -->
    <div v-if="activeTab === 'recommend'">
      <!-- 加载骨架屏 -->
      <template v-if="loading && posts.length === 0">
        <div class="skeleton-card" v-for="i in 3" :key="'sk-rec-' + i">
          <div class="skeleton-header">
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton-info">
              <div class="skeleton skeleton-text" style="width: 120px"></div>
              <div class="skeleton skeleton-text" style="width: 80px; height: 12px"></div>
            </div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 85%"></div>
            <div class="skeleton skeleton-text" style="width: 60%"></div>
          </div>
          <div class="skeleton-actions">
            <div class="skeleton skeleton-text" style="width: 60px"></div>
            <div class="skeleton skeleton-text" style="width: 60px"></div>
            <div class="skeleton skeleton-text" style="width: 60px"></div>
          </div>
        </div>
      </template>

      <!-- 帖子列表 -->
      <template v-else-if="posts.length > 0">
        <div
          class="post-card"
          v-for="post in posts"
          :key="post.id"
          @click="goPost(post.id)"
        >
          <!-- 帖子头部 -->
          <div class="post-header">
            <img
              :src="post.author?.avatar || defaultAvatar"
              alt="avatar"
              class="post-avatar"
              @click.stop="goProfile(post.author?.id)"
            />
            <div class="post-user-info">
              <div class="post-username">{{ post.author?.username || '匿名用户' }}</div>
              <div class="post-meta">{{ formatTime(post.created_at) }}</div>
            </div>
          </div>

          <!-- 正文 -->
          <div class="post-body post-body-clamp">
            {{ post.content }}
          </div>

          <!-- 图片网格 -->
          <div class="post-images" v-if="post.images && post.images.length">
            <div
              class="post-images-grid"
              :class="imageGridClass(post.images.length)"
            >
              <img
                v-for="(img, idx) in post.images.slice(0, 9)"
                :key="idx"
                :src="img.url || img"
                alt="post-image"
                class="post-image"
                @click.stop
              />
            </div>
          </div>

          <!-- 互动栏 -->
          <div class="post-actions" @click.stop>
            <div
              class="post-action-btn"
              :class="{ active: likedSet.has(post.id) || post.is_liked }"
              @click="toggleLike(post)"
            >
              <span class="like-icon">{{ likedSet.has(post.id) || post.is_liked ? '♥' : '♡' }}</span>
              <span>{{ (post.likes_count || 0) + (likedSet.has(post.id) && !post.is_liked ? 1 : 0) }}</span>
            </div>
            <div class="post-action-btn" @click="goPost(post.id)">
              <span>💬</span>
              <span>{{ post.comments_count || 0 }}</span>
            </div>
            <div
              class="post-action-btn"
              :class="{ active: collectedSet.has(post.id) || post.is_collected }"
              @click="toggleCollect(post)"
            >
              <span>{{ collectedSet.has(post.id) || post.is_collected ? '★' : '☆' }}</span>
              <span>{{ (post.collects_count || 0) + (collectedSet.has(post.id) && !post.is_collected ? 1 : 0) }}</span>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
        </div>

        <div v-if="noMore && posts.length > 0" class="load-more-tip">
          没有更多了
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">暂无内容</div>
        <div class="empty-state-desc">快去发布你的第一条动态吧</div>
      </div>
    </div>

    <!-- 关注页 -->
    <div v-if="activeTab === 'following'">
      <!-- 加载骨架屏 -->
      <template v-if="feedLoading && feedPosts.length === 0">
        <div class="skeleton-card" v-for="i in 3" :key="'sk-feed-' + i">
          <div class="skeleton-header">
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton-info">
              <div class="skeleton skeleton-text" style="width: 120px"></div>
              <div class="skeleton skeleton-text" style="width: 80px; height: 12px"></div>
            </div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 85%"></div>
          </div>
        </div>
      </template>

      <!-- 关注动态列表 -->
      <template v-else-if="feedPosts.length > 0">
        <div
          class="post-card"
          v-for="post in feedPosts"
          :key="'feed-' + post.id"
          @click="goPost(post.id)"
        >
          <div class="post-header">
            <img
              :src="post.author?.avatar || defaultAvatar"
              alt="avatar"
              class="post-avatar"
              @click.stop="goProfile(post.author?.id)"
            />
            <div class="post-user-info">
              <div class="post-username">{{ post.author?.username || '匿名用户' }}</div>
              <div class="post-meta">{{ formatTime(post.created_at) }}</div>
            </div>
          </div>

          <div class="post-body post-body-clamp">
            {{ post.content }}
          </div>

          <div class="post-images" v-if="post.images && post.images.length">
            <div
              class="post-images-grid"
              :class="imageGridClass(post.images.length)"
            >
              <img
                v-for="(img, idx) in post.images.slice(0, 9)"
                :key="idx"
                :src="img.url || img"
                alt="post-image"
                class="post-image"
                @click.stop
              />
            </div>
          </div>

          <div class="post-actions" @click.stop>
            <div
              class="post-action-btn"
              :class="{ active: likedSet.has(post.id) || post.is_liked }"
              @click="toggleLike(post)"
            >
              <span class="like-icon">{{ likedSet.has(post.id) || post.is_liked ? '♥' : '♡' }}</span>
              <span>{{ (post.likes_count || 0) + (likedSet.has(post.id) && !post.is_liked ? 1 : 0) }}</span>
            </div>
            <div class="post-action-btn" @click="goPost(post.id)">
              <span>💬</span>
              <span>{{ post.comments_count || 0 }}</span>
            </div>
            <div
              class="post-action-btn"
              :class="{ active: collectedSet.has(post.id) || post.is_collected }"
              @click="toggleCollect(post)"
            >
              <span>{{ collectedSet.has(post.id) || post.is_collected ? '★' : '☆' }}</span>
              <span>{{ (post.collects_count || 0) + (collectedSet.has(post.id) && !post.is_collected ? 1 : 0) }}</span>
            </div>
          </div>
        </div>

        <div v-if="feedLoading" class="loading-spinner">
          <div class="spinner"></div>
        </div>

        <div v-if="feedNoMore && feedPosts.length > 0" class="load-more-tip">
          没有更多了
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">暂无动态，去关注一些用户吧</div>
        <div class="empty-state-desc">关注你感兴趣的明星和用户，获取最新动态</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRecommended, getPosts, likePost, collectPost } from '@/api/modules/posts'
import { getFeed } from '@/api/modules/social'

const router = useRouter()
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlOGU4ZTgiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjYmNiY2JjIi8+PGVsbGlwc2UgY3g9IjIwIiBjeT0iMzMiIHJ4PSIxMiIgcnk9IjkiIGZpbGw9IiNiY2JjYmMiLz48L3N2Zz4='

// Tab 状态
const activeTab = ref('recommend')

// 推荐页状态
const posts = ref([])
const loading = ref(false)
const noMore = ref(false)
const recPage = ref(1)

// 关注页状态
const feedPosts = ref([])
const feedLoading = ref(false)
const feedNoMore = ref(false)
const feedPage = ref(1)

// 本地点赞/收藏状态
const likedSet = ref(new Set())
const collectedSet = ref(new Set())

// 格式化时间
function formatTime(timeStr) {
  if (!timeStr) return ''
  const now = Date.now()
  const time = new Date(timeStr).getTime()
  const diff = Math.floor((now - time) / 1000)

  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 604800) return Math.floor(diff / 86400) + '天前'

  const date = new Date(timeStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (date.getFullYear() === new Date().getFullYear()) {
    return `${month}-${day}`
  }
  return `${date.getFullYear()}-${month}-${day}`
}

// 图片网格 class
function imageGridClass(count) {
  if (count === 1) return 'grid-1'
  if (count <= 3) return 'grid-2'
  return 'grid-3'
}

// 切换 Tab
function switchTab(tab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  if (tab === 'following' && feedPosts.value.length === 0) {
    fetchFeed()
  }
}

// 加载推荐帖子
async function fetchRecommended() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const [recommendedRes, latestRes] = await Promise.allSettled([
      recPage.value === 1 ? getRecommended({ page: 1, page_size: 10 }) : Promise.resolve(null),
      getPosts({ page: recPage.value, page_size: 10 })
    ])

    let newPosts = []

    // 首页优先用推荐，后续用最新
    if (recPage.value === 1 && recommendedRes.status === 'fulfilled' && recommendedRes.value) {
      const data = recommendedRes.value
      newPosts = data.results || data.data || data.list || data || []
    }

    if (!newPosts.length && latestRes.status === 'fulfilled' && latestRes.value) {
      const data = latestRes.value
      newPosts = data.results || data.data || data.list || data || []
    }

    if (Array.isArray(newPosts) && newPosts.length > 0) {
      posts.value.push(...newPosts)
      recPage.value++
    } else {
      noMore.value = true
    }
  } catch (e) {
    console.error('获取推荐帖子失败:', e)
  } finally {
    loading.value = false
  }
}

// 加载关注动态
async function fetchFeed() {
  if (feedLoading.value || feedNoMore.value) return
  feedLoading.value = true
  try {
    const res = await getFeed({ page: feedPage.value, page_size: 10 })
    const data = res.results || res.data || res.list || res || []
    if (Array.isArray(data) && data.length > 0) {
      feedPosts.value.push(...data)
      feedPage.value++
    } else {
      feedNoMore.value = true
    }
  } catch (e) {
    console.error('获取关注动态失败:', e)
  } finally {
    feedLoading.value = false
  }
}

// 点赞
async function toggleLike(post) {
  const id = post.id
  if (likedSet.value.has(id)) {
    likedSet.value.delete(id)
  } else {
    likedSet.value.add(id)
    try {
      await likePost(id)
    } catch (e) {
      likedSet.value.delete(id)
      console.error('点赞失败:', e)
    }
  }
}

// 收藏
async function toggleCollect(post) {
  const id = post.id
  if (collectedSet.value.has(id)) {
    collectedSet.value.delete(id)
  } else {
    collectedSet.value.add(id)
    try {
      await collectPost(id)
    } catch (e) {
      collectedSet.value.delete(id)
      console.error('收藏失败:', e)
    }
  }
}

// 跳转帖子详情
function goPost(id) {
  router.push(`/posts/${id}`)
}

// 跳转用户主页
function goProfile(id) {
  if (id) router.push(`/profile/${id}`)
}

// 滚动加载
function handleScroll() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
  const clientHeight = document.documentElement.clientHeight || window.innerHeight

  if (scrollTop + clientHeight >= scrollHeight - 200) {
    if (activeTab.value === 'recommend') {
      fetchRecommended()
    } else {
      fetchFeed()
    }
  }
}

onMounted(() => {
  fetchRecommended()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.home-view {
  max-width: 800px;
  margin: 0 auto;
}

/* Tab 样式 */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--radius) var(--radius) 0 0;
  box-shadow: var(--shadow);
  margin-bottom: 12px;
  position: sticky;
  top: var(--topbar-height);
  z-index: 80;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  user-select: none;
}

.tab:hover {
  color: var(--text);
  background: var(--bg);
}

.tab.active {
  color: var(--primary);
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
}

/* 帖子正文截断 */
.post-body-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 图片样式 */
.post-images-grid {
  display: grid;
  gap: 4px;
  border-radius: var(--radius);
  overflow: hidden;
}

.post-images-grid.grid-1 {
  grid-template-columns: 1fr;
  max-width: 400px;
}

.post-images-grid.grid-2 {
  grid-template-columns: 1fr 1fr;
  max-width: 500px;
}

.post-images-grid.grid-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.post-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  cursor: pointer;
  transition: var(--transition);
}

.post-image:hover {
  opacity: 0.9;
}

/* 骨架屏卡片 */
.skeleton-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 12px;
  padding: 16px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.skeleton-info {
  flex: 1;
}

.skeleton-body {
  margin-bottom: 14px;
}

.skeleton-actions {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

/* 点赞红心 */
.like-icon {
  font-size: 16px;
}

.post-action-btn.active .like-icon {
  color: var(--primary);
}

/* 加载更多提示 */
.load-more-tip {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: var(--text-light);
}
</style>
