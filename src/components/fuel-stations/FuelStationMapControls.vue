<template>
  <section class="ui-popover w-72 max-w-[calc(100vw-5rem)] space-y-3 p-3 text-ui-text" aria-label="Stacje paliw na mapie">
    <h2 class="ui-section-title">Stacje paliw</h2>
    <AppSwitch v-model="store.mapEnabled" label="Pokaż stacje" />
    <AppMultiSelect v-model="selectedCountries" :options="countries" size="sm" label="Kraje" :placeholder="store.mapFilters.countries === null ? 'Wszystkie kraje' : 'Żaden kraj'" all-selected-label="Wszystkie kraje" />
    <AppSelect v-model="store.mapFilters.currency" :options="currencies" size="sm" label="Waluta ceny" />
    <div class="grid grid-cols-2 gap-2"><AppInput v-model="store.mapFilters.minPrice" type="number" min="0" step="0.001" size="sm" label="Cena od" placeholder="Bez limitu" /><AppInput v-model="store.mapFilters.maxPrice" type="number" min="0" step="0.001" size="sm" label="Cena do" placeholder="Bez limitu" /></div>
    <p v-if="priceError" class="ui-error" role="alert">{{ priceError }}</p>
    <p class="ui-caption">Zakres dotyczy ceny końcowej w wybranej walucie. Stacje bez tej ceny nie są wtedy pokazywane.</p>
    <p v-if="store.isMapLoading" class="ui-caption" role="status">Pobieranie stacji…</p>
    <p v-else-if="store.mapError" class="ui-error" role="alert">{{ store.mapError }}</p>
    <p v-else-if="store.mapEnabled" class="ui-caption">Na mapie: {{ store.visibleMapStations.length }} stacji</p>
    <div class="flex items-center gap-2"><AppButton size="sm" variant="secondary" :disabled="store.isMapLoading" @click="store.loadMapStations(true)"><RefreshCw class="h-3.5 w-3.5" />Odśwież</AppButton><RouterLink to="/fuel-stations" class="ui-body-sm font-medium underline underline-offset-4">Zarządzaj stacjami</RouterLink></div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
const store = useFuelStationStore()
const countries = computed(() => [...new Set(store.allStations.map(s => s.country))].sort((a,b) => a.localeCompare(b, 'pl')).map(c => ({ value: c, label: c })))
const selectedCountries = computed({
  get: () => store.mapFilters.countries ?? countries.value.map(country => country.value),
  set: (selected: string[]) => {
    const allSelected = countries.value.length > 0 && countries.value.every(country => selected.includes(country.value))
    store.mapFilters.countries = allSelected ? null : selected
  },
})
const currencies = computed(() => [...new Set([store.mapFilters.currency, ...store.allStations.map(s => s.latestPrice?.currency).filter((c): c is string => Boolean(c))])].sort().map(c => ({ value: c, label: c })))
const priceError = computed(() => {
  const { minPrice, maxPrice } = store.mapFilters
  if ([minPrice, maxPrice].some(p => p !== '' && (!Number.isFinite(Number(p)) || Number(p) < 0))) return 'Podaj poprawną cenę.'
  if (minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)) return 'Cena od nie może być większa niż cena do.'
  return ''
})
</script>
