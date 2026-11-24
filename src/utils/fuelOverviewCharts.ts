import type { EChartsOption } from 'echarts'
import type { FuelOverview, OverviewMethod, OverviewBucket } from '@/services/fuelOverviewService'
export type OverviewChartKind = 'trend' | 'refuel' | 'status' | 'ranking' | 'differences' | 'stations'
export type DifferenceUnit = 'PERCENT' | 'LITERS'
const colors = ['#7093ff', '#6ba38b', '#bc93dd']
const names = ['CAN', 'Transakcje paliwowe', 'Skorygowane']
const keys: OverviewMethod[] = ['can', 'transactions', 'adjusted']
const number = (value: number | null | undefined, unit = '') => value == null ? '—' : value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '')
const date = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw' })
export function overviewPeriodLabel(value: string, bucket: OverviewBucket) {
  if (bucket === 'MONTH') return value.slice(5, 7) + '.' + value.slice(0, 4)
  if (bucket === 'WEEK') {
    const end = new Date(value + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 6)
    const through = end.toISOString().slice(0, 10)
    const first = value.slice(8, 10) + '.' + value.slice(5, 7)
    const last = through.slice(8, 10) + '.' + through.slice(5, 7) + '.' + through.slice(0, 4)
    return first + (value.slice(0, 4) !== through.slice(0, 4) ? '.' + value.slice(0, 4) : '') + '-' + last
  }
  return date(value)
}
export function overviewChartFingerprint(report: FuelOverview, kind: OverviewChartKind, method: OverviewMethod, unit: DifferenceUnit) {
  const data = kind === 'trend' ? report.trend : kind === 'refuel' ? report.daily : kind === 'status' ? report.status : kind === 'stations' ? report.stations : report.vehicles
  return JSON.stringify([kind, kind === 'trend' || kind === 'refuel' ? report.bucket : null, method, unit, data])
}
type Param = { dataIndex: number; seriesIndex: number; seriesName: string; name?: string; percent?: number; value?: unknown }
const params = (value: unknown) => (Array.isArray(value) ? value : [value]) as Param[]
export function refuelingPeriods(report: FuelOverview) {
  const grouped = new Map<string, { date: string; dieselLiters: number; adBlueLiters: number }>()
  for (const day of report.daily) {
    const d = new Date(day.date + 'T12:00:00Z')
    if (report.bucket === 'MONTH') d.setUTCDate(1)
    if (report.bucket === 'WEEK') d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7)
    const key = d.toISOString().slice(0, 10)
    const item = grouped.get(key) || { date: key, dieselLiters: 0, adBlueLiters: 0 }
    item.dieselLiters += day.dieselLiters; item.adBlueLiters += day.adBlueLiters; grouped.set(key, item)
  }
  return [...grouped.values()]
}
export function hasOverviewData(report: FuelOverview | null | undefined, kind: OverviewChartKind, method: OverviewMethod) {
  if (!report) return false
  switch (kind) {
    case 'trend': return report.trend.some(p => keys.some(key => p.methods[key].rate != null))
    case 'refuel': return report.daily.some(p => p.dieselLiters > 0 || p.adBlueLiters > 0)
    case 'status': return Boolean(report.status && report.status.full + report.status.partial + report.status.unknown)
    case 'ranking': return report.vehicles.some(p => p.methods[method].rate != null)
    case 'differences': return report.vehicles.some(p => p.methods.transactionDifferenceLiters != null || p.methods.adjustedDifferenceLiters != null)
    case 'stations': return report.stations.length > 0
  }
}
export function fuelOverviewOption(report: FuelOverview, kind: OverviewChartKind, method: OverviewMethod,
  unit: DifferenceUnit, color: (token: string) => string): EChartsOption {
  const muted = color('text-muted'), divider = color('divider')
  const base: EChartsOption = {
    animation: false, aria: { enabled: true }, color: colors,
    tooltip: { trigger: 'axis', renderMode: 'richText', confine: true, backgroundColor: color('surface-elevated'), borderColor: color('border'), textStyle: { color: color('text-primary') } },
    legend: { top: 0, itemWidth: 14, itemGap: 10, textStyle: { color: muted, fontSize: 11 } },
    grid: { top: 42, left: 10, right: 20, bottom: 10, containLabel: true },
  }
  const category = (values: string[], inverse = false) => ({ type: 'category' as const, data: values, inverse, axisLabel: { color: muted, hideOverlap: true }, axisTick: { show: false }, axisLine: { lineStyle: { color: divider } } })
  const valueAxis = (label: string) => ({ type: 'value' as const, name: label, nameTextStyle: { color: muted }, axisLabel: { color: muted, hideOverlap: true }, splitLine: { lineStyle: { color: divider } } })
  if (kind === 'trend') {
    return { ...base, xAxis: category(report.trend.map(p => overviewPeriodLabel(p.date, report.bucket))),
      yAxis: { ...valueAxis('l/100 km'), scale: true, min: ({ min }) => Number.isFinite(min) ? Math.max(0, Math.floor(min - 5)) : 0, max: ({ max }) => Number.isFinite(max) ? Math.ceil(max + 5) : 10 },
      tooltip: { ...base.tooltip, formatter: (raw: unknown) => {
        const items = params(raw), p = report.trend[items[0]?.dataIndex ?? -1]
        return p ? [overviewPeriodLabel(p.date, report.bucket), ...keys.map((key, i) => { const m = p.methods[key]; return names[i] + ': ' + number(m.rate, 'l/100 km') + ' · ' + m.cycles + ' cykli · ' + number(m.distanceKm, 'km') })].join('\n') : ''
      } },
      series: keys.map((key, i) => ({ name: names[i], type: 'line', symbolSize: 7, connectNulls: false, data: report.trend.map(p => p.methods[key].rate) })),
    }
  }
  if (kind === 'refuel') {
    const periods = refuelingPeriods(report)
    return { ...base, xAxis: category(periods.map(p => overviewPeriodLabel(p.date, report.bucket))), yAxis: valueAxis('l'),
      tooltip: { ...base.tooltip, valueFormatter: (v: unknown) => typeof v === 'number' ? number(v, 'l') : '—' },
      series: [{ name: 'Olej napędowy', type: 'bar', barMaxWidth: 24, data: periods.map(p => p.dieselLiters) }, { name: 'AdBlue', type: 'bar', barMaxWidth: 24, data: periods.map(p => p.adBlueLiters) }],
    }
  }
  if (kind === 'status') {
    const status = report.status!, total = status.full + status.partial + status.unknown
    return { ...base, color: ['#6ba38b', '#7093ff', '#d8a854'],
      legend: { bottom: 0, textStyle: { color: muted }, selectedMode: false },
      tooltip: { ...base.tooltip, trigger: 'item', formatter: (raw: unknown) => { const p = params(raw)[0]!; return p.name + '\n' + number(typeof p.value === 'number' ? p.value : null) + ' wizyt · ' + number(p.percent, '%') } },
      graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: number(total), fill: color('text-primary'), fontSize: 32, fontWeight: 600 } }, { type: 'text', left: 'center', top: '51%', style: { text: 'Tankowania', fill: muted, fontSize: 12 } }],
      series: [{ name: 'Status tankowań', type: 'pie', radius: ['56%', '76%'], center: ['50%', '45%'], label: { show: false }, data: [{ name: 'Do pełna', value: status.full }, { name: 'Częściowe', value: status.partial }, { name: 'Do weryfikacji', value: status.unknown }] }],
    }
  }
  if (kind === 'ranking') {
    const rows = report.vehicles.filter(v => v.methods[method].rate != null).sort((a, b) => b.methods[method].rate! - a.methods[method].rate! || a.plate.localeCompare(b.plate)).slice(0, 12)
    return { ...base, legend: { show: false }, grid: { top: 28, left: 10, right: 22, bottom: 36, containLabel: true }, xAxis: { ...valueAxis('l/100 km'), nameLocation: 'middle', nameGap: 26 }, yAxis: category(rows.map(p => p.plate), true),
      tooltip: { ...base.tooltip, formatter: (raw: unknown) => { const p = rows[params(raw)[0]?.dataIndex ?? -1]; if (!p) return ''; const m = p.methods[method]; return [p.plate, number(m.rate, 'l/100 km'), number(m.distanceKm, 'km') + ' · ' + m.cycles + ' cykli', number(m.liters, 'l')].join('\n') } },
      series: [{ name: names[keys.indexOf(method)], type: 'bar', barMaxWidth: 22, itemStyle: { color: colors[keys.indexOf(method)] }, data: rows.map(p => p.methods[method].rate) }],
    }
  }
  if (kind === 'differences') {
    const suffix = unit === 'PERCENT' ? '%' : 'l'
    const tx = (v: FuelOverview['vehicles'][number]) => unit === 'PERCENT' ? v.methods.transactionDifferencePercent : v.methods.transactionDifferenceLiters
    const adjusted = (v: FuelOverview['vehicles'][number]) => unit === 'PERCENT' ? v.methods.adjustedDifferencePercent : v.methods.adjustedDifferenceLiters
    const size = (v: FuelOverview['vehicles'][number]) => Math.max(Math.abs(tx(v) || 0), Math.abs(adjusted(v) || 0))
    const rows = report.vehicles.filter(v => tx(v) != null || adjusted(v) != null).sort((a, b) => size(b) - size(a) || a.plate.localeCompare(b.plate)).slice(0, 12)
    const max = Math.max(1, Math.ceil(Math.max(...rows.map(size), 0) * 1.1))
    return { ...base, color: colors.slice(1), grid: { top: 42, left: 10, right: 20, bottom: 36, containLabel: true }, xAxis: { ...valueAxis(suffix), min: -max, max, nameLocation: 'middle', nameGap: 26 }, yAxis: category(rows.map(p => p.plate), true),
      tooltip: { ...base.tooltip, formatter: (raw: unknown) => { const p = rows[params(raw)[0]?.dataIndex ?? -1]; return p ? [p.plate, 'Transakcje paliwowe: ' + number(tx(p), suffix), 'Skorygowane: ' + number(adjusted(p), suffix), 'Względem CAN na wspólnych cyklach danej pary metod'].join('\n') : '' } },
      series: [{ name: names[1], type: 'bar', barMaxWidth: 16, data: rows.map(tx) }, { name: names[2], type: 'bar', barMaxWidth: 16, data: rows.map(adjusted) }],
    }
  }
  const rows = report.stations
  return { ...base, legend: { show: false }, grid: { top: 28, left: 10, right: 24, bottom: 36, containLabel: true }, xAxis: { ...valueAxis('wizyty'), minInterval: 1, nameLocation: 'middle', nameGap: 26 }, yAxis: { ...category(rows.map(p => p.name), true), axisLabel: { color: muted, width: 180, overflow: 'truncate' } },
    tooltip: { ...base.tooltip, formatter: (raw: unknown) => { const p = rows[params(raw)[0]?.dataIndex ?? -1]; return p ? [p.name, p.visits + ' wizyt', 'Olej napędowy: ' + number(p.dieselLiters, 'l'), 'AdBlue: ' + number(p.adBlueLiters, 'l')].join('\n') : '' } },
    series: [{ name: 'Wizyty', type: 'bar', barMaxWidth: 24, data: rows.map(p => p.visits) }],
  }
}
