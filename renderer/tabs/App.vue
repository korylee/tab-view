<!-- src/components/BrowserChrome.vue -->
<template>
  <div class="browser">
    <div class="top-bar">
      <div class="tabs">
        <div
          v-for="tab in tabStore.tabs"
          :key="tab.id"
          :class="['tab', { active: tab.id === tabStore.activeId }]"
          @click="switchTab(tab.id)"
        >
          <span v-if="tab.isLoading" class="spinner"></span>
          <span v-else class="dot"></span>
          <span class="title">{{ tab.title }}</span>
          <button class="close" @click.stop="closeTab(tab.id)">×</button>
        </div>
      </div>

      <button
        class="download-btn"
        :class="{ active: downloadingCount > 0 }"
        @click="toggleDownload"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
        </svg>
        <span v-if="downloadingCount > 0" class="count">{{
          downloadingCount
        }}</span>
      </button>
    </div>

    <div class="content">
      <div v-if="tabStore.tabs.length === 0" class="empty">
        没有打开的标签页
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTabsStore } from './stores/tabs'

const tabStore = useTabsStore()
const downloadingCount = ref(0)

const switchTab = (id: string) => {
  window.api.tab.switch(id)
  tabStore.setActive(id)
}

const closeTab = (id: string) => {
  window.api.tab.close(id)
  tabStore.removeTab(id)
}

const toggleDownload = () => {
  window.api.download.togglePanel()
}

const cleanups: (() => void)[] = []

onMounted(async () => {
  const tabs = await window.api.tab.getAll()
  tabs.forEach((tab) => tabStore.addTab(tab))
  if (tabs.length > 0) tabStore.setActive(tabs[0].id)

  const on = (channel: string, handler: (...args: any[]) => void) => {
    const cleanup = window.api.on(channel, handler)
    cleanups.push(cleanup)
  }

  on('tab:created', (tab) => tabStore.addTab(tab))
  on('tab:switched', ({ id }) => tabStore.setActive(id))
  on('tab:closed', (id) => tabStore.removeTab(id))
  on('tab:updated', ({ id, ...data }) => tabStore.updateTab(id, data))
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
</style>
