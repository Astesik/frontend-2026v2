import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const transpile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const dateModule = { exports: {} }
vm.runInNewContext(transpile(source('src/utils/date.ts')), dateModule)
const dates = dateModule.exports
for (const value of ['28.10.2026', '28/10/2026', '28-10-2026', '2026-10-28', '28102026', ' 28.10.2026 ']) assert.equal(dates.parseTypedDate(value), '2026-10-28')
assert.equal(dates.parseTypedDate('1.2.2026'), '2026-02-01')
assert.equal(dates.parseTypedDate('29.02.2028'), '2028-02-29')
assert.equal(dates.parseTypedDate(''), '')
for (const value of ['31.02.2026', '29.02.2026', '00.10.2026', '28.13.2026', '28.10.26', '28.10.', 'tekst', '2026-10-28text']) assert.equal(dates.parseTypedDate(value), null, value)

const picker = parse(source('src/components/ui/AppDatePicker.vue')).descriptor
const pickerAst = ts.createSourceFile('AppDatePicker.ts', picker.scriptSetup.content, ts.ScriptTarget.Latest, true)
const pickerCode = pickerAst.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(pickerAst)).join('\n')
const props = reactive({ modelValue: '2026-10-28', editable: true, disabled: false, inline: true, placeholder: 'Wybierz datę' })
const emitted = []
const scope = effectScope()
const state = {
  computed, ref, watch, ...dates, defineOptions() {}, defineProps: () => props, withDefaults: values => values,
  defineEmits: () => (name, value) => { emitted.push({ name, value }); props.modelValue = value },
}
scope.run(() => vm.runInNewContext(transpile(pickerCode) + '\nthis.api = { typedValue, manualError, inputElement, isTyping, handleManualInput, finishManualInput, selectDate, clearDate }', state))
const { api } = state
let validity = ''
api.inputElement.value = { setCustomValidity(value) { validity = value } }
api.isTyping.value = true
api.handleManualInput({ target: { value: '31.02.2026' } })
assert.ok(validity, 'Impossible dates must block native form submission')
assert.equal(emitted.length, 0, 'Invalid drafts must not reach the API model')
api.handleManualInput({ target: { value: '29.02.2028' } })
await nextTick()
assert.equal(props.modelValue, '2028-02-29')
assert.equal(validity, '')
assert.equal(api.typedValue.value, '29.02.2028')
api.handleManualInput({ target: { value: '2027-12-31' } })
await nextTick()
assert.equal(props.modelValue, '2027-12-31')
assert.equal(api.typedValue.value, '2027-12-31', 'Do not reformat or move the cursor during typing')
api.finishManualInput()
assert.equal(api.typedValue.value, '31.12.2027')
api.isTyping.value = true
api.handleManualInput({ target: { value: '12.0' } })
props.modelValue = '2026-10-28'
await nextTick()
assert.equal(api.typedValue.value, '12.0', 'Preserve incomplete input during external data refresh')
api.finishManualInput()
assert.ok(validity)
api.selectDate('2027-01-15')
await nextTick()
assert.equal(props.modelValue, '2027-01-15')
assert.equal(api.typedValue.value, '15.01.2027')
assert.equal(validity, '', 'Calendar selection must clear a previous validation error')
api.clearDate()
await nextTick()
assert.equal(props.modelValue, '')
assert.equal(api.typedValue.value, '')
api.isTyping.value = true
api.handleManualInput({ target: { value: '' } })
assert.equal(validity, '')
scope.stop()

const detail = parse(source('src/views/VehicleDetailView.vue')).descriptor
const ast = ts.createSourceFile('VehicleDetailView.ts', detail.scriptSetup.content, ts.ScriptTarget.Latest, true)
const copyFunction = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'copyVehicleInformation').getText(ast)
const copied = [], toasts = []
let fail = false
const clipboardState = {
  navigator: { clipboard: { async writeText(value) { if (fail) throw new Error('Denied'); copied.push(value) } } },
  uiStore: { addToast: value => toasts.push(value) },
}
vm.runInNewContext(transpile(copyFunction) + '\nthis.copy = copyVehicleInformation', clipboardState)
for (const [label, value] of [['Numer rejestracyjny', 'WPR 12345'], ['VIN', 'WDB12345678901234'], ['Pierwsza rejestracja', '28.10.2026']]) await clipboardState.copy(value, label)
assert.deepEqual(copied, ['WPR 12345', 'WDB12345678901234', '28.10.2026'])
assert.equal(toasts.every(toast => toast.type === 'success'), true)
fail = true
await clipboardState.copy('WPR 12345', 'Numer rejestracyjny')
assert.equal(toasts.at(-1).type, 'error')
for (const [path, id] of [['src/components/ui/AppDatePicker.vue', 'date-input-test'], ['src/views/VehicleDetailView.vue', 'vehicle-detail-test']]) {
  const descriptor = parse(source(path)).descriptor
  assert.doesNotThrow(() => compileScript(descriptor, { id }))
}
console.log('PASS: typed/pasted dates, ISO normalization, impossible-date validation, partial input preservation, calendar selection, clearing and clipboard success/failure.')
