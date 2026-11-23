<template><div ref="element" class="h-64 w-full" aria-label="Porównanie spalania CAN i z zakupów w cyklach sąsiednich" /></template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useUiStore } from '@/stores/uiStore'
import type { AutomaticCycle } from '@/services/fuelConsumptionService'
use([LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])
const props = defineProps<{ cycles: AutomaticCycle[] }>()
const element = ref<HTMLElement>()
const ui = useUiStore()
let chart: EChartsType | undefined, observer: ResizeObserver | undefined
const date = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
function draw() {
  if (!chart || !element.value) return
  const styles = getComputedStyle(element.value)
  const color = (token: string) => 'rgb(' + styles.getPropertyValue('--rw-' + token).trim().split(/\s+/).join(',') + ')'
  chart.setOption({
    animation: false, aria: { enabled: true },
    color: ['#7093ff', '#6ba38b'],
    legend: { top: 0, textStyle: { color: color('text-muted') } },
    grid: { top: 40, left: 52, right: 16, bottom: 42 },
    tooltip: { trigger: 'axis', renderMode: 'richText', confine: true,
      valueFormatter: (value: number) => value == null ? '—' : value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' l/100 km' },
    xAxis: { type: 'category', data: props.cycles.map(c => date.format(new Date(c.result.to))),
      axisLabel: { hideOverlap: true, color: color('text-muted') }, axisLine: { lineStyle: { color: color('border') } } },
    yAxis: { type: 'value', name: 'l/100 km', nameTextStyle: { color: color('text-muted') },
      axisLabel: { color: color('text-muted') }, splitLine: { lineStyle: { color: color('divider') } } },
    series: [
      { name: 'CAN', type: 'line', data: props.cycles.map(c => c.result.canPer100Km), symbolSize: 7, connectNulls: false },
      { name: 'Z zakupów', type: 'line', data: props.cycles.map(c => c.result.purchasesPer100Km), symbolSize: 7, connectNulls: false },
    ],
  }, { notMerge: true })
}
onMounted(() => {
  const host = element.value
  if (!host) return
  function resize() {
    if (!host?.clientWidth || !host.clientHeight) return
    if (chart) chart.resize()
    else { chart = init(host); draw() }
  }
  resize()
  observer = new ResizeObserver(resize)
  observer.observe(host)
})
watch([() => props.cycles, () => ui.isDark], draw, { flush: 'post' })
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>

