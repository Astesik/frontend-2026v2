<template>
  <div class="relative h-72 min-w-0" :aria-label="label">
    <div ref="element" class="h-full w-full" />
    <AppLoadingIndicator v-if="!hasData && report?.processing && ['trend', 'ranking', 'differences'].includes(kind)" label="Przeliczanie cykli…" class="absolute inset-0" />
    <p v-else-if="!hasData" class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ui-mutedText">{{ emptyMessage }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useUiStore } from '@/stores/uiStore'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { fuelOverviewOption, hasOverviewData, overviewChartFingerprint, type OverviewChartKind, type DifferenceUnit } from '@/utils/fuelOverviewCharts'
import type { FuelOverview, OverviewMethod } from '@/services/fuelOverviewService'
use([BarChart, LineChart, PieChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, GraphicComponent, CanvasRenderer])
const props = withDefaults(defineProps<{ report: FuelOverview | null; kind: OverviewChartKind; label: string; method?: OverviewMethod; unit?: DifferenceUnit; emptyMessage?: string }>(), { method: 'can', unit: 'PERCENT', emptyMessage: 'Brak danych dla wybranego zakresu.' })
const ui = useUiStore(), element = ref<HTMLElement>()
const hasData = computed(() => hasOverviewData(props.report, props.kind, props.method))
let fingerprint = ''
let chart: EChartsType | undefined, observer: ResizeObserver | undefined
function draw() {
  if (!chart || !element.value) return
  if (!props.report || !hasData.value) { if (fingerprint !== 'empty') chart.clear(); fingerprint = 'empty'; return }
  const nextFingerprint = overviewChartFingerprint(props.report, props.kind, props.method, props.unit) + '|' + ui.isDark
  if (nextFingerprint === fingerprint) return
  fingerprint = nextFingerprint
  const styles = getComputedStyle(element.value)
  const color = (token: string) => 'rgb(' + styles.getPropertyValue('--rw-' + token).trim().split(/\s+/).join(',') + ')'
  chart.setOption(fuelOverviewOption(props.report, props.kind, props.method, props.unit, color), { notMerge: false, replaceMerge: ['series'], lazyUpdate: true })
}
onMounted(() => {
  const host = element.value
  if (!host) return
  function resize() { if (!host?.clientWidth || !host.clientHeight) return; if (chart) chart.resize(); else { chart = init(host); draw() } }
  resize(); observer = new ResizeObserver(resize); observer.observe(host)
})
watch([() => props.report, () => props.kind, () => props.method, () => props.unit, () => ui.isDark], draw, { flush: 'post' })
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose() })
</script>
