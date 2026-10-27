<template>
  <section class="ui-popover w-72 max-w-[calc(100vw-4rem)] p-3 text-ui-text" aria-label="Informacje o stacji">
    <header class="mb-3 flex items-start justify-between gap-2"><div class="min-w-0"><h3 class="text-sm font-semibold break-words">{{ station.stationName }}</h3><p class="ui-caption">{{ station.provider }} · {{ station.stationCode }} · {{ station.country }}</p></div><AppIconButton label="Zamknij" variant="ghost" @click="$emit('close')"><X class="h-4 w-4" /></AppIconButton></header>
    <dl class="space-y-2 text-xs"><div class="flex justify-between gap-2"><dt class="text-ui-mutedText">Cena bazowa</dt><dd>{{ formatFuelPrice(station.latestPrice?.priceBase, station.latestPrice?.currency) }}</dd></div><div class="flex justify-between gap-2"><dt class="text-ui-mutedText">Cena końcowa</dt><dd class="font-semibold">{{ formatFuelPrice(station.latestPrice?.priceFinal, station.latestPrice?.currency) }}</dd></div><div class="flex justify-between gap-2"><dt class="text-ui-mutedText">Data ceny</dt><dd>{{ station.latestPrice?.priceDate || '—' }}</dd></div><div class="flex justify-between gap-2"><dt class="text-ui-mutedText">VAT</dt><dd>{{ station.latestPrice?.vat == null ? '—' : `${station.latestPrice.vat}%` }}</dd></div></dl>
    <AppButton size="sm" variant="secondary" class="mt-3 w-full" @click="$emit('history', station)"><History class="h-3.5 w-3.5" />Historia cen</AppButton>
  </section>
</template>
<script setup lang="ts">
import { History, X } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import type { FuelStation } from '@/types/fuelStation'
import { formatFuelPrice } from '@/utils/fuelStation'
defineProps<{ station: FuelStation }>()
defineEmits<{ close: []; history: [station: FuelStation] }>()
</script>
