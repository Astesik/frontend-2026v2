<template>
  <div class="flex items-start gap-1.5">
    <img
      v-if="country && /^[A-Z]{2}$/i.test(country)"
      :src="`https://flagsapi.com/${country.toUpperCase() === 'UK' ? 'GB' : country.toUpperCase()}/flat/64.png`"
      :alt="country" loading="lazy" width="20" height="20"
      class="mt-0.5 h-4 w-5 shrink-0 object-contain"
    />
    <div class="min-w-0 flex-1">
      <div class="flex min-w-0 items-center gap-2">
        <p class="min-w-0 font-medium text-ui-text" :class="stationKnown ? 'break-words' : 'truncate'" :title="stationName || stationCode">{{ stationName || stationCode }}</p>
        <span v-if="!stationKnown" class="ui-caption inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-warning-600 dark:text-warning-400">
          <IconAlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
          <button
            v-if="canCreateStation" type="button" title="Utwórz stację"
            class="text-left underline-offset-4 hover:underline focus-visible:underline"
            @click="emit('createStation')"
          >Nieznana stacja</button>
          <span v-else>Nieznana stacja</span>
        </span>
      </div>
      <p v-if="stationName" class="ui-caption break-words">{{ stationCode }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { IconAlertTriangle } from '@tabler/icons-vue'
defineProps<{
  stationName?: string | null
  stationCode: string
  country?: string | null
  stationKnown: boolean
  canCreateStation?: boolean
}>()
const emit = defineEmits<{ createStation: [] }>()
</script>
