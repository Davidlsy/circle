<template>
  <div class="groups-view">
    <!-- 顶部操作栏 -->
    <div class="groups-header">
      <h3 class="groups-title">群聊</h3>
      <button class="btn-create-group" @click="showCreateModal = true">创建群聊</button>
    </div>

    <!-- 加载骨架屏 -->
    <template v-if="loading && groups.length === 0">
      <div class="groups-grid">
        <div class="group-card skeleton-card" v-for="i in 6" :key="'sk-' + i">
          <div class="skeleton skeleton-icon"></div>
          <div class="skeleton skeleton-text" style="width: 60%; margin: 12px auto 0"></div>
          <div class="skeleton skeleton-text" style="width: 40%; margin: 6px auto 0; height: 12px"></div>
          <div class="skeleton skeleton-text" style="width: 80%; margin: 10px auto 0; height: 12px"></div>
        </div>
      </div>
    </template>

    <!-- 群列表 -->
    <template v-else-if="groups.length > 0">
      <div class="groups-grid">
        <div
          v-for="group in groups"
          :key="group.id"
          class="group-card"
          @click="goGroupChat(group.id)"
        >
          <div class="group-avatar">
            <span class="group-avatar-text">{{ getInitial(group.name) }}</span>
          </div>
          <div class="group-name">{{ group.name }}</div>
          <div class="group-members">{{ group.member_count || 0 }} 位成员</div>
          <div class="group-last-msg">{{ getLastMessage(group) }}</div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">暂无群聊</div>
      <div class="empty-state-desc">点击"创建群聊"开始你的第一个群聊吧</div>
    </div>

    <!-- 创建群聊模态框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>创建群聊</span>
          <button class="modal-close" @click="showCreateModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">群名称</label>
            <input
              v-model="newGroupName"
              class="form-input"
              type="text"
              placeholder="请输入群名称"
              maxlength="50"
              @keyup.enter="handleCreateGroup"
            />
          </div>
          <div class="form-group">
            <label class="form-label">群描述（可选）</label>
            <textarea
              v-model="newGroupDesc"
              class="form-textarea"
              placeholder="请输入群描述"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button
            class="btn-confirm"
            :disabled="!newGroupName.trim() || creating"
            @click="handleCreateGroup"
          >
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getGroups, createGroup } from '@/api/modules/chat'

const router = useRouter()

// 列表状态
const groups = ref([])
const loading = ref(false)

// 创建群聊状态
const showCreateModal = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')
const creating = ref(false)

// 获取首字母
function getInitial(name) {
  return (name || 'G').charAt(0).toUpperCase()
}

// 获取最后一条消息预览
function getLastMessage(group) {
  if (group.last_message) {
    return group.last_message.content || ''
  }
  return ''
}

// 获取群列表
async function fetchGroups() {
  loading.value = true
  try {
    const res = await getGroups()
    groups.value = res.results || res.data || res.list || res || []
  } catch (e) {
    console.error('获取群列表失败:', e)
  } finally {
    loading.value = false
  }
}

// 创建群聊
async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name || creating.value) return

  creating.value = true
  try {
    const data = { name }
    if (newGroupDesc.value.trim()) {
      data.description = newGroupDesc.value.trim()
    }

    const res = await createGroup(data)
    const group = res.data || res

    showCreateModal.value = false
    newGroupName.value = ''
    newGroupDesc.value = ''

    // 添加到列表头部
    groups.value.unshift(group)

    // 跳转到群聊
    if (group.id) {
      router.push(`/groups/${group.id}`)
    }
  } catch (e) {
    console.error('创建群聊失败:', e)
  } finally {
    creating.value = false
  }
}

// 跳转群聊详情
function goGroupChat(id) {
  router.push(`/groups/${id}`)
}

onMounted(() => {
  fetchGroups()
})
</script>

<style scoped>
.groups-view {
  max-width: 800px;
  margin: 0 auto;
}

/* ====== 顶部操作栏 ====== */
.groups-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--card, #fff);
  border-radius: var(--radius, 8px) var(--radius, 8px) 0 0;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  margin-bottom: 12px;
}

.groups-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text, #333);
}

.btn-create-group {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background: var(--primary, #4a90d9);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-create-group:hover {
  opacity: 0.85;
}

/* ====== 群列表网格 ====== */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.group-card {
  background: var(--card, #fff);
  border-radius: var(--radius, 8px);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.06));
  border: 1px solid var(--border-light, #f0f0f0);
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.group-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.group-avatar-text {
  font-size: 24px;
  font-weight: 600;
}

.group-name {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-members {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-light, #999);
}

.group-last-msg {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ====== 空状态 ====== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light, #999);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state-title {
  font-size: 16px;
  color: var(--text-secondary, #666);
  margin-bottom: 8px;
}

.empty-state-desc {
  font-size: 14px;
}

/* ====== 骨架屏 ====== */
.skeleton-card {
  background: var(--card, #fff);
  border-radius: var(--radius, 8px);
  padding: 24px 16px;
  text-align: center;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.06));
}

.skeleton-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #e8e8e8;
  margin: 0 auto;
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
  width: 420px;
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

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #333);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary, #4a90d9);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
  min-height: 70px;
}

.form-textarea:focus {
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
</style>