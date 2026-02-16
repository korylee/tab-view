<template>
  <div class="browser">
    <div class="top-bar">
      <TransitionGroup
        v-draggable="[tabs, dragOptions]"
        name="tab-sort"
        tag="div"
        class="tabs"
      >
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: tab.id === activeId }]"
          draggable="true"
          @click="switchTab(tab.id)"
        >
          <span v-if="tab.isLoading" class="spinner"></span>
          <span v-else class="dot"></span>
          <span class="title">{{ tab.title }}</span>
          <button
            v-if="tabs.length > 1"
            class="close"
            @click.stop="closeTab(tab.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>

      <button
        class="download-btn"
        :class="{ active: downloadingCount > 0 }"
        @click="toggleDownload"
      >
        <DownloadIcon width="14" height="14" />
        <span v-if="downloadingCount > 0" class="count">{{
          downloadingCount
        }}</span>
      </button>
    </div>

    <div class="content">
      <div v-if="tabs.length === 0" class="empty">没有打开的标签页</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import DownloadIcon from '../icons/download.svg?component'
import { vDraggable, type DraggableEvent } from 'vue-draggable-plus'

const dragOptions = {
  animation: 200,
  ghostClass: 'ghost',
  chosenClass: 'chosen',
  dragClass: 'dragging',
  onEnd: (evt: DraggableEvent) => {
    const { oldIndex, newIndex } = evt

    // 如果位置没有变化，直接返回
    if (oldIndex === newIndex) return

    // 1. 手动修改 tabs.value 数组顺序
    // 这一步至关重要，否则 TransitionGroup 无法感知顺序变化，也就没有动画
    const movedItem = tabs.value.splice(oldIndex, 1)[0]
    tabs.value.splice(newIndex, 0, movedItem)

    // 2. 通知 Electron 主进程更新 BrowserView 的实际顺序
    const newOrder = tabs.value.map((t) => t.id)
    window.api.tab.reorder(newOrder)
  }
}

interface Tab {
  id: string
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

const tabs = ref([])
const activeId = ref('')
const setTabs = (list: Tab[]) => {
  tabs.value = list
}
const addTab = (tab: Tab) => tabs.value.push(tab)
const removeTab = (id: string) => {
  tabs.value = tabs.value.filter((t) => t.id !== id)
}
const updateTab = (id: string, data: Partial<Tab>) => {
  const tab = tabs.value.find((t) => t.id === id)
  if (tab) Object.assign(tab, data)
}
const setActive = (id: string) => {
  activeId.value = id
}

const downloadingCount = ref(0)

const switchTab = (id: string) => {
  window.api.tab.switch(id)
  setActive(id)
}

const closeTab = (id: string) => {
  window.api.tab.close(id)
  removeTab(id)
}

const toggleDownload = () => {
  window.api.download.togglePanel()
}

const cleanups: (() => void)[] = []

onMounted(async () => {
  const tabs = await window.api.tab.getAll()
  setTabs(tabs)
  if (tabs.length > 0) setActive(tabs[0].id)

  const on = (channel: string, handler: (...args: any[]) => void) => {
    const cleanup = window.api.on(channel, handler)
    cleanups.push(cleanup)
  }

  on('tab:created', (tab) => addTab(tab))
  on('tab:switched', ({ id }) => setActive(id))
  on('tab:closed', (id) => removeTab(id))
  on('tab:updated', ({ id, ...data }) => updateTab(id, data))
  on('download:changed', async () => {
    const downloads = await window.api.download.getAll()
    downloadingCount.value = downloads.filter(
      (d) => d.state === 'progressing'
    ).length
  })
})

onUnmounted(() => {
  cleanups.forEach((fn) => fn())
})
</script>

<style scoped>
.browser {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.top-bar {
  height: 40px;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-bottom: 1px solid #dadce0;
  padding: 0 8px;
}

.tabs {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
  overflow-x: auto;
}

.tab {
  height: 36px;
  min-width: 140px;
  max-width: 180px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: #e8eaed;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 13px;
  color: #5f6368;
  user-select: none;
  transition: all 0.15s;
}

.tab:hover {
  background: #dadce0;
}

.tab.active {
  background: #fff;
  color: #202124;
  border-bottom: 2px solid #1a73e8;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #dadce0;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #9aa0a6;
  opacity: 0;
  transition: all 0.15s;
}

.tab:hover .close {
  opacity: 1;
}

.close:hover {
  background: #dadce0;
  color: #202124;
}

.download-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  margin-left: 8px;
  position: relative;
  transition: all 0.15s;
}

.download-btn:hover {
  background: #f1f3f4;
  color: #202124;
}

.download-btn.active {
  background: #1a73e8;
  color: #fff;
}

.count {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  background: #ea4335;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  flex: 1;
  position: relative;
  background: #fff;
}

.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa0a6;
  font-size: 14px;
}

/* 确保移动动画流畅 */
.tab-sort-move {
  transition: transform 0.3s ease;
}

/* 被拖拽的元素样式 */
.tab.dragging {
  opacity: 0.5;
  background: #c8ebfb;
}

/* 占位符样式（可选，用于自定义拖拽时的虚影） */
.ghost {
  opacity: 0.4;
  background: #c8ebfb;
}

/* 被选中的元素样式 */
.chosen {
  border: 1px dashed #1a73e8;
}
</style>
