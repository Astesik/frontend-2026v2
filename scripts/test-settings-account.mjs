import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as passwordRules from '../src/utils/passwordRules.ts'

const require = createRequire(import.meta.url), vue = require('vue')
const file = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
function setupComponent(path, mocks, props = {}) {
  const content = compileScript(parse(file(path)).descriptor, { id: 'settings-test' }).content
  const exports = {}
  vm.runInNewContext(ts.transpileModule(content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, TextEncoder, window: { confirm: () => true }, localStorage: { getItem: () => null, setItem() {} },
    require: name => name === '@/utils/passwordRules' ? passwordRules : mocks[name] || (name.endsWith('.vue') || name.endsWith('.css') ? {} : require(name)),
  })
  return exports.default.setup(props, { expose() {} })
}
const flush = async () => { await vue.nextTick(); await new Promise(setImmediate) }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function scenario() {
  const requests = [], writes = [], navigations = []
  let mounted, dispose, failPassword = false
  const auth = vue.reactive({ user: { id: 12, username: 'anna', firstName: 'Anna', lastName: 'Kowalska', email: 'anna@example.test' }, activeCompanyId: 1, logout: async () => writes.push('logout') })
  const api = {
    get(url, options) { const request = { url, options, ...deferred() }; requests.push(request); return request.promise },
    post: async (url, payload, options) => { writes.push({ url, payload, options }); if (failPassword) throw { isAxiosError: true, response: { data: { message: 'Obecne hasło jest nieprawidłowe.' } } } },
    delete: async url => writes.push({ url }),
  }
  const scope = vue.effectScope()
  const panel = scope.run(() => setupComponent('src/components/settings/AccountSecurityPanel.vue', {
    vue: { ...vue, onMounted(callback) { mounted = callback }, onBeforeUnmount(callback) { dispose = callback } },
    '@/services/api': { api }, '@/stores/authStore': { useAuthStore: () => auth },
    'vue-router': { useRouter: () => ({ push: async path => navigations.push(path) }) },
    '@/composables/useWorkspace': { useWorkspaceDirty() {} },
  }))
  return { panel, requests, writes, navigations, auth, mount: () => mounted(), stop: () => { dispose(); scope.stop() }, failPassword: () => { failPassword = true } }
}

const test = scenario(), p = test.panel
assert.equal(p.displayName.value, 'Anna Kowalska')
assert.equal(p.initials.value, 'AK')
p.currentPassword.value = 'old-password'
p.password.value = p.repeat.value = 'short'
await flush()
await p.changePassword()
assert.match(p.passwordError.value, /8 znaków/)
assert.equal(p.sessionsError.value, '')
assert.equal(p.eventsError.value, '')
assert.equal(test.writes.length, 0, 'Invalid passwords must not reach the API')
p.password.value = p.repeat.value = 'haslo123!'
await flush(); await p.changePassword()
assert.match(p.passwordError.value, /dużą literę/)
p.password.value = p.repeat.value = 'Haslo123 '
await flush(); await p.changePassword()
assert.match(p.passwordError.value, /znak specjalny/)
p.password.value = 'Żeglarz!'
p.repeat.value = 'InneHaslo!'
await flush(); await p.changePassword()
assert.match(p.passwordError.value, /nie są takie same/)
p.password.value = p.repeat.value = '🛣'.repeat(19)
await flush(); await p.changePassword()
assert.match(p.passwordError.value, /72 bajty/)
p.password.value = p.repeat.value = 'Żeglarz!'
await flush()
assert.equal(p.passwordError.value, '', 'Editing the form clears its previous error')
test.failPassword(); await p.changePassword()
assert.equal(p.passwordError.value, 'Obecne hasło jest nieprawidłowe.')
assert.equal(p.passwordBusy.value, false)
assert.equal(test.writes[0].options.skipErrorToast, true, 'API errors are displayed next to the password form')
assert.equal(p.sessionsError.value, '')

const initial = test.mount()
assert.equal(test.requests.length, 2)
test.requests[0].reject(new Error('sessions failed'))
test.requests[1].resolve({ data: [{ id: 1, username: 'anna', event: 'LOGIN_SUCCESS' }] })
await initial
assert.match(p.sessionsError.value, /sesji/)
assert.equal(p.events.value.length, 1, 'A session error must not hide login history')
assert.equal(p.eventsError.value, '')
assert.equal(p.passwordError.value, 'Obecne hasło jest nieprawidłowe.', 'Data errors must not overwrite password validation')
const previous = p.loadSessions()
const newer = p.loadSessions()
test.requests.at(-1).resolve({ data: [{ id: 'latest' }] }); await newer
test.requests.at(-2).resolve({ data: [{ id: 'stale' }] }); await previous
assert.equal(p.sessions.value[0].id, 'latest', 'Out-of-order requests cannot restore an old session page')
p.changeEventPage(1)
assert.equal(test.requests.at(-1).options.params.offset, 50)
test.requests.at(-1).resolve({ data: [] }); await flush()
const pending = p.loadSessions()
test.stop()
test.requests.at(-1).resolve({ data: [{ id: 'after-unmount' }] }); await pending
assert.equal(p.sessions.value.length, 0, 'An unmounted panel cannot apply a late response')

const success = scenario()
success.auth.user = null
await flush()
success.panel.currentPassword.value = 'old-password'
success.panel.password.value = success.panel.repeat.value = 'Żeglarz!'
await flush(); await success.panel.changePassword()
assert.equal(success.writes[0].url, '/api/users/me/password', 'Changing your own password must not depend on a locally loaded profile')
assert.equal(success.writes.at(-1), 'logout')
assert.equal(success.navigations[0], '/login')
assert.equal(success.panel.password.value, '')
success.stop()

const grouped = permissions => {
  const stored = 'security'
  const auth = vue.reactive({ canManageCompany: false, activeCompanyPermissions: permissions, hasActiveCompanyPermission: name => permissions.includes(name), restoreBackendSession: async () => {} })
  const scope = vue.effectScope()
  const panel = scope.run(() => setupComponent('src/views/SettingsView.vue', {
    vue: { ...vue, onMounted() {} }, '@/stores/authStore': { useAuthStore: () => auth },
    '@/stores/fleetStore': { useFleetStore: () => ({ vehicleGroups: [], fetchVehicles: async () => {}, fetchVehicleGroups: async () => {} }) }, '@/stores/uiStore': { useUiStore: () => ({}) },
    '@/composables/useWorkspace': { useWorkspaceDirty() {}, useWorkspaceViewState(bindings) { bindings.activeTab.value = stored } },
  }))
  const names = Array.from(panel.settingsTabs.value, tab => tab.value)
  assert.equal(panel.activeTab.value, 'account', 'Previously saved security tabs open Konto')
  assert.equal(panel.normalizeSettingsTab('fleet'), 'fleet')
  assert.equal(panel.normalizeSettingsTab('mail'), 'notifications')
  assert.equal(panel.normalizeSettingsTab('countries'), 'notifications')
  scope.stop()
  return names
}
assert.deepEqual(grouped([]), ['account'])
assert.deepEqual(grouped(['vehicle_groups.read', 'settings.read']), ['account', 'fleet', 'notifications'])
assert.deepEqual(grouped(['notifications.read']), ['account', 'notifications'])

const ipProps = vue.reactive({ ip: '8.8.8.8', location: { status: 'located', countryCode: 'PL', country: 'Polska', city: 'Warszawa', region: 'Mazowieckie' } })
const ipScope = vue.effectScope()
const cell = ipScope.run(() => setupComponent('src/components/settings/IpLocationCell.vue', {}, ipProps))
assert.equal(cell.countryCode.value, 'PL')
assert.equal(cell.locationLabel.value, 'Warszawa, Polska')
ipProps.location.city = null
assert.equal(cell.locationLabel.value, 'Mazowieckie, Polska', 'Use the region when a city is unavailable')
ipProps.location = { status: 'private' }
assert.equal(cell.countryCode.value, null)
assert.equal(cell.locationLabel.value, 'Adres niepubliczny')
ipProps.location = undefined
assert.equal(cell.locationLabel.value, 'Lokalizacja niedostępna', 'Older backends and missing databases keep the IP visible')
ipProps.ip = null
assert.equal(cell.locationLabel.value, 'Brak adresu IP')
ipProps.ip = '8.8.8.8'
ipProps.location = { status: 'located', countryCode: '../x' }
assert.equal(cell.countryCode.value, null, 'Only ISO country codes can choose a local flag')
ipScope.stop()
console.log('PASS: account profile, password validation and local API errors, independent table errors, pagination, stale requests, logout, grouped permissions and saved-tab migration.')

const fleetScope = vue.effectScope(), fleetWrites = [], fleetToasts = []
let rejectFleetSave = false
const fleetState = vue.reactive({
  apiVehicles: [{ id: 1, licensePlate: 'WA 12345' }],
  vehicleGroups: [{ id: '1', name: 'Transport', vehiclesCount: 1 }, { id: '2', name: 'Kraj', vehiclesCount: 0 }],
  vehicleGroupDetails: { '1': { vehicleIds: ['1', '99'] }, '2': { vehicleIds: [] } },
  fetchVehicles: async () => {}, fetchVehicleGroups: async () => {}, fetchVehicleGroup: async () => {},
  updateVehicleGroupName: async (id, name) => { fleetWrites.push({ id, name }); if (rejectFleetSave) throw new Error('offline'); fleetState.vehicleGroups.find(group => group.id === id).name = name; return { id, name } },
})
const fleetPanel = fleetScope.run(() => setupComponent('src/views/SettingsView.vue', {
  vue: { ...vue, onMounted() {} },
  '@/stores/authStore': { useAuthStore: () => ({ canManageCompany: false, activeCompanyPermissions: ['vehicle_groups.read'], hasActiveCompanyPermission: () => false }) },
  '@/stores/fleetStore': { useFleetStore: () => fleetState }, '@/stores/uiStore': { useUiStore: () => ({ addToast: toast => fleetToasts.push(toast) }) },
  '@/composables/useWorkspace': { useWorkspaceDirty() {}, useWorkspaceViewState() {} },
}))
await flush()
assert.deepEqual(Array.from(fleetPanel.groupVehicles('1'), item => item.label), ['WA 12345', 'Pojazd #99'])
await fleetPanel.toggleGroupEdit('1')
fleetPanel.groupNameForms['1'] = 'Nowa nazwa'
rejectFleetSave = true
await fleetPanel.toggleGroupEdit('1')
assert.equal(fleetPanel.editingGroupId.value, '1', 'A failed save leaves the fleet editor open')
assert.equal(fleetPanel.groupNameForms['1'], 'Nowa nazwa', 'A failed save retains the entered name')
rejectFleetSave = false
await fleetPanel.toggleGroupEdit('2')
assert.equal(fleetState.vehicleGroups[0].name, 'Nowa nazwa', 'Switching fleet tiles saves the previous fleet name')
assert.equal(fleetPanel.editingGroupId.value, '2')
await fleetPanel.toggleGroupEdit('2')
assert.equal(fleetPanel.editingGroupId.value, null)
assert.equal(fleetWrites.length, 2, 'Unchanged fleet names do not trigger a write')
fleetScope.stop()
console.log('PASS: local IP labels/flags and fleet tile labels, failed saves, switching editors and unchanged names.')
