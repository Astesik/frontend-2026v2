import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as Vue from 'vue'
import { compile } from '@vue/compiler-dom'
import { parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'

const source = readFileSync(new URL('../src/services/repairService.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const requests = []
let fault = { id: 26, repairId: 45, description: 'plandeka do poklejenia', status: 'done', repairedBy: { id: 2, username: 'AKosmala' }, repairedAt: '2026-11-02T10:15:00Z', createdBy: { id: 3, username: 'operator' }, createdAt: '2026-06-22T18:44:39Z', comments: [], photos: [] }
const api = {
  get: async () => ({ data: [fault] }),
  patch: async (url, payload) => { requests.push({ url, payload }); return { data: fault } },
}
const presentationSource = readFileSync(new URL('../src/utils/repairPresentation.ts', import.meta.url), 'utf8')
const presentationCode = ts.transpileModule(presentationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const presentation = {}
vm.runInNewContext(presentationCode, { exports: presentation })
const exports = {}
vm.runInNewContext(code, { exports, require(name) {
  if (name === './api') return { api }
  if (name === '@/utils/repairPresentation') return presentation
  throw new Error(name)
}, URL })
const service = exports.repairService

const completed = await service.updateRepairFaultStatus(45, 26, { status: 'done' })
assert.equal(completed.repairedBy.id, 2)
assert.equal(completed.repairedBy.username, 'AKosmala')
assert.equal(completed.repairedAt, '2026-11-02T10:15:00Z')
assert.deepEqual(requests[0], { url: '/api/repairs/45/faults/26/status', payload: { status: 'done' } }, 'Actor and timestamp must never be sent by the client')
const [listed] = await service.getRepairFaults(45)
assert.equal(listed.repairedBy.username, 'AKosmala')

fault = { ...fault, status: 'open', repairedBy: null, repairedAt: null }
const reopened = await service.updateRepairFaultStatus(45, 26, { status: 'open' })
assert.equal(reopened.repairedBy, null)
assert.equal(reopened.repairedAt, null)

fault = { ...fault, status: 'done', repairedBy: undefined, repairedAt: '2026-06-22T18:45:34Z', completedByMechanic: { id: 99, fullName: 'Mechanik' } }
const [historical] = await service.getRepairFaults(45)
assert.equal(historical.repairedBy, null, 'A historical mechanic cannot identify the authenticated user who closed a fault')
assert.equal(historical.repairedAt, '2026-06-22T18:45:34Z')

const badgesSource = readFileSync(new URL('../src/components/repairs/RepairStatusBadges.vue', import.meta.url), 'utf8')
const badgesTemplate = parse(badgesSource).descriptor.template.content
const renderBadges = new Function('Vue', compile(badgesTemplate, { mode: 'function', prefixIdentifiers: true }).code)(Vue)
async function badgesHtml(repair) {
  const app = Vue.createSSRApp({ render: renderBadges, setup: () => ({ repair, ...presentation }) })
  app.component('AppBadge', {
    props: ['variant'],
    setup: (props, { slots }) => () => Vue.h('span', { 'data-variant': props.variant }, slots.default?.()),
  })
  return renderToString(app)
}

const currentPlaces = [{ id: 7, name: 'Serwis Scania' }]
const ready = await badgesHtml({ status: 'ready_to_be_repaired', currentPlaces })
assert.match(ready, /data-variant="warning"[^>]*>W lokalizacji: Serwis Scania</)
assert.equal(ready.match(/data-variant=/g).length, 1)
const newRepair = await badgesHtml({ status: 'new', currentPlaces })
assert.match(newRepair, /data-variant="neutral"[^>]*>Nowa</)
assert.doesNotMatch(newRepair, /Scania/)
assert.equal(newRepair.match(/data-variant=/g).length, 1)
assert.match(await badgesHtml({ status: 'ready_to_be_repaired' }), />Gotowa do naprawy</)
assert.match(await badgesHtml({ status: 'new', urgent: true, currentPlaces }), /data-variant="error"[^>]*>Pilne</)

await service.updateRepairFault(45, 26, { placeId: 7 })
await service.updateRepairFault(45, 26, { placeId: null })
assert.deepEqual(requests.slice(-2), [
  { url: '/api/repairs/45/faults/26', payload: { placeId: 7 } },
  { url: '/api/repairs/45/faults/26', payload: { placeId: null } },
])

const view = readFileSync(new URL('../src/views/RepairDetailView.vue', import.meta.url), 'utf8')
const creation = view.match(/<p [^>]*>\s*Dodano:[\s\S]*?<\/p>/)?.[0]
assert.ok(creation, 'Creation details belong to the fault row')
const metadata = view.match(/<p v-if="fault.status === 'DONE'"[\s\S]*?<\/p>/)?.[0]
assert.ok(metadata, 'Completion details belong to the fault row')
const render = new Function('Vue', compile(creation + metadata, { mode: 'function', prefixIdentifiers: true }).code)(Vue)
async function html(value) {
  const rendered = await renderToString(Vue.createSSRApp({ render, setup: () => ({ fault: value, formatDateTime: date => `DATA ${date}` }) }))
  return rendered.replace(/<!--[\s\S]*?-->/g, '')
}
const added = /Dodano: operator\s*· <time datetime="2026-06-22T18:44:39Z">DATA 2026-06-22T18:44:39Z<\/time>/
assert.match(await html(completed), added)
assert.match(await html(reopened), added)
assert.doesNotMatch(await html({ ...reopened, createdAt: null }), /<time/)
assert.match(await html(completed), /Wykonano: AKosmala/)
assert.match(await html(completed), /<time datetime="2026-11-02T10:15:00Z">DATA 2026-11-02T10:15:00Z<\/time>/)
assert.doesNotMatch(await html(reopened), /Wykonano:/)
assert.match(await html(historical), /Wykonano: brak danych\s*·/)
console.log('PASS: repair badges, planned fault place, creation and completion metadata, status-only request and reopening.')
