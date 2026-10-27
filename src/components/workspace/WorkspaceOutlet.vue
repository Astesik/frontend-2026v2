<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive :key="store.epoch" :include="cacheNames">
      <component v-if="Component && descriptor(route) && store.tabs.some(tab => tab.id === descriptor(route)!.id)" :is="host(descriptor(route)!.id)" :key="descriptor(route)!.id" :view="Component" :page-route="route" :tab-id="descriptor(route)!.id" />
    </KeepAlive>
    <component v-if="Component && !descriptor(route)" :is="Component" />
  </RouterView>
</template>
<script setup lang="ts">
import { computed, defineComponent, h, markRaw, watch, type Component } from 'vue'
import { RouterView } from 'vue-router'
import WorkspacePage from './WorkspacePage.vue'
import { describeWorkspaceRoute as descriptor } from '@/workspace/registry'
import { useWorkspaceTabsStore } from '@/stores/workspaceTabsStore'
const store = useWorkspaceTabsStore()
const hosts = new Map<string, Component>()
function cacheName(id: string) { return `Workspace_${store.epoch}_${id.replace(/[^a-zA-Z0-9_]/g, '_')}` }
const cacheNames = computed(() => store.tabs.map(tab => cacheName(tab.id)))
function host(id: string) {
  const name = cacheName(id)
  if (!hosts.has(name)) hosts.set(name, markRaw(defineComponent({ name, props: ['view', 'pageRoute', 'tabId'], setup: props => () => h(WorkspacePage, props as unknown as InstanceType<typeof WorkspacePage>['$props']) })))
  return hosts.get(name)!
}
watch(cacheNames, names => { for (const name of hosts.keys()) if (!names.includes(name)) hosts.delete(name) })
</script>
