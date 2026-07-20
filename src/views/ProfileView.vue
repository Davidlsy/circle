<template>
  <div class="profile-view">
    <!-- 加载骨架屏 -->
    <template v-if="pageLoading">
      <div class="profile-header">
        <div class="skeleton" style="width: 100%; height: 160px; border-radius: 0"></div>
        <div class="profile-info-section">
          <div class="skeleton" style="width: 80px; height: 80px; border-radius: 50%; position: absolute; top: -40px; left: 20px"></div>
          <div style="padding-top: 48px">
            <div class="skeleton skeleton-text" style="width: 120px"></div>
            <div class="skeleton skeleton-text" style="width: 200px; margin-top: 8px"></div>
            <div style="display: flex; gap: 24px; margin-top: 12px">
              <div class="skeleton skeleton-text" style="width: 60px; height: 12px"></div>
              <div class="skeleton skeleton-text" style="width: 60px; height: 12px"></div>
              <div class="skeleton skeleton-text" style="width: 60px; height: 12px"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 用户信息区域 -->
    <template v-else-if="profileUser">
      <div class="profile-header">
        <!-- 背景横幅 -->
        <div class="profile-banner"></div>

        <div class="profile-info-section">
          <!-- 大头像 -->
          <div class="profile-avatar-wrapper">
            <img
              v-if="profileUser.avatar"
              :src="profileUser.avatar"
              alt="avatar"
              class="profile-avatar"
            />
            <div v-else class="profile-avatar profile-avatar-placeholder">
              {{ (profileUser.nickname || profileUser.username || '?')[0] }}
            </div>
          </div>

          <!-- 用户信息 -->
          <div class="profile-info">
            <div class="profile-name-row">
              <h2 class="profile-username">{{ profileUser.username || '匿名用户' }}</h2>
              <span v-if="profileUser.nickname && profileUser.nickname !== profileUser.username" class="profile-nickname">
                @{{ profileUser.nickname }}
              </span>
            </div>

            <p v-if="profileUser.bio" class="profile-bio">{{ profileUser.bio }}</p>

            <!-- 统计数据 -->
            <div class="profile-stats">
              <div class="profile-stat">
                <strong>{{ profileUser.posts_count || userPosts.length }}</strong>
                <span>帖子</span>
              </div>
              <div class="profile-stat">
                <strong>{{ profileUser.followers_count || 0 }}</strong>
                <span>粉丝</span>
              </div>
              <div class="profile-stat">
                <strong>{{ profileUser.following_count || 0 }}</strong>
                <span>关注</span>
              </div>
            </div>

            <!-- 注册时间 -->
            <div v-if="profileUser.created_at" class="profile-joined">
              {{ formatDate(profileUser.created_at) }} 加入
            </div>

            <!-- 操作按钮 -->
            <div class="profile-actions">
              <!-- 自己的主页：编辑资料 -->
              <template v-if="isSelf">
                <button
                  v-if="!isEditing"
                  class="btn btn-outline"
                  @click="startEdit"
                >
                  编辑资料
                </button>
              </template>
              <!-- 他人主页：关注/取消关注 -->
              <template v-else>
                <button
                  class="btn-follow"
                  :class="{ following: isFollowing }"
                  @click="toggleFollow"
                :disabled="followLoading"
                >
                  {{ isFollowing ? '已关注' : '关注' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑资料表单 -->
      <div v-if="isEditing" class="edit-panel">
        <h3 class="edit-title">编辑资料</h3>
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input
            v-model="editForm.nickname"
            class="form-input"
            type="text"
            placeholder="请输入昵称"
            maxlength="30"
          />
        </div>
        <div class="form-group">
          <label class="form-label">简介</label>
          <textarea
            v-model="editForm.bio"
            class="form-textarea"
            placeholder="介绍一下自己吧"
            maxlength="200"
            rows="4"
          ></textarea>
        </div>
        <div class="edit-actions">
          <button class="btn btn-ghost" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" :disabled="saveLoading" @click="saveProfile">
            {{ saveLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="tab-bar">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'posts' }"
          @click="switchTab('posts')"
        >
          帖子
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'following' }"
          @click="switchTab('following')"
        >
          关注
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'followers' }"
          @click="switchTab('followers')"
        >
          粉丝
        </div>
      </div>

      <!-- 帖子 Tab -->
      <div v-if="activeTab === 'posts'" class="tab-content">
        <!-- 加载骨架屏 -->
        <template v-if="postsLoading && userPosts.length === 0">
          <div class="skeleton-card" v-for="i in 3" :key="'sk-post-' + i">
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
            <div class="skeleton-actions">
              <div class="skeleton skeleton-text" style="width: 60px"></div>
              <div class="skeleton skeleton-text" style="width: 60px"></div>
            </div>
          </div>
        </template>

        <!-- 帖子列表 -->
        <template v-else-if="userPosts.length > 0">
          <div
            class="post-card"
            v-for="post in userPosts"
            :key="post.id"
            @click="goPost(post.id)"
          >
            <div class="post-header">
              <img
                :src="post.author?.avatar || profileUser.avatar || defaultAvatar"
                alt="avatar"
                class="post-avatar"
              />
              <div class="post-user-info">
                <div class="post-username">{{ post.author?.username || profileUser.username || '匿名用户' }}</div>
                <div class="post-meta">{{ formatTime(post.created_at) }}</div>
              </div>
            </div>

            <div class="post-body post-body-clamp">
              {{ post.content }}
            </div>

            <!-- 图片 -->
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

            <!-- 互动栏（简化版：只显示点赞和收藏数） -->
            <div class="post-actions" @click.stop>
              <div class="post-action-btn">
                <span class="like-icon">{{ post.is_liked ? '♥' : '♡' }}</span>
                <span>{{ post.likes_count || 0 }}</span>
              </div>
              <div class="post-action-btn">
                <span>💬</span>
                <span>{{ post.comments_count || 0 }}</span>
              </div>
              <div class="post-action-btn">
                <span>{{ post.is_collected ? '★' : '☆' }}</span>
                <span>{{ post.collects_count || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="postsLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>

          <div v-if="postsNoMore && userPosts.length > 0" class="load-more-tip">
            没有更多了
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">暂无帖子</div>
          <div class="empty-state-desc">{{ isSelf ? '快去发布你的第一条动态吧' : '该用户还没有发布帖子' }}</div>
        </div>
      </div>

      <!-- 关注 Tab -->
      <div v-if="activeTab === 'following'" class="tab-content">
        <!-- 加载骨架屏 -->
        <template v-if="followingLoading && followingList.length === 0">
          <div class="user-item-skeleton" v-for="i in 5" :key="'sk-flg-' + i">
            <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0"></div>
            <div style="flex: 1">
              <div class="skeleton skeleton-text" style="width: 100px"></div>
              <div class="skeleton skeleton-text" style="width: 160px; height: 12px; margin-top: 6px"></div>
            </div>
            <div class="skeleton" style="width: 64px; height: 32px; border-radius: 16px"></div>
          </div>
        </template>

        <!-- 关注列表 -->
        <template v-else-if="followingList.length > 0">
          <div
            class="user-item"
            v-for="user in followingList"
            :key="'following-' + user.id"
            @click="goProfile(user.id)"
          >
            <img
              v-if="user.avatar"
              :src="user.avatar"
              alt="avatar"
              class="user-item-avatar"
            />
            <div v-else class="user-item-avatar user-item-avatar-placeholder">
              {{ (user.nickname || user.username || '?')[0] }}
            </div>
            <div class="user-item-info">
              <div class="user-item-name">{{ user.username || '匿名用户' }}</div>
              <div class="user-item-bio" v-if="user.bio">{{ user.bio }}</div>
              <div class="user-item-stat" v-if="user.followers_count !== undefined">
                {{ user.followers_count }} 粉丝
              </div>
            </div>
            <button
              class="btn-follow"
              :class="{ following: user.is_following }"
              @click.stop="toggleFollowUser(user)"
              :disabled="user._followLoading"
            >
              {{ user.is_following ? '已关注' : '关注' }}
            </button>
          </div>

          <div v-if="followingLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>

          <div v-if="followingNoMore && followingList.length > 0" class="load-more-tip">
            没有更多了
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">👤</div>
          <div class="empty-state-title">暂无关注</div>
          <div class="empty-state-desc">{{ isSelf ? '去关注你感兴趣的用户吧' : '该用户还没有关注任何人' }}</div>
        </div>
      </div>

      <!-- 粉丝 Tab -->
      <div v-if="activeTab === 'followers'" class="tab-content">
        <!-- 加载骨架屏 -->
        <template v-if="followersLoading && followersList.length === 0">
          <div class="user-item-skeleton" v-for="i in 5" :key="'sk-flw-' + i">
            <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0"></div>
            <div style="flex: 1">
              <div class="skeleton skeleton-text" style="width: 100px"></div>
              <div class="skeleton skeleton-text" style="width: 160px; height: 12px; margin-top: 6px"></div>
            </div>
            <div class="skeleton" style="width: 64px; height: 32px; border-radius: 16px"></div>
          </div>
        </template>

        <!-- 粉丝列表 -->
        <template v-else-if="followersList.length > 0">
          <div
            class="user-item"
            v-for="user in followersList"
            :key="'follower-' + user.id"
            @click="goProfile(user.id)"
          >
            <img
              v-if="user.avatar"
              :src="user.avatar"
              alt="avatar"
              class="user-item-avatar"
            />
            <div v-else class="user-item-avatar user-item-avatar-placeholder">
              {{ (user.nickname || user.username || '?')[0] }}
            </div>
            <div class="user-item-info">
              <div class="user-item-name">{{ user.username || '匿名用户' }}</div>
              <div class="user-item-bio" v-if="user.bio">{{ user.bio }}</div>
              <div class="user-item-stat" v-if="user.followers_count !== undefined">
                {{ user.followers_count }} 粉丝
              </div>
            </div>
            <button
              class="btn-follow"
              :class="{ following: user.is_following }"
              @click.stop="toggleFollowUser(user)"
              :disabled="user._followLoading"
            >
              {{ user.is_following ? '已关注' : '关注' }}
            </button>
          </div>

          <div v-if="followersLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>

          <div v-if="followersNoMore && followersList.length > 0" class="load-more-tip">
            没有更多了
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">暂无粉丝</div>
          <div class="empty-state-desc">{{ isSelf ? '发布优质内容来吸引粉丝吧' : '该用户还没有粉丝' }}</div>
        </div>
      </div>
    </template>

    <!-- 未找到用户 -->
    <div v-else-if="!pageLoading" class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">用户不存在</div>
      <div class="empty-state-desc">该用户可能已被删除或不存在</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserProfile, getFollowers, getFollowing, followUser, unfollowUser } from '@/api/modules/social'
import { getPosts } from '@/api/modules/posts'
import api from '@/api/index'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlOGU4ZTgiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjYmNiY2JjIi8+PGVsbGlwc2UgY3g9IjIwIiBjeT0iMzMiIHJ4PSIxMiIgcnk9IjkiIGZpbGw9IiNiY2JjYmMiLz48L3N2Zz4='

// ---------- 状态 ----------
const pageLoading = ref(true)
const profileUser = ref(null)

// 当前查看的用户 ID（没有则为当前用户）
const viewUserId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})

// 是否是自己的主页
const isSelf = computed(() => {
  if (!viewUserId.value) return true
  return userStore.user && String(userStore.user.id) === String(viewUserId.value)
})

// ---------- Tab ----------
const activeTab = ref('posts')

// ---------- 帖子 ----------
const userPosts = ref([])
const postsLoading = ref(false)
const postsNoMore = ref(false)
const postsPage = ref(1)

// ---------- 关注列表 ----------
const followingList = ref([])
const followingLoading = ref(false)
const followingNoMore = ref(false)
const followingPage = ref(1)

// ---------- 粉丝列表 ----------
const followersList = ref([])
const followersLoading = ref(false)
const followersNoMore = ref(false)
const followersPage = ref(1)

// ---------- 关注状态 ----------
const isFollowing = ref(false)
const followLoading = ref(false)

// ---------- 编辑资料 ----------
const isEditing = ref(false)
const editForm = ref({
  nickname: '',
  bio: ''
})
const saveLoading = ref(false)

// ---------- 工具函数 ----------

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

function formatDate(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function imageGridClass(count) {
  if (count === 1) return 'grid-1'
  if (count <= 3) return 'grid-2'
  return 'grid-3'
}

// ---------- 加载用户资料 ----------

async function loadProfile() {
  pageLoading.value = true
  activeTab.value = 'posts'
  resetAllData()

  try {
    if (isSelf.value) {
      // 自己的主页，使用 store 中的数据或重新获取
      if (!userStore.user) {
        await userStore.fetchProfile()
      }
      profileUser.value = userStore.user
    } else {
      // 他人主页
      const data = await getUserProfile(viewUserId.value)
      profileUser.value = data
      isFollowing.value = !!data.is_following
    }
  } catch (e) {
    console.error('获取用户资料失败:', e)
    profileUser.value = null
  } finally {
    pageLoading.value = false
  }

  // 加载帖子
  fetchPosts()
}

function resetAllData() {
  userPosts.value = []
  postsPage.value = 1
  postsNoMore.value = false
  followingList.value = []
  followingPage.value = 1
  followingNoMore.value = false
  followersList.value = []
  followersPage.value = 1
  followersNoMore.value = false
  isFollowing.value = false
  isEditing.value = false
}

// ---------- 加载帖子 ----------

async function fetchPosts() {
  if (postsLoading.value || postsNoMore.value) return
  postsLoading.value = true
  try {
    const targetId = isSelf.value ? (userStore.user?.id) : viewUserId.value
    const params = { page: postsPage.value, page_size: 10 }
    if (targetId) params.author_id = targetId

    const res = await getPosts(params)
    const data = res.results || res.data || res.list || res || []
    if (Array.isArray(data) && data.length > 0) {
      userPosts.value.push(...data)
      postsPage.value++
    } else {
      postsNoMore.value = true
    }
  } catch (e) {
    console.error('获取用户帖子失败:', e)
  } finally {
    postsLoading.value = false
  }
}

// ---------- 加载关注列表 ----------

async function fetchFollowing() {
  if (followingLoading.value || followingNoMore.value) return
  followingLoading.value = true
  try {
    const targetId = isSelf.value ? (userStore.user?.id) : viewUserId.value
    const res = await getFollowing(targetId, { page: followingPage.value, page_size: 20 })
    const data = res.results || res.data || res.list || res || []
    if (Array.isArray(data) && data.length > 0) {
      followingList.value.push(...data)
      followingPage.value++
    } else {
      followingNoMore.value = true
    }
  } catch (e) {
    console.error('获取关注列表失败:', e)
  } finally {
    followingLoading.value = false
  }
}

// ---------- 加载粉丝列表 ----------

async function fetchFollowers() {
  if (followersLoading.value || followersNoMore.value) return
  followersLoading.value = true
  try {
    const targetId = isSelf.value ? (userStore.user?.id) : viewUserId.value
    const res = await getFollowers(targetId, { page: followersPage.value, page_size: 20 })
    const data = res.results || res.data || res.list || res || []
    if (Array.isArray(data) && data.length > 0) {
      followersList.value.push(...data)
      followersPage.value++
    } else {
      followersNoMore.value = true
    }
  } catch (e) {
    console.error('获取粉丝列表失败:', e)
  } finally {
    followersLoading.value = false
  }
}

// ---------- Tab 切换 ----------

function switchTab(tab) {
  if (activeTab.value === tab) return
  activeTab.value = tab

  if (tab === 'posts' && userPosts.value.length === 0) {
    fetchPosts()
  } else if (tab === 'following' && followingList.value.length === 0) {
    fetchFollowing()
  } else if (tab === 'followers' && followersList.value.length === 0) {
    fetchFollowers()
  }
}

// ---------- 关注/取消关注（主页头部） ----------

async function toggleFollow() {
  if (!viewUserId.value || followLoading.value) return
  followLoading.value = true
  try {
    if (isFollowing.value) {
      await unfollowUser(viewUserId.value)
      isFollowing.value = false
      // 更新粉丝数
      if (profileUser.value) {
        profileUser.value.followers_count = Math.max(0, (profileUser.value.followers_count || 1) - 1)
      }
    } else {
      await followUser(viewUserId.value)
      isFollowing.value = true
      if (profileUser.value) {
        profileUser.value.followers_count = (profileUser.value.followers_count || 0) + 1
      }
    }
  } catch (e) {
    console.error('关注操作失败:', e)
  } finally {
    followLoading.value = false
  }
}

// ---------- 关注/取消关注（列表中） ----------

async function toggleFollowUser(user) {
  if (user._followLoading) return
  user._followLoading = true
  try {
    if (user.is_following) {
      await unfollowUser(user.id)
      user.is_following = false
    } else {
      await followUser(user.id)
      user.is_following = true
    }
  } catch (e) {
    console.error('关注操作失败:', e)
  } finally {
    user._followLoading = false
  }
}

// ---------- 编辑资料 ----------

function startEdit() {
  editForm.value.nickname = profileUser.value.nickname || ''
  editForm.value.bio = profileUser.value.bio || ''
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

async function saveProfile() {
  if (saveLoading.value) return
  saveLoading.value = true
  try {
    const payload = {}
    if (editForm.value.nickname !== (profileUser.value.nickname || '')) {
      payload.nickname = editForm.value.nickname
    }
    if (editForm.value.bio !== (profileUser.value.bio || '')) {
      payload.bio = editForm.value.bio
    }

    if (Object.keys(payload).length === 0) {
      isEditing.value = false
      return
    }

    const data = await api.patch('/users/me', payload)
    // 更新本地数据
    if (profileUser.value) {
      Object.assign(profileUser.value, payload)
    }
    // 同步更新 store
    if (userStore.user) {
      Object.assign(userStore.user, payload)
    }
    isEditing.value = false
  } catch (e) {
    console.error('保存资料失败:', e)
  } finally {
    saveLoading.value = false
  }
}

// ---------- 跳转 ----------

function goPost(id) {
  router.push(`/posts/${id}`)
}

function goProfile(id) {
  if (id && String(id) !== String(viewUserId.value || userStore.user?.id)) {
    router.push(`/profile/${id}`)
  }
}

// ---------- 滚动加载 ----------

function handleScroll() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
  const clientHeight = document.documentElement.clientHeight || window.innerHeight

  if (scrollTop + clientHeight >= scrollHeight - 200) {
    if (activeTab.value === 'posts') {
      fetchPosts()
    } else if (activeTab.value === 'following') {
      fetchFollowing()
    } else if (activeTab.value === 'followers') {
      fetchFollowers()
    }
  }
}

// ---------- 监听路由变化 ----------

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      loadProfile()
    }
  }
)

// ---------- 生命周期 ----------

onMounted(() => {
  loadProfile()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.profile-view {
  max-width: 800px;
  margin: 0 auto;
}

/* ============================================
   用户信息区域
   ============================================ */
.profile-header {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-bottom: 16px;
}

.profile-banner {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.profile-info-section {
  padding: 20px;
  position: relative;
}

.profile-avatar-wrapper {
  margin-bottom: 12px;
  text-align: center;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--card);
  box-shadow: var(--shadow);
  background: var(--bg);
}

.profile-avatar-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-light);
}

.profile-info {
  text-align: center;
}

.profile-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-username {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.profile-nickname {
  font-size: 14px;
  color: var(--text-light);
}

.profile-bio {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 8px;
  line-height: 1.6;
  word-break: break-word;
}

/* 统计数据 */
.profile-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 16px;
}

.profile-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.profile-stat strong {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.profile-stat span {
  margin-top: 2px;
}

/* 注册时间 */
.profile-joined {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 8px;
}

/* 操作按钮 */
.profile-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* ============================================
   编辑资料面板
   ============================================ */
.edit-panel {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
  margin-bottom: 16px;
}

.edit-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 20px 0;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

/* ============================================
   Tab 栏
   ============================================ */
.tab-bar {
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

.tab-item {
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

.tab-item:hover {
  color: var(--text);
  background: var(--bg);
}

.tab-item.active {
  color: var(--primary);
  font-weight: 600;
}

.tab-item.active::after {
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

/* ============================================
   Tab 内容
   ============================================ */
.tab-content {
  min-height: 200px;
}

/* ============================================
   帖子卡片（简化版复用全局样式）
   ============================================ */
.post-body-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

/* ============================================
   用户列表项（关注/粉丝）
   ============================================ */
.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 10px;
  cursor: pointer;
  transition: var(--transition);
}

.user-item:hover {
  box-shadow: var(--shadow-hover);
}

.user-item-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg);
  flex-shrink: 0;
}

.user-item-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
}

.user-item-info {
  flex: 1;
  min-width: 0;
}

.user-item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-item-bio {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-item-stat {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

/* ============================================
   骨架屏
   ============================================ */
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

.user-item-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 10px;
}

/* ============================================
   加载状态
   ============================================ */
.load-more-tip {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: var(--text-light);
}

/* ============================================
   响应式
   ============================================ */
@media (max-width: 600px) {
  .profile-banner {
    height: 120px;
  }

  .profile-avatar {
    width: 64px;
    height: 64px;
  }

  .profile-avatar-placeholder {
    font-size: 26px;
  }

  .profile-username {
    font-size: 18px;
  }

  .profile-stats {
    gap: 20px;
  }

  .profile-stat strong {
    font-size: 16px;
  }

  .user-item {
    padding: 12px;
    gap: 10px;
  }

  .user-item-avatar {
    width: 40px;
    height: 40px;
  }

  .user-item-avatar-placeholder {
    font-size: 16px;
  }
}
</style>
