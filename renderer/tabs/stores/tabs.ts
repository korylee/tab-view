import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface Tab {
  id: string
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeId = ref<string>('')

  const activeTab = computed(() =>
    tabs.value.find((t) => t.id === activeId.value)
  )

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

  return {
    tabs,
    activeId,
    activeTab,
    setTabs,
    addTab,
    removeTab,
    updateTab,
    setActive
  }
})
