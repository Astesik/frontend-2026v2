import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { estimateFuelTankLevels } from '../src/utils/fuelTanks.ts'

const require = createRequire(import.meta.url)
const vue = require('vue')
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const tank = (slot, capacity) => ({ slot, product: slot === 'ADBLUE' ? 'ADBLUE' : 'DIESEL', nominalCapacityLiters: capacity, usableCapacityLiters: null })
const profile = {
  id: 1, validFrom: '2020-01-01T00:00:00Z', validTo: null,
  connection: 'CONNECTED', levelSource: 'CAN', levelTank: 'LEFT',
  tanks: [tank('LEFT', 530), tank('RIGHT', 330), tank('ADBLUE', 135)],
}
const observation = percent => ({ percent, source: { provider: 'GPS_ONLINE', recordedAt: '2026-11-19T10:00:00Z' } })

const levels = estimateFuelTankLevels(profile, observation(40))
assert.deepEqual(levels.tanks.map(item => item.estimatedLiters), [212, 132, null])
assert.equal(levels.totalLiters, 344, 'The total includes both connected diesel tanks and excludes AdBlue')
assert.equal(estimateFuelTankLevels(profile, observation(0)).totalLiters, 0)
assert.equal(estimateFuelTankLevels(profile, observation(100)).totalLiters, 860)
assert.equal(estimateFuelTankLevels({ ...profile, connection: 'UNKNOWN' }, observation(40)).totalLiters, 344)
const separate = estimateFuelTankLevels({ ...profile, connection: 'SEPARATE' }, observation(40))
assert.deepEqual(separate.tanks.map(item => item.estimatedLiters), [212, null, null])
assert.equal(separate.totalLiters, null, 'A partial measurement cannot be presented as a full total')
for (const percent of [null, -1, 101, NaN, Infinity]) assert.equal(estimateFuelTankLevels(profile, observation(percent)).totalLiters, null)
for (const change of [{ levelTank: 'UNKNOWN' }, { levelSource: 'UNKNOWN' }, { validFrom: '2027-01-01T00:00:00Z' }, { validTo: '2026-01-01T00:00:00Z' }]) {
  assert.equal(estimateFuelTankLevels({ ...profile, ...change }, observation(40)).totalLiters, null)
}
assert.equal(estimateFuelTankLevels(profile, { ...observation(40), source: { provider: 'FLESPI', recordedAt: '2026-11-19T10:00:00Z' } }).totalLiters, null)
assert.equal(estimateFuelTankLevels(null, observation(40)).totalLiters, null)

function evaluate(source, mocks = {}) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, require: name => mocks[name] || (name.endsWith('.vue') ? {} : require(name)) })
  return exports
}
const dates = evaluate(read('src/utils/date.ts'))
const returns = evaluate(read('src/utils/vehicleReturn.ts'))
const historyTime = evaluate(read('src/utils/historyTime.ts'), { './vehicleReturn': returns })
const scope = vue.effectScope()
const writes = []
const compiled = compileScript(parse(read('src/components/vehicles/VehicleFuelTanks.vue')).descriptor, { id: 'tanks-test' }).content
const component = evaluate(compiled, {
  vue: { ...vue, onMounted() {} },
  '@/services/api': { getApiErrorMessage: cause => cause.message },
  '@/services/fuelTankService': { fuelTankService: {
    async save(vehicle, value) { writes.push({ vehicle, value }) },
    async view() { return { profiles: [], quality: null } },
  } },
  '@/utils/historyTime': historyTime,
  '@/utils/vehicleReturn': returns,
  '@/utils/date': dates,
  '@/composables/useWorkspace': { useWorkspacePolling() {} },
})
const props = vue.reactive({ vehicleId: 42, canManage: true, make: 'MAN', firstRegistration: '2020-02-29' })
const panel = scope.run(() => component.default.setup(props, { expose() {}, emit() {} }))
panel.openEditor()
assert.equal(panel.form.connection, 'CONNECTED')
assert.equal(panel.form.levelTank, 'LEFT')
assert.deepEqual(Array.from(panel.form.tanks, item => item.nominal), ['530', '330', '135'])
assert.ok(panel.connections.every(item => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(item.label)))
assert.ok(panel.levelTanks.every(item => !item.label.includes('—')))
panel.effectiveFrom.value = dates.parseTypedDate('12.03.2021')
panel.form.useFirstRegistration = true
assert.equal(panel.effectiveFrom.value, '2020-02-29')
panel.form.useFirstRegistration = false
assert.equal(panel.effectiveFrom.value, '2021-03-12', 'Unchecking the registration date restores the manually entered date')
panel.form.useFirstRegistration = true
await panel.save()
assert.equal(writes[0].vehicle, 42)
assert.equal(writes[0].value.validFrom, '2020-02-28T23:00:00.000Z', 'First registration starts at midnight in Europe/Warsaw')
assert.equal(writes[0].value.connection, 'CONNECTED')
assert.equal(writes[0].value.levelTank, 'LEFT')
assert.equal(panel.formError.value, '')
panel.openEditor()
panel.effectiveFrom.value = dates.parseTypedDate('01.07.2021')
await panel.save()
assert.equal(writes[1].value.validFrom, '2021-06-30T22:00:00.000Z', 'Pasted dates also use the correct summer-time offset')
scope.stop()
console.log('PASS: connected tank estimates, separate tanks, AdBlue, missing readings, profile dates, defaults and first-registration date selection.')
