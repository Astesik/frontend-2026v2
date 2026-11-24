<template>
  <section class="space-y-2" aria-label="Spalanie skorygowane o poziom paliwa">
    <h3 class="flex items-center gap-2 text-sm font-semibold"><IconAdjustments class="h-4 w-4 text-ui-icon" />Korekta o poziom paliwa</h3>
    <p v-if="!adjusted" class="text-sm text-ui-mutedText">Wynik skorygowany oczekuje na przeliczenie.</p>
    <template v-else>
      <div class="grid gap-2 sm:grid-cols-3">
        <dl v-for="item in levels" :key="item.label" class="rounded-lg border border-ui-divider p-3">
          <dt class="text-xs text-ui-mutedText">{{ item.label }}</dt><dd class="mt-1 font-semibold tabular-nums">{{ amount(item.value, item.unit) }}</dd>
          <dd v-if="item.at" class="mt-1 text-xs text-ui-mutedText">{{ date(item.at) }}</dd><dd v-if="item.method" class="text-xs text-ui-mutedText">{{ item.method === 'STABLE_POST_REFUEL' ? 'Stabilny poziom' : 'Maksimum · szacunek' }}</dd>
        </dl>
      </div>
      <p v-if="adjusted.fuelCorrectionLiters != null" class="text-sm tabular-nums">Korekta paliwa <strong>{{ adjusted.fuelCorrectionLiters > 0 ? '+' : '' }}{{ amount(adjusted.fuelCorrectionLiters, 'l') }}</strong> · Zużycie skorygowane <strong>{{ amount(adjusted.adjustedFuelConsumedLiters, 'l') }}</strong></p>
      <ul v-if="adjusted.issues.length" class="list-inside list-disc text-sm text-warning-600 dark:text-warning-400"><li v-for="issue in adjusted.issues" :key="issue">{{ reasons[issue] || issue }}</li></ul>
      <p class="text-xs text-ui-mutedText">Szacunek liniowy z poziomu paliwa i nominalnej pojemności zbiorników ON. Korekta = (poziom początkowy − końcowy) × pojemność / 100.</p>
      <p v-if="adjusted.warnings.length" class="text-xs text-ui-mutedText">{{ adjusted.warnings.map(code => reasons[code] || code).join(' ') }}</p>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { IconAdjustments } from '@tabler/icons-vue'
import type { AdjustedFuelConsumption } from '@/services/fuelConsumptionService'
const props = defineProps<{ adjusted?: AdjustedFuelConsumption | null }>()
const amount = (value: number | null | undefined, unit: string) => value == null ? '—' : value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' ' + unit
const date = (at: string) => new Date(at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
const levels = computed(() => [
  { label: 'Po tankowaniu początkowym', value: props.adjusted?.start.level?.level, unit: '%', at: props.adjusted?.start.level?.at, method: props.adjusted?.start.method },
  { label: 'Po tankowaniu końcowym', value: props.adjusted?.end.level?.level, unit: '%', at: props.adjusted?.end.level?.at, method: props.adjusted?.end.method },
  { label: 'Pojemność zbiorników ON', value: props.adjusted?.tankCapacityLiters, unit: 'l', at: undefined, method: undefined },
])
const reasons: Record<string, string> = {
  MISSING_START_LEVEL: 'Brak poziomu po tankowaniu początkowym.', MISSING_END_LEVEL: 'Brak poziomu po tankowaniu końcowym.',
  START_LEVEL_OBSERVING: 'Obserwacja poziomu po tankowaniu początkowym trwa.', END_LEVEL_OBSERVING: 'Obserwacja poziomu po tankowaniu końcowym trwa.',
  MISSING_START_CAPACITY: 'Brak profilu zbiorników na początku cyklu.', MISSING_END_CAPACITY: 'Brak profilu zbiorników na końcu cyklu.',
  UNSUPPORTED_START_TANK_SCOPE: 'Początkowy pomiar nie obejmuje porównywalnie wszystkich zbiorników ON.', UNSUPPORTED_END_TANK_SCOPE: 'Końcowy pomiar nie obejmuje porównywalnie wszystkich zbiorników ON.',
  UNKNOWN_START_LEVEL_SOURCE: 'Nieznane źródło początkowego pomiaru poziomu.', UNKNOWN_END_LEVEL_SOURCE: 'Nieznane źródło końcowego pomiaru poziomu.',
  CAPACITY_CHANGED: 'Pojemność zbiorników zmieniła się w cyklu.', LEVEL_SOURCE_CHANGED: 'Źródło pomiaru poziomu zmieniło się pomiędzy tankowaniami.',
  INVALID_DISTANCE: 'Brak wiarygodnego dodatniego dystansu.', INVALID_PURCHASES: 'Brak prawidłowej sumy zakupów ON.',
  NEGATIVE_ADJUSTED_FUEL: 'Korekta daje ujemne zużycie. Sprawdź poziomy i pojemność zbiorników.',
  START_PEAK_ESTIMATE: 'Na początku użyto maksimum poziomu, bez potwierdzonej stabilizacji.', END_PEAK_ESTIMATE: 'Na końcu użyto maksimum poziomu, bez potwierdzonej stabilizacji.',
}
</script>
