<template>
  <div class="panel" @click="onBackdropClick">
    <div class="header">
      <div class="title">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>下载管理</span>
        <span v-if="activeCount > 0" class="badge">{{ activeCount }}</span>
      </div>
      <div class="actions">
        <button v-if="completedCount > 0" class="btn-text" @click="clearAll">
          清除已完成
        </button>
        <button class="btn-close" @click="hide">×</button>
      </div>
    </div>

    <div class="list">
      <div v-if="items.length === 0" class="empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <p>暂无下载任务</p>
      </div>

      <div v-for="item in items" :key="item.id" :class="['item', item.state]">
        <div class="icon" :class="item.state">
          <svg
            v-if="item.state === 'progressing'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
          </svg>
          <svg
            v-else-if="item.state === 'completed'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <div class="info">
          <div class="filename">{{ item.filename }}</div>
          <div class="meta">
            <template v-if="item.state === 'progressing'">
              {{ formatSize(item.receivedBytes) }} /
              {{ formatSize(item.totalBytes) }} · {{ formatSpeed(item.speed) }}
            </template>
            <template v-else-if="item.state === 'completed'">
              {{ formatSize(item.totalBytes) }} · 完成
            </template>
            <template v-else-if="item.state === 'failed'">下载失败</template>
            <template v-else>已取消</template>
          </div>
          <div v-if="item.state === 'progressing'" class="progress">
            <div class="bar">
              <div class="fill" :style="{ width: item.percent + '%' }"></div>
            </div>
            <span class="percent">{{ item.percent }}%</span>
          </div>
        </div>

        <div class="actions">
          <template v-if="item.state === 'completed'">
            <button
              class="btn-icon success"
              @click="open(item.id)"
              title="打开"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button class="btn-icon" @click="show(item.id)" title="文件夹">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                />
              </svg>
            </button>
          </template>
          <button
            v-if="item.state !== 'progressing'"
            class="btn-icon danger"
            @click="remove(item.id)"
            title="删除"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface DownloadItem {
  id: string
  filename: string
  path: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'failed' | 'cancelled'
  startTime: number
  endTime?: number
  speed: number
  progress: number
  percent: number
}

const items = ref<DownloadItem[]>([])

const activeCount = computed(
  () => items.value.filter((d) => d.state === 'progressing').length
)
const completedCount = computed(
  () => items.value.filter((d) => d.state === 'completed').length
)

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const formatSpeed = (bytes: number): string => {
  return formatSize(bytes) + '/s'
}

const open = (id: string) => window.api.download.open(id)
const show = (id: string) => window.api.download.show(id)
const remove = (id: string) => window.api.download.remove(id)
const clearAll = () => window.api.download.clear()
const hide = () => window.api.download.hide()

const onBackdropClick = (e: Event) => {
  e.target === e.currentTarget && hide()
}

const cleanups: (() => void)[] = []

onMounted(async () => {
  items.value = await window.api.download.getAll()

  const on = (channel: string, handler: (...args: any[]) => void) => {
    const cleanup = window.api.on(channel, handler)
    cleanups.push(cleanup)
  }

  on('download:added', (data) => items.value.unshift(data))
  on('download:updated', (data) => {
    const item = items.value.find((d) => d.id === data.id)
    if (item) Object.assign(item, data)
  })
  on('download:completed', (data) => {
    const item = items.value.find((d) => d.id === data.id)
    if (item) {
      item.state = data.state
      item.endTime = Date.now()
    }
  })
  on('download:removed', (id) => {
    items.value = items.value.filter((d) => d.id !== id)
  })
  on('download:cleared', (ids: string[]) => {
    items.value = items.value.filter((d) => !ids.includes(d.id))
  })
})

onUnmounted(() => {
  cleanups.forEach((fn) => fn())
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #dadce0;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #202124;
}

.title svg {
  color: #1a73e8;
}

.badge {
  padding: 2px 8px;
  background: #1a73e8;
  color: #fff;
  font-size: 11px;
  border-radius: 10px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.btn-text {
  font-size: 12px;
  color: #5f6368;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-text:hover {
  background: #e8eaed;
  color: #202124;
}

.btn-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #5f6368;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-close:hover {
  background: #e8eaed;
  color: #202124;
}

/* 美化滚动条 */
.list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

/* Webkit 滚动条 */
.list::-webkit-scrollbar {
  width: 6px;
}

.list::-webkit-scrollbar-track {
  background: transparent;
}

.list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.list::-webkit-scrollbar-corner {
  background: transparent;
}

/* 隐藏滚动条但保持滚动功能（可选） */
.list:hover::-webkit-scrollbar-thumb {
  background: #c1c1c1;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #9aa0a6;
}

.empty svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.15s;
}

.item:hover {
  background: #f8f9fa;
}

.item.completed {
  border-left: 3px solid #34a853;
}

.item.failed,
.item.cancelled {
  border-left: 3px solid #ea4335;
  opacity: 0.8;
}

.icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e8eaed;
  color: #5f6368;
}

.icon.progressing {
  background: #e8f0fe;
  color: #1a73e8;
}

.icon.completed {
  background: #e6f4ea;
  color: #34a853;
}

.icon.failed,
.icon.cancelled {
  background: #fce8e6;
  color: #ea4335;
}

.info {
  flex: 1;
  min-width: 0;
}

.filename {
  font-size: 13px;
  color: #202124;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.meta {
  font-size: 12px;
  color: #5f6368;
}

.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.bar {
  flex: 1;
  height: 4px;
  background: #e8eaed;
  border-radius: 2px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: #1a73e8;
  border-radius: 2px;
  transition: width 0.3s;
}

.percent {
  font-size: 11px;
  color: #1a73e8;
  font-weight: 500;
  min-width: 32px;
  text-align: right;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.item:hover .actions {
  opacity: 1;
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #e8eaed;
  color: #5f6368;
}

.btn-icon:hover {
  background: #dadce0;
  color: #202124;
}

.btn-icon.success {
  background: #e6f4ea;
  color: #34a853;
}

.btn-icon.success:hover {
  background: #ceead6;
}

.btn-icon.danger {
  background: #fce8e6;
  color: #ea4335;
}

.btn-icon.danger:hover {
  background: #fad2cf;
}
</style>
