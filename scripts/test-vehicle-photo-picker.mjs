import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'

const require = createRequire(import.meta.url)
const vue = require('vue')
const filename = 'src/components/vehicles/VehiclePhotoGallery.vue'
const source = readFileSync(new URL('../' + filename, import.meta.url), 'utf8')
const script = compileScript(parse(source, { filename }).descriptor, { id: 'photo-picker-test' })
const code = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const allowed = vue.ref(true), uploads = [], toasts = []
const fleet = { vehiclePhotosByVehicleId: {}, vehiclePhotoLoadingIds: new Set(), vehiclePhotoMutatingIds: new Set(), uploadVehiclePhoto: async (id, file) => { uploads.push({ id, file }); return { id: 1 } } }
const mocks = {
  '@/composables/useWorkspace': { useWorkspacePortal: () => 'body' },
  vue: { ...vue, watch: () => {}, onBeforeUnmount: () => {} },
  '@/stores/authStore': { useAuthStore: () => ({ hasActiveCompanyPermission: () => allowed.value, user: { id: 2 } }) },
  '@/stores/fleetStore': { useFleetStore: () => fleet },
  '@/stores/uiStore': { useUiStore: () => ({ addToast: toast => toasts.push(toast) }) },
  '@/services/vehicleService': { vehicleService: {} },
}
let mobile = false
const exports = {}
vm.runInNewContext(code, { exports, console, URL, window: { matchMedia: () => ({ matches: mobile }) }, require: name => mocks[name] || (name.endsWith('.vue') ? {} : require(name)) })
const props = vue.reactive({ vehicleId: 12, embedded: true, loadOnMount: false })
const component = exports.default.setup(props, { expose() {} })
const clicked = []
const input = source => ({ value: 'previous-file', click() { clicked.push({ source, value: this.value, menuOpen: component.photoPickerOpen.value }) }, blur() {} })
component.photoInput.value = input('gallery')
component.cameraInput.value = input('camera')

component.openPhotoPicker()
assert.equal(clicked.at(-1).source, 'gallery')
assert.equal(clicked.at(-1).value, '')
assert.equal(component.photoPickerOpen.value, false)
mobile = true
component.openPhotoPicker()
assert.equal(component.photoPickerOpen.value, true)
assert.equal(clicked.length, 1)
component.choosePhotoSource('camera')
assert.equal(clicked.at(-1).source, 'camera')
assert.equal(clicked.at(-1).menuOpen, false)
const file = new File(['photo'], 'vehicle.jpg', { type: 'image/jpeg' })
await component.handlePhotoSelection({ target: { files: [file], value: 'file' } })
assert.equal(uploads.length, 1)
assert.equal(uploads[0].id, 12)
assert.equal(uploads[0].file, file)
assert.equal(toasts.at(-1).type, 'success')
component.openPhotoPicker(); component.choosePhotoSource('gallery')
assert.equal(clicked.at(-1).source, 'gallery')
props.vehicleId = 13
await component.handlePhotoSelection({ target: { files: [file], value: 'file' } })
assert.equal(uploads.length, 1, 'Do not upload to a different vehicle after opening the picker')
component.openPhotoPicker(); component.choosePhotoSource('gallery')
await component.handlePhotoSelection({ target: { files: [new File(['x'], 'bad.heic', { type: 'image/heic' })], value: 'file' } })
assert.match(component.fileError.value, /Dozwolone formaty/)
assert.equal(component.validatePhoto(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })), 'Zdjęcie może mieć maksymalnie 20 MB.')
allowed.value = false
component.photoPickerOpen.value = false
const previousClicks = clicked.length
component.openPhotoPicker()
assert.equal(component.photoPickerOpen.value, false)
assert.equal(clicked.length, previousClicks)
assert.match(source, /capture="environment"/)
assert.match(source, /<PhotoSourceMenu/)
assert.match(readFileSync(new URL('../src/components/repairs/RepairCreateModal.vue', import.meta.url), 'utf8'), /<PhotoSourceMenu/)
console.log('Vehicle photo picker: desktop, mobile gallery/camera, synchronous native click, upload, validation, permission and vehicle-change guard OK.')
