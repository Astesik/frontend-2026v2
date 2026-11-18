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
console.log('Fuel transaction imports: automatic preview, summary, retry, duplicate-only history, and cancellation OK.')
