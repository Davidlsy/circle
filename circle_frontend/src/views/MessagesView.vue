<template>
  <div class="chat-layout">
    <!-- 左侧会话列表 -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">私信</h3>
        <button class="btn-new-conv" @click="showNewConvModal = true">新建会话</button>
      </div>

      <div class="conversation-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: selectedConvId === conv.id }"
          @click="selectConversation(conv)"
        >
          <div class="conv-avatar">
            {{ getInitial(conv.other_user?.username || 'U') }}
          </div>
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-username">{{ conv.other_user?.username || '未知用户' }}</span>
              <span class="conv-time">{{ formatTime(conv.last_message_at || conv.updated_at) }}</span>
            </div>
            <div class="conv-bottom">
              <span class="conv-preview">{{ getPreview(conv) }}</span>
              <span v-if="conv.unread_count > 0" class="unread-badge">{{ conv.unread_count > 99 ? '99+' : conv.unread_count }}</span>
            </div>
          </div>
        </div>

        <div v-if="!convLoading && conversations.length === 0" class="sidebar-empty">
          暂无会话
        </div>
      </div>

      <!-- 新建会话弹窗 -->
      <div v-if="showNewConvModal" class="modal-overlay" @click.self="showNewConvModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <span>新建会话</span>
            <button class="modal-close" @click="showNewConvModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <input
              v-model="newConvUsername"
              class="modal-input"
              type="text"
              placeholder="输入对方用户名"
              @keyup.enter="handleCreateConversation"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showNewConvModal = false">取消</button>
            <button class="btn-confirm" :disabled="!newConvUsername.trim()" @click="handleCreateConversation">确定</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-main">
      <!-- 空状态 -->
      <div v-if="!selectedConvId" class="chat-empty">
        <div class="chat-empty-icon">💬</div>
        <div class="chat-empty-text">选择一个会话开始聊天</div>
      </div>

      <!-- 聊天内容 -->
      <template v-else>
        <div class="chat-header">
          <span class="chat-username">{{ currentUsername }}</span>
        </div>

        <div ref="messageListRef" class="message-list">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-item"
            :class="{ 'is-self': msg.is_self, 'is-system': msg.message_type === 'system' }"
          >
            <!-- 系统消息 -->
            <div v-if="msg.message_type === 'system'" class="system-message">
              {{ msg.content }}
            </div>

            <!-- 普通消息 -->
            <template v-else>
              <div class="message-meta">
                <span class="message-time">{{ formatMessageTime(msg.created_at) }}</span>
                <span v-if="msg.is_read !== undefined" class="message-read">
                  {{ msg.is_self ? (msg.is_read ? '已读' : '未读') : '' }}
                </span>
              </div>
              <div class="message-bubble" :class="{ 'bubble-self': msg.is_self }">
                <!-- 文本消息 -->
                <div v-if="msg.message_type === 'text'" class="bubble-text">{{ msg.content }}</div>
                <!-- 图片消息 -->
                <div v-else-if="msg.message_type === 'image'" class="bubble-image">
                  <img :src="msg.content" alt="图片消息" />
                </div>
                <!-- 表情包消息 -->
                <div v-else-if="msg.message_type === 'sticker'" class="bubble-sticker">[表情包]</div>
                <!-- 位置消息 -->
                <div v-else-if="msg.message_type === 'location'" class="bubble-location">
                  <div class="location-name">{{ msg.content?.name || '未知位置' }}</div>
                  <div class="location-addr">{{ msg.content?.address || '' }}</div>
                </div>
                <!-- 其他类型兜底 -->
                <div v-else class="bubble-text">{{ msg.content }}</div>
              </div>
            </template>
          </div>
        </div>

        <div class="input-area">
          <textarea
            v-model="inputText"
            class="message-input"
            placeholder="输入消息..."
            rows="1"
            @keydown="handleKeyDown"
          ></textarea>
          <button class="btn-send" :disabled="!inputText.trim() || sending" @click="handleSend">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
} from '@/api/modules/chat'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 会话列表状态
const conversations = ref([])
const convLoading = ref(false)
const selectedConvId = ref(null)
const currentUsername = ref('')
const showNewConvModal = ref(false)
const newConvUsername = ref('')

// 消息状态
const messages = ref([])
const msgLoading = ref(false)
const inputText = ref('')
const sending = ref(false)
const messageListRef = ref(null)

// 获取首字母
function getInitial(name) {
  return (name || 'U').charAt(0).toUpperCase()
}

// 格式化会话列表时间
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

// 格式化消息时间（显示具体时分）
function formatMessageTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 获取最后消息预览
function getPreview(conv) {
  if (conv.last_message) {
    if (conv.last_message.message_type === 'image') return '[图片]'
    if (conv.last_message.message_type === 'sticker') return '[表情包]'
    if (conv.last_message.message_type === 'location') return '[位置]'
    return conv.last_message.content || ''
  }
  return ''
}

// 加载会话列表
async function fetchConversations() {
  convLoading.value = true
  try {
    const res = await getConversations()
    conversations.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取会话列表失败:', e)
  } finally {
    convLoading.value = false
  }
}

// 选择会话
async function selectConversation(conv) {
  selectedConvId.value = conv.id
  currentUsername.value = conv.other_user?.username || '未知用户'
  messages.value = []
  await fetchMessages(conv.id)
  // 标记已读
  try {
    await markRead(conv.id)
    conv.unread_count = 0
  } catch (e) {
    console.error('标记已读失败:', e)
  }
}

// 加载消息
async function fetchMessages(convId) {
  msgLoading.value = true
  try {
    const res = await getMessages(convId, { page: 1, page_size: 50 })
    messages.value = res.results || res.data || res.list || res || []
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('获取消息失败:', e)
  } finally {
    msgLoading.value = false
  }
}

// 滚动到底部
function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 发送消息
async function handleSend() {
  const content = inputText.value.trim()
  if (!content || sending.value || !selectedConvId.value) return

  sending.value = true
  try {
    // 乐观更新：先添加本地消息
    const tempMsg = {
      id: Date.now(),
      content,
      message_type: 'text',
      is_self: true,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    messages.value.push(tempMsg)
    inputText.value = ''
    await nextTick()
    scrollToBottom()

    await sendMessage(selectedConvId.value, { content, message_type: 'text' })

    // 发送成功后标记已读
    try {
      await markRead(selectedConvId.value)
    } catch (e) {
      console.error('标记已读失败:', e)
    }

    // 刷新消息列表获取服务端数据
    await fetchMessages(selectedConvId.value)
  } catch (e) {
    console.error('发送消息失败:', e)
    // 移除乐观更新的消息
    messages.value = messages.value.filter(m => m.id !== tempMsg?.id)
  } finally {
    sending.value = false
  }
}

// 键盘事件：Enter 发送，Shift+Enter 换行
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// 新建会话
async function handleCreateConversation() {
  const username = newConvUsername.value.trim()
  if (!username) return

  try {
    const res = await getOrCreateConversation({ username })
    const conv = res.data || res
    showNewConvModal.value = false
    newConvUsername.value = ''

    // 检查会话是否已在列表中
    const existing = conversations.value.find(c => c.id === conv.id)
    if (!existing) {
      conversations.value.unshift(conv)
    }

    // 选中该会话
    selectConversation(conv)
  } catch (e) {
    console.error('创建会话失败:', e)
  }
}

// 监听消息变化自动滚动
watch(messages, async () => {
  await nextTick()
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  fetchConversations()
})
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: calc(100vh - var(--topbar-height, 60px) - 24px);
  background: var(--card, #fff);
  border-radius: var(--radius, 8px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

/* ====== 左侧会话列表 ====== */
.chat-sidebar {
  width: 300px;
  min-width: 300px;
  border-right: 1px solid var(--border, #eee);
  display: flex;
  flex-direction: column;
  background: var(--bg, #f5f5f5);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border, #eee);
  background: var(--card, #fff);
}

.sidebar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text, #333);
}

.btn-new-conv {
  padding: 6px 14px;
  font-size: 13px;
  color: #fff;
  background: var(--primary, #4a90d9);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-new-conv:hover {
  opacity: 0.85;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.conversation-item:hover {
  background: #f0f4f8;
}

.conversation-item.active {
  background: #e8f0fe;
}

.conv-avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: var(--primary, #4a90d9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.conv-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conv-username {
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-time {
  font-size: 11px;
  color: var(--text-light, #999);
  white-space: nowrap;
  margin-left: 8px;
}

.conv-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conv-preview {
  font-size: 12px;
  color: var(--text-secondary, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unread-badge {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 11px;
  color: #fff;
  background: #e74c3c;
  border-radius: 9px;
  padding: 0 5px;
  margin-left: 8px;
}

.sidebar-empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-light, #999);
  font-size: 14px;
}

/* ====== 弹窗 ====== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: var(--card, #fff);
  border-radius: 8px;
  width: 380px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #eee);
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #333);
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-secondary, #888);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text, #333);
}

.modal-body {
  padding: 20px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: var(--primary, #4a90d9);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--border, #eee);
}

.btn-cancel {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--text-secondary, #666);
  background: var(--bg, #f5f5f5);
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #eaeaea;
}

.btn-confirm {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background: var(--primary, #4a90d9);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-confirm:hover {
  opacity: 0.85;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ====== 右侧聊天区域 ====== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-light, #999);
}

.chat-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.chat-empty-text {
  font-size: 15px;
}

.chat-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border, #eee);
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #333);
  background: var(--card, #fff);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-item.is-self {
  align-self: flex-end;
  align-items: flex-end;
}

.message-item:not(.is-self):not(.is-system) {
  align-self: flex-start;
  align-items: flex-start;
}

.message-item.is-system {
  align-self: center;
  max-width: 100%;
}

.system-message {
  font-size: 12px;
  color: var(--text-light, #999);
  background: var(--bg, #f5f5f5);
  padding: 4px 12px;
  border-radius: 12px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  order: -1;
}

.message-time {
  font-size: 11px;
  color: var(--text-light, #999);
}

.message-read {
  font-size: 11px;
  color: var(--text-light, #999);
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  position: relative;
}

.message-bubble:not(.bubble-self) {
  background: #f0f0f0;
  color: var(--text, #333);
  border-top-left-radius: 4px;
}

.message-bubble.bubble-self {
  background: #4a90d9;
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble-text {
  white-space: pre-wrap;
}

.bubble-image img {
  max-width: 240px;
  max-height: 240px;
  border-radius: 6px;
  display: block;
}

.bubble-sticker {
  font-size: 16px;
  color: var(--text-secondary, #666);
  padding: 4px 0;
}

.bubble-self .bubble-sticker {
  color: rgba(255, 255, 255, 0.8);
}

.bubble-location {
  min-width: 160px;
}

.location-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.location-addr {
  font-size: 12px;
  opacity: 0.7;
}

/* ====== 输入区域 ====== */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border, #eee);
  background: var(--card, #fff);
}

.message-input {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--border, #ddd);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  max-height: 120px;
  min-height: 40px;
  box-sizing: border-box;
}

.message-input:focus {
  border-color: var(--primary, #4a90d9);
}

.btn-send {
  padding: 10px 20px;
  font-size: 14px;
  color: #fff;
  background: var(--primary, #4a90d9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
  height: 40px;
}

.btn-send:hover {
  opacity: 0.85;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>