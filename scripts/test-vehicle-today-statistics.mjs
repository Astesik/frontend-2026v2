import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, effectScope, nextTick, reactive, ref, shallowRef, watch } from 'vue'

const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const utils = { exports: {} }
vm.runInNewContext(transpile(readFileSync(new URL('../src/utils/localPositionHistory.ts', import.meta.url), 'utf8')), utils)
const { historyMetric, localHistoryWarning } = utils.exports
assert.equal(localHistoryWarning('gaps_in_telemetry'), 'W danych pojazdu występują przerwy. Historia trasy może być niepełna.')
assert.equal(localHistoryWarning('GAPS_IN_TELEMETRY'), localHistoryWarning('gaps_in_telemetry'))
assert.equal(localHistoryWarning('PARTIAL_COUNTER_COVERAGE').includes('Niepełne pokrycie'), true)

const component = parse(readFileSync(new URL('../src/components/vehicles/VehicleTodayStatistics.vue', import.meta.url), 'utf8')).descriptor
assert.ok(component.template.content.includes('Dystans dziś'))
assert.ok(component.template.content.includes('Spalanie dziś'))
const ast = ts.createSourceFile('VehicleTodayStatistics.ts', component.scriptSetup.content, ts.ScriptTarget.Latest, true)
const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast)).join('\n')
const props = reactive({ vehicleId: 267, companyId: 1, enabled: true, refreshKey: 1 })
const settle = async () => { await new Promise(setImmediate); await nextTick() }
const calls = []
let dayStart = '2026-10-26T23:00:00.000Z'
const state = {
  computed, ref, shallowRef, watch, AbortController, historyMetric,
  defineProps: () => props,
  todayHistoryRange: () => ({ from: dayStart, to: '2026-10-27T22:03:55Z' }),
  localPositionHistoryService: { summary(body, signal) {
    return new Promise((resolve, reject) => calls.push({ body, signal, resolve, reject }))
  } },
}
const scope = effectScope()
scope.run(() => vm.runInNewContext(transpile(code) + '\nthis.api = { distanceLabel, consumptionLabel, error, loading }', state))
const { api } = state
const report = { summary: { distanceKm: 296.56, consumptionLPer100Km: 17.918, fuelUsedLiters: 53.139 } }
assert.equal(api.distanceLabel.value, 'Pobieranie…')
assert.equal(calls[0].body.vehicle_id, 267)
assert.equal(calls[0].body.from, dayStart)
calls[0].resolve(report)
await settle()
assert.equal(api.distanceLabel.value, '296,56 km')
assert.equal(api.consumptionLabel.value, '17,92 l/100 km (53,14 l)')

props.refreshKey++
await settle()
assert.equal(api.distanceLabel.value, '296,56 km', 'Keep the current values while refreshing the same day')
const stale = calls.at(-1)
props.vehicleId = 268
await settle()
assert.equal(stale.signal.aborted, true)
assert.equal(api.distanceLabel.value, 'Pobieranie…', 'Never display another vehicle’s figures')
stale.resolve({ summary: { distanceKm: 999 } })
await settle()
assert.equal(api.distanceLabel.value, 'Pobieranie…')
calls.at(-1).resolve({ summary: { distanceKm: 0, consumptionLPer100Km: 0, fuelUsedLiters: 0 } })
await settle()
assert.equal(api.distanceLabel.value, '0,00 km')
assert.equal(api.consumptionLabel.value, '0,00 l/100 km (0,00 l)')

dayStart = '2026-10-27T23:00:00.000Z'
props.refreshKey++
await settle()
assert.equal(api.distanceLabel.value, 'Pobieranie…', 'Clear yesterday’s statistics at Warsaw midnight')
calls.at(-1).resolve({ summary: { distanceKm: null, consumptionLPer100Km: null, fuelUsedLiters: null } })
await settle()
assert.equal(api.distanceLabel.value, '0 km')
assert.equal(api.consumptionLabel.value, '0 l/100 km')
props.refreshKey++
await settle()
calls.at(-1).resolve({ summary: null })
await settle()
assert.equal(api.distanceLabel.value, '0 km')
assert.equal(api.consumptionLabel.value, '0 l/100 km')
props.companyId = 2
await settle()
calls.at(-1).reject(new Error('Network error'))
await settle()
assert.equal(api.error.value, 'Nie udało się pobrać dzisiejszego podsumowania.')
assert.equal(api.loading.value, false)
assert.equal(api.distanceLabel.value, 'Brak danych', 'Request failures must not be presented as zero activity')
assert.equal(api.consumptionLabel.value, 'Brak danych')
props.refreshKey++
await settle()
const pending = calls.at(-1)
props.enabled = false
await settle()
assert.equal(pending.signal.aborted, true)
const count = calls.length
props.refreshKey++
await settle()
assert.equal(calls.length, count, 'No requests without permission or while the workspace is inactive')
props.enabled = true
await settle()
const unmounted = calls.at(-1)
scope.stop()
assert.equal(unmounted.signal.aborted, true)
unmounted.resolve(report)
await settle()
assert.equal(api.distanceLabel.value, 'Pobieranie…', 'Unmounted requests must not update the summary')
console.log('PASS: Polish telemetry warnings, daily distance/fuel formatting, zero/missing values, refresh, midnight rollover, vehicle/company changes, errors, permission checks and request cancellation.')

