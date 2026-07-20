<template>
  <div class="post-detail-view">
    <!-- 加载骨架屏 -->
    <template v-if="postLoading">
      <div class="skeleton-card">
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
          <div class="skeleton skeleton-text" style="width: 70%"></div>
          <div class="skeleton skeleton-text" style="width: 90%"></div>
        </div>
        <div class="skeleton skeleton-image" style="height: 250px; margin-bottom: 14px"></div>
        <div class="skeleton-actions">
          <div class="skeleton skeleton-text" style="width: 60px"></div>
          <div class="skeleton skeleton-text" style="width: 60px"></div>
          <div class="skeleton skeleton-text" style="width: 60px"></div>
        </div>
      </div>

      <!-- 评论骨架屏 -->
      <div class="comment-skeleton" v-for="i in 3" :key="'sk-cmt-' + i">
        <div class="comment-skeleton-inner">
          <div class="skeleton" style="width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0"></div>
          <div style="flex: 1">
            <div class="skeleton skeleton-text" style="width: 80px; margin-bottom: 6px"></div>
            <div class="skeleton skeleton-text" style="width: 90%"></div>
            <div class="skeleton skeleton-text" style="width: 40%; height: 12px; margin-top: 6px"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 帖子内容 -->
    <template v-else-if="post">
      <div class="post-card">
        <!-- 帖子头部 -->
        <div class="post-header">
          <img
            :src="post.author?.avatar || defaultAvatar"
            alt="avatar"
            class="post-avatar"
            @click="goProfile(post.author?.id)"
          />
          <div class="post-user-info">
            <div class="post-username">{{ post.author?.username || '匿名用户' }}</div>
            <div class="post-meta">{{ formatTime(post.created_at) }}</div>
          </div>
        </div>

        <!-- 正文内容（完整显示） -->
        <div class="post-body">
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
            />
          </div>
        </div>

        <!-- 互动栏 -->
        <div class="post-actions">
          <div
            class="post-action-btn"
            :class="{ active: isLiked }"
            @click="toggleLike"
          >
            <span class="like-icon">{{ isLiked ? '♥' : '♡' }}</span>
            <span>{{ currentLikesCount }}</span>
          </div>
          <div class="post-action-btn">
            <span>💬</span>
            <span>{{ post.comments_count || comments.length }}</span>
          </div>
          <div
            class="post-action-btn"
            :class="{ active: isCollected }"
            @click="toggleCollect"
          >
            <span>{{ isCollected ? '★' : '☆' }}</span>
            <span>{{ currentCollectsCount }}</span>
          </div>
        </div>
      </div>

      <!-- 评论区 -->
      <div class="comments-card">
        <div class="comments-header">
          <span class="comments-title">评论</span>
          <span class="comments-count">{{ comments.length }}</span>
        </div>

        <!-- 评论列表 -->
        <div v-if="comments.length > 0" class="comments-list">
          <div
            class="comment-item"
            v-for="comment in comments"
            :key="comment.id"
          >
            <img
              :src="comment.author?.avatar || defaultAvatar"
              alt="avatar"
              class="comment-avatar"
            />
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-user">{{ comment.author?.username || '匿名用户' }}</span>
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
              </div>
              <!-- 回用引用 -->
              <div class="comment-reply-to" v-if="comment.reply_to">
                <span class="reply-username">@{{ comment.reply_to.author?.username || '匿名用户' }}</span>
              </div>
              <div class="comment-text">{{ comment.content }}</div>
              <div class="comment-actions">
                <div
                  class="comment-action-item"
                  @click="setReplyTo(comment)"
                >
                  回复
                </div>
                <div
                  class="comment-action-item"
                  :class="{ active: commentLikedSet.has(comment.id) || comment.is_liked }"
                  @click="toggleCommentLike(comment)"
                >
                  {{ commentLikedSet.has(comment.id) || comment.is_liked ? '♥' : '♡' }} {{ (comment.likes_count || 0) + (commentLikedSet.has(comment.id) && !comment.is_liked ? 1 : 0) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多评论 -->
          <div v-if="commentsLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>

          <div v-if="commentsNoMore && comments.length > 0" class="load-more-tip">
            没有更多评论了
          </div>
        </div>

        <!-- 无评论 -->
        <div v-else-if="!commentsLoading" class="empty-state" style="padding: 30px 20px">
          <div class="empty-state-title">暂无评论</div>
          <div class="empty-state-desc">来说两句吧</div>
        </div>
      </div>
    </template>

    <!-- 帖子不存在 -->
    <div v-else class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">帖子不存在或已被删除</div>
    </div>

    <!-- 底部评论输入框（固定在底部） -->
    <div class="comment-input-bar" v-if="post">
      <div class="comment-input-wrapper">
        <input
          v-model="commentText"
          :placeholder="replyTarget ? `回复 @${replyTarget.author?.username || '匿名用户'}` : '写评论...'"
          @keyup.enter="submitComment"
          ref="commentInputRef"
        />
        <button
          class="comment-send-btn"
          :disabled="!commentText.trim() || submitting"
          @click="submitComment"
        >
          {{ submitting ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPost, likePost, collectPost, getComments, addComment } from '@/api/modules/posts'

const route = useRoute()
const router = useRouter()
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlOGU4ZTgiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjYmNiY2JjIi8+PGVsbGlwc2UgY3g9IjIwIiBjeT0iMzMiIHJ4PSIxMiIgcnk9IjkiIGZpbGw9IiNiY2JjYmMiLz48L3N2Zz4='

// 帖子数据
const post = ref(null)
const postLoading = ref(true)

// 评论数据
const comments = ref([])
const commentsLoading = ref(false)
const commentsNoMore = ref(false)
const commentsPage = ref(1)

// 交互状态
const isLiked = ref(false)
const isCollected = ref(false)
const commentLikedSet = ref(new Set())

// 评论输入
const commentText = ref('')
const submitting = ref(false)
const replyTarget = ref(null)
const commentInputRef = ref(null)

// 计算属性：带本地偏移的计数
const currentLikesCount = computed(() => {
  if (!post.value) return 0
  return (post.value.likes_count || 0) + (isLiked.value && !post.value.is_liked ? 1 : 0)
})

const currentCollectsCount = computed(() => {
  if (!post.value) return 0
  return (post.value.collects_count || 0) + (isCollected.value && !post.value.is_collected ? 1 : 0)
})

// 格式化时间工具函数
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

// 获取帖子详情
async function fetchPost() {
  const id = route.params.id
  if (!id) return

  postLoading.value = true
  try {
    const data = await getPost(id)
    post.value = data
    isLiked.value = !!data.is_liked
    isCollected.value = !!data.is_collected
  } catch (e) {
    console.error('获取帖子详情失败:', e)
    post.value = null
  } finally {
    postLoading.value = false
  }
}

// 获取评论
async function fetchComments() {
  const id = route.params.id
  if (!id || commentsLoading.value || commentsNoMore.value) return

  commentsLoading.value = true
  try {
    const res = await getComments(id, {
      page: commentsPage.value,
      page_size: 10
    })
    const data = res.results || res.data || res.list || res || []
    if (Array.isArray(data) && data.length > 0) {
      comments.value.push(...data)
      commentsPage.value++
    } else {
      commentsNoMore.value = true
    }
  } catch (e) {
    console.error('获取评论失败:', e)
  } finally {
    commentsLoading.value = false
  }
}

// 点赞帖子
async function toggleLike() {
  const id = post.value?.id
  if (!id) return

  isLiked.value = !isLiked.value
  try {
    await likePost(id)
  } catch (e) {
    isLiked.value = !isLiked.value
    console.error('点赞失败:', e)
  }
}

// 收藏帖子
async function toggleCollect() {
  const id = post.value?.id
  if (!id) return

  isCollected.value = !isCollected.value
  try {
    await collectPost(id)
  } catch (e) {
    isCollected.value = !isCollected.value
    console.error('收藏失败:', e)
  }
}

// 评论点赞
function toggleCommentLike(comment) {
  const id = comment.id
  if (commentLikedSet.value.has(id)) {
    commentLikedSet.value.delete(id)
  } else {
    commentLikedSet.value.add(id)
  }
}

// 设置回复目标
function setReplyTo(comment) {
  replyTarget.value = comment
  nextTick(() => {
    commentInputRef.value?.focus()
  })
}

// 发送评论
async function submitComment() {
  const id = post.value?.id
  if (!id || !commentText.value.trim() || submitting.value) return

  submitting.value = true
  try {
    const payload = {
      content: commentText.value.trim()
    }
    if (replyTarget.value) {
      payload.reply_to_id = replyTarget.value.id
    }

    const newComment = await addComment(id, payload)

    // 将新评论添加到列表头部
    comments.value.unshift(newComment)

    // 清空输入
    commentText.value = ''
    replyTarget.value = null
  } catch (e) {
    console.error('发送评论失败:', e)
  } finally {
    submitting.value = false
  }
}

// 跳转用户主页
function goProfile(id) {
  if (id) router.push(`/profile/${id}`)
}

// 监听路由参数变化，重新加载数据
watch(() => route.params.id, (newId) => {
  if (newId) {
    post.value = null
    comments.value = []
    commentsPage.value = 1
    commentsNoMore.value = false
    commentText.value = ''
    replyTarget.value = null
    commentLikedSet.value = new Set()
    fetchPost()
    fetchComments()
  }
})

onMounted(() => {
  fetchPost()
  fetchComments()
})
</script>

<style scoped>
.post-detail-view {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 70px;
}

/* 帖子卡片 */
.post-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 12px;
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
  max-width: 500px;
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

/* 评论区卡片 */
.comments-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 12px;
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 15px;
  font-weight: 600;
}

.comments-count {
  font-size: 13px;
  color: var(--text-light);
  font-weight: 400;
}

/* 评论列表 */
.comments-list {
  padding: 4px 16px;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg);
  flex-shrink: 0;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-user {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.comment-time {
  font-size: 11px;
  color: var(--text-light);
}

.comment-reply-to {
  margin-top: 4px;
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-light);
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
}

.reply-username {
  font-weight: 500;
}

.comment-text {
  font-size: 14px;
  color: var(--text);
  margin-top: 4px;
  line-height: 1.6;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 16px;
  margin-top: 6px;
}

.comment-action-item {
  font-size: 12px;
  color: var(--text-light);
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}

.comment-action-item:hover {
  color: var(--primary);
}

.comment-action-item.active {
  color: var(--primary);
}

/* 底部评论输入框 */
.comment-input-bar {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width);
  right: 0;
  background: var(--card);
  border-top: 1px solid var(--border);
  padding: 10px 24px;
  z-index: 80;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.comment-input-wrapper {
  display: flex;
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.comment-input-wrapper input {
  flex: 1;
  height: 40px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  color: var(--text);
  transition: var(--transition);
}

.comment-input-wrapper input:focus {
  border-color: var(--primary);
  background: var(--card);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.comment-input-wrapper input::placeholder {
  color: var(--text-light);
}

.comment-send-btn {
  height: 40px;
  padding: 0 20px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  white-space: nowrap;
  cursor: pointer;
}

.comment-send-btn:hover {
  background: var(--primary-hover);
}

.comment-send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
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

/* 评论骨架屏 */
.comment-skeleton {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 12px;
  padding: 12px 16px;
}

.comment-skeleton-inner {
  display: flex;
  gap: 10px;
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
  padding: 16px 0;
  font-size: 13px;
  color: var(--text-light);
}

/* 响应式：小屏底部输入框适配 */
@media (max-width: 900px) {
  .comment-input-bar {
    left: 0;
  }
}
</style>
