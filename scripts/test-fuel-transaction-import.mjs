import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const vue = require('vue')
const source = readFileSync(new URL('../src/components/fuel/FuelTransactionImportPanel.vue', import.meta.url), 'utf8')
const compiled = compileScript(parse(source).descriptor, { id: 'fuel-import' }).content
const js = ts.transpileModule(compiled, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function createPanel() {
  const pending = [], confirms = []
  const scope = vue.effectScope()
  let nextResult, nextError, dispose
  const fuelImportService = {
    previewAs24(file) { return new Promise(resolve => pending.push({ file, provider: 'AS24', resolve })) },
    async confirmAs24(file) { confirms.push({ provider: 'AS24', file }); return nextResult },
    previewEurowag(file) { return new Promise(resolve => pending.push({ file, provider: 'EUROWAG', resolve })) },
    async confirmEurowag(file) { confirms.push({ provider: 'EUROWAG', file }); return nextResult },
    async confirmE100(file) { confirms.push({ provider: 'E100', file }); return nextResult },
    previewE100(file) { return new Promise(resolve => pending.push({ file, provider: 'E100', resolve })) },
    preview(file) { return new Promise(resolve => pending.push({ file, resolve })) },
    async confirm(file) {
      confirms.push(file)
      if (nextError) throw nextError
      return nextResult
    },
  }
  const mocks = {
    vue: { ...vue, onBeforeUnmount: callback => { dispose = callback } },
    '@/services/api': { getApiErrorMessage: error => error.message },
    '@/services/fuelImportService': { fuelImportService },
  }
  const exports = {}
  vm.runInNewContext(js, { exports, require: name => mocks[name] || (name.endsWith('.vue') ? {} : require(name)) })
  const panel = scope.run(() => exports.default.setup({ canReadGps: true }, { expose() {} }))
  return { panel, pending, confirms, result: value => { nextResult = value; nextError = undefined },
    error: value => { nextError = value }, dispose: () => { dispose(); scope.stop() } }
}

const csv = new File(['row'], 'ids.csv')
const duplicate = { status: 'DUPLICATE' }
const fresh = { status: 'NEW' }
const flow = createPanel()
await flow.panel.selectFile(new File(['row'], 'wrong.xlsx'))
assert.equal(flow.pending.length, 0)
assert.match(flow.panel.selectionError.value, /CSV/)

const preview = flow.panel.selectFile(csv)
assert.equal(flow.pending[0].file, csv, 'Selecting a CSV starts its preview immediately')
await flow.panel.confirm()
assert.equal(flow.confirms.length, 0, 'Confirmation is blocked until preview finishes')
flow.pending[0].resolve({ rows: [fresh, duplicate], errors: [] })
await preview
assert.deepEqual(Array.from(flow.panel.summary.value, tile => tile.value), [1, 1, 0, 2])
flow.error(new Error('Brak połączenia'))
await flow.panel.confirm()
assert.equal(flow.panel.error.value, 'Brak połączenia')
assert.equal(flow.panel.lastImportId.value, undefined)
flow.result({ importId: 17, saved: 1, duplicates: 1, rejected: 0, queued: 1 })
await flow.panel.confirm()
assert.equal(flow.panel.lastImportId.value, 17, 'History refreshes only after a successful confirmation')
assert.deepEqual(Array.from(flow.panel.summary.value, tile => tile.value), [1, 1, 0, 1])
await flow.panel.confirm()
assert.equal(flow.confirms.length, 2, 'A successful confirmation cannot be submitted twice')
flow.panel.close()
assert.equal(flow.panel.lastImportId.value, 17)

const duplicatePreview = flow.panel.selectFile(csv)
flow.pending[1].resolve({ rows: [duplicate, duplicate], errors: [] })
await duplicatePreview
flow.result({ importId: 18, saved: 0, duplicates: 2, rejected: 0, queued: 0 })
await flow.panel.confirm()
assert.equal(flow.panel.lastImportId.value, 18, 'All-duplicate imports remain in import history')
assert.equal(flow.panel.result.value.queued, 0)

const pending = flow.panel.selectFile(csv)
flow.panel.close()
flow.pending[2].resolve({ rows: [fresh], errors: [] })
await pending
assert.equal(flow.panel.preview.value, null, 'A cancelled preview cannot reopen the dialog')
flow.dispose()
const pilot = createPanel()
pilot.panel.provider.value = 'E100'
const pilotRequest = pilot.panel.selectFile(new File(['row'], 'e100.csv'))
assert.equal(pilot.pending[0].provider, 'E100')
pilot.pending[0].resolve({ cards: 2, rows: [{ status: 'NEW', cardConflict: false }, { status: 'REVIEW', cardConflict: false }], errors: [] })
await pilotRequest
assert.equal(pilot.panel.e100Preview.value.cards, 2)
assert.equal(pilot.panel.e100Skipped.value, 1)
pilot.result({ importId: 19, saved: 1, duplicates: 0, rejected: 1, queued: 1 })
await pilot.panel.confirm()
assert.equal(pilot.confirms[0].provider, 'E100')
assert.equal(pilot.panel.lastImportId.value, 19)
pilot.panel.close()
assert.equal(pilot.panel.e100Preview.value, null)
pilot.dispose()
const eurowag = createPanel()
eurowag.panel.provider.value = 'EUROWAG'
assert.equal(eurowag.panel.providerOptions.some(option => option.value === 'EUROWAG'), true)
const ewRequest = eurowag.panel.selectFile(new File(['row'], 'EW_Export.csv'))
assert.equal(eurowag.pending[0].provider, 'EUROWAG')
eurowag.pending[0].resolve({ rows: [{ row: 2, status: 'NEW' }, { row: 3, status: 'DUPLICATE' }], errors: [], skippedZero: 0 })
await ewRequest
assert.deepEqual(Array.from(eurowag.panel.summary.value, tile => tile.value), [1, 1, 0, 2])
eurowag.result({ importId: 20, saved: 1, duplicates: 1, rejected: 0, queued: 1 })
await eurowag.panel.confirm()
assert.equal(eurowag.confirms[0].provider, 'EUROWAG')
assert.equal(eurowag.panel.lastImportId.value, 20)
eurowag.panel.close()
const ewDuplicates = eurowag.panel.selectFile(new File(['row'], 'EW_Export_again.csv'))
eurowag.pending[1].resolve({ rows: [duplicate, duplicate], errors: [], skippedZero: 0 })
await ewDuplicates
assert.equal(eurowag.panel.canConfirm.value, true)
eurowag.result({ importId: 21, saved: 0, duplicates: 2, rejected: 0, queued: 0 })
await eurowag.panel.confirm()
assert.equal(eurowag.panel.result.value.queued, 0)
eurowag.dispose()
const as24=createPanel()
as24.panel.provider.value='AS24'
await as24.panel.selectFile(new File(['row'],'as24.csv'))
assert.match(as24.panel.selectionError.value,/XLSX/)
assert.equal(as24.pending.length,0)
const as24Request=as24.panel.selectFile(new File(['xlsx'],'as24.xlsx'))
assert.equal(as24.pending[0].provider,'AS24')
as24.pending[0].resolve({rows:[fresh,duplicate,{status:'REVIEW'}],errors:[{line:5,column:null,reason:'Niepoprawny nośnik'}],skippedZero:0})
await as24Request
assert.equal(as24.panel.saveable.value,1)
assert.equal(as24.panel.reviewCount.value,1)
assert.equal(as24.panel.duplicateCount.value,1)
assert.deepEqual(Array.from(as24.panel.summary.value,tile=>tile.value),[1,1,1,1,4])
as24.result({importId:22,saved:1,duplicates:1,rejected:2,queued:1})
await as24.panel.confirm()
assert.equal(as24.confirms[0].provider,'AS24')
as24.panel.close()
const as24Review=as24.panel.selectFile(new File(['xlsx'],'as24-correction.xlsx'))
as24.pending[1].resolve({rows:[{status:'REVIEW'}],errors:[],skippedZero:0})
await as24Review
assert.equal(as24.panel.canConfirm.value,false)
const priorConfirms=as24.confirms.length
await as24.panel.confirm()
assert.equal(as24.confirms.length,priorConfirms)
as24.panel.close()
const as24Duplicates=as24.panel.selectFile(new File(['xlsx'],'as24-again.xlsx'))
as24.pending[2].resolve({rows:[duplicate],errors:[],skippedZero:0})
await as24Duplicates
assert.equal(as24.panel.canConfirm.value,true)
as24.panel.provider.value='IDS'
assert.equal(as24.panel.preview.value,null,'Changing provider cancels the previous provider preview')
as24.dispose()
console.log('Fuel transaction imports: AS24 XLSX, review safeguards, IDS, E100, Eurowag, automatic preview, summary, retry, duplicate-only history, and cancellation OK.')
