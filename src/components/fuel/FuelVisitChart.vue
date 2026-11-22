<template>
  <div class="relative">
    <div ref="element" class="h-60 w-full" aria-label="Poziom paliwa od dwóch godzin przed transakcją do 24 godzin po niej" />
    <AppLoadingIndicator v-if="loading" class="absolute inset-0 bg-ui-surface/85" />
    <div v-else-if="error || !readings.length" class="pointer-events-none absolute inset-0 grid place-items-center px-4">
      <p class="rounded-md bg-ui-surface px-3 py-2 text-sm" :class="error ? 'ui-error' : 'text-ui-mutedText'" :role="error ? 'alert' : 'status'">
        {{ error || 'Brak odczytów poziomu paliwa w tych 26 godzinach.' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelVisitService, type Reading } from '@/services/fuelVisitService'
import { useUiStore } from '@/stores/uiStore'

use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, AriaComponent, CanvasRenderer])

const props = defineProps<{ id: number; runId: number | null; purchaseId: number; at: string }>()
const ui = useUiStore()
const element = ref<HTMLElement>()
const readings = shallowRef<Reading[]>([])
const error = ref(''), loading = ref(true)
const hour = 60 * 60 * 1000
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
      valueFormatter: (value: number) => value.toLocaleString('pl-PL') + '%',
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
      markLine: {
        silent: true, symbol: 'none', lineStyle: { color: muted, type: 'dashed' },
        label: { formatter: 'Transakcja', color: muted },
        data: [{ xAxis: anchor }],
      },
    }],
  })
}
watch(() => [props.id, props.purchaseId, props.at, props.runId], async (current, previous, cleanup) => {
  const request = new AbortController()
  cleanup(() => request.abort())
  if (!previous || current.slice(0, 3).some((key, i) => key !== previous[i])) {
    loading.value = true
    readings.value = []
  }
  error.value = ''
  draw()
  try {
    const data = await fuelVisitService.levels(props.id, props.purchaseId, request.signal)
    if (!request.signal.aborted) readings.value = data
  } catch (cause) {
    if (!request.signal.aborted) {
      error.value = getApiErrorMessage(cause)
      readings.value = []
    }
  } finally {
    if (!request.signal.aborted) {
      loading.value = false
      draw()
    }
  }
}, { immediate: true })
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
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>
