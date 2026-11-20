<template>
  <div ref="element" class="h-64 w-full sm:h-80" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type ComposeOption, type EChartsType } from 'echarts/core'
import { BarChart, type BarSeriesOption } from 'echarts/charts'
import {
  AriaComponent, GridComponent, LegendComponent, TooltipComponent,
  type AriaComponentOption, type GridComponentOption, type LegendComponentOption, type TooltipComponentOption,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { FuelDashboardDay } from '@/services/fuelImportService'
import { useUiStore } from '@/stores/uiStore'

use([BarChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{ daily: FuelDashboardDay[] }>()
const ui = useUiStore()
const element = ref<HTMLDivElement | null>(null)
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const shortDate = (date: string) => date.slice(5).split('-').reverse().join('.')
const liters = (value: number) => number.format(value) + ' l'

let chart: EChartsType | undefined
let observer: ResizeObserver | undefined

function render() {
  if (!chart || !element.value) return
  const styles = getComputedStyle(element.value)
  const color = (token: string) => `rgb(${styles.getPropertyValue(`--rw-${token}`).trim().split(/\s+/).join(',')})`
  const mutedText = color('text-muted')

  const option: ComposeOption<BarSeriesOption | AriaComponentOption | GridComponentOption | LegendComponentOption | TooltipComponentOption> = {
    aria: { enabled: true, label: { description: 'Wykres dziennych ilości oleju napędowego i AdBlue w litrach.' } },
    color: [color(ui.isDark ? 'info-400' : 'info-600'), color(ui.isDark ? 'success-400' : 'success-600')],
    legend: { top: 0, textStyle: { color: color('text-secondary') } },
    grid: { top: 38, right: 12, bottom: 8, left: 8, outerBoundsContain: 'axisLabel' },
    tooltip: {
      trigger: 'axis',
      renderMode: 'richText',
      confine: true,
      axisPointer: { type: 'shadow' },
      backgroundColor: color('surface-elevated'),
      borderColor: color('border'),
      textStyle: { color: color('text-primary') },
      valueFormatter: value => typeof value === 'number' ? liters(value) : '',
    },
    xAxis: {
      type: 'category',
      data: props.daily.map(day => shortDate(day.date)),
      axisLabel: { color: mutedText, hideOverlap: true },
      axisLine: { lineStyle: { color: color('border') } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: mutedText, formatter: liters },
      splitLine: { lineStyle: { color: color('divider') } },
    },
    series: [
      { name: 'Olej napędowy', type: 'bar', data: props.daily.map(day => day.dieselLiters), barMaxWidth: 24 },
      { name: 'AdBlue', type: 'bar', data: props.daily.map(day => day.adBlueLiters), barMaxWidth: 24 },
    ],
  }
  chart.setOption(option)
}

onMounted(() => {
  const host = element.value
  if (!host) return
  observer = new ResizeObserver(([entry]) => {
    if (!entry?.contentRect.width || !entry.contentRect.height) return
    if (chart) {
      chart.resize()
    } else {
      chart = init(host)
      render()
    }
  })
  observer.observe(host)
})

watch([() => props.daily, () => ui.isDark], render, { flush: 'post' })

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>
