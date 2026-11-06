<template>
  <div class="min-w-36">
    <div class="flex items-center gap-2">
      <span v-if="countryCode" :class="['fi shrink-0 rounded-[2px]', `fi-${countryCode.toLowerCase()}`]" role="img" :aria-label="countryName" />
      <Globe2 v-else class="h-3.5 w-3.5 shrink-0 text-ui-icon" aria-hidden="true" />
      <span class="whitespace-nowrap tabular-nums">{{ ip || '—' }}</span>
    </div>
    <p class="mt-1 max-w-64 text-xs text-ui-mutedText" :title="countryCode ? 'Przybliżona lokalizacja adresu IP' : undefined">{{ locationLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Globe2 } from 'lucide-vue-next'
import 'flag-icons/css/flag-icons.min.css'
import type { IpLocation } from '@/types/auth'

const props = defineProps<{ ip: string | null | undefined; location?: IpLocation | null }>()
const countryCode = computed(() => {
  const code = props.location?.countryCode?.toUpperCase()
  return props.location?.status === 'located' && code && /^[A-Z]{2}$/.test(code) ? code : null
})
const countryName = computed(() => countryCode.value
  ? new Intl.DisplayNames(['pl'], { type: 'region' }).of(countryCode.value) || props.location?.country || countryCode.value
  : '')
const locationLabel = computed(() => {
  if (!props.ip) return 'Brak adresu IP'
  if (props.location?.status === 'private') return 'Adres niepubliczny'
  if (!countryCode.value) return 'Lokalizacja niedostępna'
  return [...new Set([props.location?.city || props.location?.region, countryName.value].filter(Boolean))].join(', ')
})
</script>
