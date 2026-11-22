<template>
  <p v-if="error" role="alert" class="ui-error">{{ error }}</p>
  <div ref="element" class="h-48 w-full" aria-label="Poziom paliwa z sondy w czasie wizyty" />
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, AriaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { fuelVisitService, type Reading } from '@/services/fuelVisitService'
import { getApiErrorMessage } from '@/services/api'
use([LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer])
const props = defineProps<{ id: number; runId: number }>()
const element = ref<HTMLElement>(), error = ref('')
const time = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' })
let chart: EChartsType | undefined, observer: ResizeObserver | undefined
let readings: Reading[] = []
function draw() {
  chart?.setOption({
    animation: false, aria: { enabled: true }, grid: { top: 12, bottom: 28, right: 20, left: 47 },
    tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: (v: number) => v + '%' },
    xAxis: { type: 'time', axisLabel: { formatter: (v: number) => time.format(v), hideOverlap: true } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{ name: 'Poziom sondy', type: 'line', showSymbol: true, sampling: 'lttb',
      data: readings.map(p => [Date.parse(p.at), p.level]) }],
  })
}
watch(() => [props.id, props.runId], async (_, __, cleanup) => {
  const request = new AbortController()
  cleanup(() => request.abort())
  try {
    const result = await fuelVisitService.levels(props.id, request.signal)
    if (request.signal.aborted) return
    readings = result
    error.value = ''
    draw()
  } catch (cause) { if (!request.signal.aborted) error.value = getApiErrorMessage(cause) }
}, { immediate: true })
onMounted(() => {
  if (!element.value) return
  chart = init(element.value)
  draw()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(element.value)
})
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>
