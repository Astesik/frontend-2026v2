import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'

const source = parse(readFileSync(new URL('../src/components/ui/AppSearchSelect.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const ast = ts.createSourceFile('AppSearchSelect.ts', source, ts.ScriptTarget.Latest, true)
const statements = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast)).join('\n')
const code = ts.transpileModule(statements, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const initialOptions = [{ value: '1', label: 'WPR 12345' }, { value: '2', label: 'WA 99999' }]

for (const modelValue of ['', '1']) {
  const props = reactive({ modelValue, options: initialOptions.map(option => ({ ...option })), disabled: false, showAllOnOpen: true })
  const emitted = []
  const state = {
    exports: {}, computed, ref, watch, nextTick,
    defineOptions() {}, defineProps: () => props, withDefaults: values => values,
    defineEmits: () => (...args) => emitted.push(args),
  }
  const scope = effectScope()
  scope.run(() => vm.runInNewContext(code + '\nthis.api = { query, isOpen, activeIndex, filteredOptions, openDropdown, closeDropdown, handleInput, selectOption }', state))
  const { api } = state
  api.openDropdown()
  api.query.value = 'WPR 12'
  api.handleInput()
  for (let refresh = 0; refresh < 3; refresh++) {
    props.options = initialOptions.map(option => ({ ...option }))
    await nextTick()
    assert.equal(api.query.value, 'WPR 12', 'Polling must preserve text while typing, with or without a selected vehicle')
    assert.equal(api.isOpen.value, true)
    assert.equal(api.filteredOptions.value.length, 1)
    assert.equal(api.activeIndex.value, 0)
  }
  assert.equal(emitted.length, 0, 'Refreshing results must not change the selected vehicle')

  props.options = [{ value: '2', label: 'WA 99999' }]
  await nextTick()
  assert.equal(api.query.value, 'WPR 12', 'Keep the query even when refreshed results no longer match')
  assert.equal(api.activeIndex.value, -1, 'Do not retain an invalid keyboard selection')
  props.options = [{ value: '1', label: 'WPR 12345' }]
  await nextTick()
  assert.equal(api.filteredOptions.value.length, 1)
  api.closeDropdown()
  assert.equal(api.query.value, modelValue ? 'WPR 12345' : '')
  props.options = [{ value: '1', label: 'WPR 54321' }]
  await nextTick()
  assert.equal(api.query.value, modelValue ? 'WPR 54321' : '', 'Closed inputs should still reflect updated selected labels')
  api.openDropdown()
  api.query.value = 'WPR'
  api.handleInput()
  api.selectOption(props.options[0])
  props.modelValue = '1'
  await nextTick()
  assert.equal(api.query.value, 'WPR 54321')
  assert.equal(api.isOpen.value, false)
  assert.equal(emitted.at(-1)[0], 'update:modelValue')
  assert.equal(emitted.at(-1)[1], '1')
  scope.stop()
}
console.log('PASS: repeated option polling preserves typed searches, updates filtered results and keyboard selection, and retains normal selection/closed-label synchronization.')
