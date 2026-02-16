<template>
  <svg v-bind="iconAttr" aria-hidden="true" class="svg-icon">
    <use :xlink:href="symbolId" />
  </svg>
</template>
<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 18
  }
})

const iconAttr = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  } as const
  const keys = Object.keys(sizes) as unknown as keyof typeof sizes
  if (keys.includes(props.size as string)) {
    return {
      class: sizes[props.size]
    }
  }
  return {
    style: { width: props.size + 'px', height: props.size + 'px' }
  }
})
const symbolId = computed(() => `#icon-${props.name}`)
</script>

<style scoped>
.svg-icon {
  fill: currentColor;
  vertical-align: middle;
  overflow: hidden;
}
</style>
