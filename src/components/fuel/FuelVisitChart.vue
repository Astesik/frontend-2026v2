<template>
  <div>
  <div class="relative">
    <div ref="element" class="h-60 w-full" aria-label="Poziom paliwa od dwóch godzin przed środkiem wizyty do 24 godzin po nim" />
    <AppLoadingIndicator v-if="loading" class="absolute inset-0 bg-ui-surface/85" />
    <div v-else-if="error || !readings.length" class="pointer-events-none absolute inset-0 grid place-items-center px-4">
      <p class="rounded-md bg-ui-surface px-3 py-2 text-sm" :class="error ? 'ui-error' : 'text-ui-mutedText'" :role="error ? 'alert' : 'status'">
        {{ error || 'Brak odczytów poziomu paliwa w tych 26 godzinach.' }}
      </p>
    </div>
  </div>
  <div class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ui-mutedText">
    <span v-for="(label, state) in activityLabels" :key="state" class="flex items-center gap-1.5">
      <span class="h-2 w-2 rounded-sm" :style="{ backgroundColor: activityColors[state] }" />{{ label }}
    </span>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, MarkLineComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelVisitService, type Reading, type ActivityPoint } from '@/services/fuelVisitService'
import { activityLabels, visitActivity } from '@/utils/fuelVisitActivity'
import { visitCounters } from '@/utils/fuelVisitCounters'
import { useUiStore } from '@/stores/uiStore'

use([LineChart, GridComponent, MarkLineComponent, MarkAreaComponent, TooltipComponent, AriaComponent, CanvasRenderer])

const props = defineProps<{ id: number; runId: number | null; at: string }>()
const ui = useUiStore()
const element = ref<HTMLElement>()
const readings = shallowRef<Reading[]>([])
const error = ref(''), loading = ref(true)
const hour = 60 * 60 * 1000
const windowLength = 26 * hour
const start = computed(() => Date.parse(props.at) - 2 * hour)
const activityPoints = shallowRef<ActivityPoint[]>([])
const activity = computed(() => visitActivity(activityPoints.value, start.value, start.value + windowLength))
const activityColors = { driving: '#7093ff', idle: '#d6b466', parked: '#6ba38b', unknown: '#626a73' }
const clock = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' })
const timestamp = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
let chart: EChartsType | undefined
let observer: ResizeObserver | undefined

function draw() {
  if (!chart || !element.value) return
  const anchor = Date.parse(props.at)
  const styles = getComputedStyle(element.value)
  const color = (token: string) => 'rgb(' + styles.getPropertyValue('--rw-' + token).trim().split(/\s+/).join(',') + ')'
  const muted = color('text-muted')
  chart.setOption({
    animation: false, aria: { enabled: true },
    color: [color(ui.isDark ? 'info-400' : 'info-600')],
    grid: { top: 30, bottom: 32, right: 24, left: 49 },
    tooltip: {
      trigger: 'axis', renderMode: 'richText', confine: true,
      axisPointer: { label: { formatter: (p: { value: number }) => timestamp.format(p.value) } },
      formatter: (params: unknown) => {
        const point = (params as { value: [number, number]; axisValue: number }[])[0]
        if (!point) return ''
        const at = Number(point.axisValue)
        const segment = activity.value.find(segment => at >= segment.from && at < segment.to)
        const state = segment?.state ?? 'unknown'
        const counters = visitCounters(activityPoints.value, Date.parse(props.at), at)
        const metric = (value: number | null, unit: string) => value == null ? '—' : value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' ' + unit
        return timestamp.format(at) + '\nPoziom paliwa · ' + point.value[1].toLocaleString('pl-PL') + '%'
          + '\nDystans od tankowania · ' + metric(counters.distanceKm, 'km')
          + '\nZużyte paliwo · ' + metric(counters.consumedLiters, 'l')
          + '\n' + activityLabels[state] + (segment?.inferred ? '\nStan szacowany między odczytami' : '')
      },
    },
    xAxis: {
      type: 'time', min: anchor - 2 * hour, max: anchor + 24 * hour,
      axisLabel: { formatter: (v: number) => clock.format(v), color: muted, hideOverlap: true },
      axisLine: { lineStyle: { color: color('border') } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100, interval: 25, axisLabel: { formatter: '{value}%', color: muted },
      splitLine: { lineStyle: { color: color('divider') } },
    },
    series: [{
      name: 'Poziom paliwa', type: 'line', sampling: 'lttb', symbol: 'circle', symbolSize: 4,
      showSymbol: readings.value.length < 80,
      data: readings.value.map(p => [Date.parse(p.at), p.level]),
      markArea: {
        silent: true,
        data: activity.value.map(segment => [
          { xAxis: segment.from, itemStyle: { color: activityColors[segment.state], opacity: ui.isDark ? 0.18 : 0.1 } },
          { xAxis: segment.to },
        ]),
      },
      markLine: {
        silent: true, symbol: 'none', lineStyle: { color: muted, type: 'dashed' },
        label: { formatter: 'Środek wizyty', color: muted },
        data: [{ xAxis: anchor }],
      },
    }],
  }, { notMerge: true })
}
let activeRequest: AbortController | undefined
let fetching = false
async function load(reset: boolean) {
  if (fetching && !reset) return
  if (reset) activeRequest?.abort()
  const request = new AbortController()
  activeRequest = request
  fetching = true
  if (reset) {
    loading.value = true
    readings.value = []
    activityPoints.value = []
  }
  error.value = ''
  draw()
  await Promise.allSettled([
    fuelVisitService.levels(props.id, request.signal).then(data => {
      if (request.signal.aborted) return
      readings.value = data
    }).catch(cause => {
      if (!request.signal.aborted) error.value = getApiErrorMessage(cause)
    }).finally(() => {
      if (!request.signal.aborted) { loading.value = false; draw() }
    }),
    fuelVisitService.activity(props.id, request.signal).then(data => {
      if (!request.signal.aborted) { activityPoints.value = data; draw() }
    }),
  ])
  if (activeRequest === request) fetching = false
}
watch(() => [props.id, props.at], () => { void load(true) }, { immediate: true })
watch(() => props.runId, () => { void load(false) })
watch(() => ui.isDark, draw, { flush: 'post' })
onMounted(() => {
  const host = element.value
  if (!host) return
  function resize() {
    if (!host?.clientWidth || !host.clientHeight) return
    if (chart) chart.resize()
    else {
      chart = init(host)
      draw()
    }
  }
  resize()
  observer = new ResizeObserver(resize)
  observer.observe(host)
})
onBeforeUnmount(() => { activeRequest?.abort(); observer?.disconnect(); chart?.dispose(); readings.value = []; activityPoints.value = [] })
</script>
