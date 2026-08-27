<template>
  <RouterLink
    :to="to"
    :title="collapsed ? label : undefined"
    class="group flex items-center gap-3 text-sm font-medium transition"
    :class="[collapsed ? 'mx-auto h-9 w-8 justify-center rounded-[var(--rw-radius-item)] px-0' : 'h-10 w-full rounded-[var(--rw-radius-control)] px-3', isActive ? activeClasses : inactiveClasses]"
  >
    <component :is="icon" class="h-5 w-5 shrink-0" />
    <span v-if="!collapsed" class="truncate">{{ label }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  to: string
  label: string
  icon: Component
  collapsed: boolean
}>()

const route = useRoute()

const isActive = computed(() => route.path === props.to || route.path.startsWith(`${props.to}/`))

const activeClasses = 'bg-ui-surface text-ui-text shadow-soft'
const inactiveClasses = 'text-ui-mutedText hover:bg-ui-hover hover:text-ui-text'
</script>
