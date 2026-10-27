<template>
  <component :is="type?.toUpperCase() === 'TRAILER' ? Container : Truck" aria-hidden="true" />
</template>
<script setup lang="ts">
import { Container, Truck } from 'lucide-vue-next'
defineProps<{ type?: string | null }>()
</script>
