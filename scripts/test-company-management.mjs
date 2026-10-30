import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const vue = require('vue')
const source = readFileSync(new URL('../src/components/settings/CompanyManagementPanel.vue', import.meta.url), 'utf8')
const compiled = compileScript(parse(source).descriptor, { id: 'company-management-test' })
const code = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const plain = value => JSON.parse(JSON.stringify(value))
const roles = [
  { id: 1, code: 'ADMIN', name: 'Administrator', systemRole: true, editable: false, permissions: ['vehicles.read'] },
  { id: 2, code: 'DISPATCHER', name: 'Dyspozytor', editable: true, permissions: ['vehicles.read', 'positions.read'] },
]
const users = [
  { id: 1, username: 'anna', email: 'anna@example.test', firstName: 'Anna', lastName: 'Kowalska', active: true, roleIds: [1], permissionOverrides: [] },
  { id: 2, username: 'piotr', email: 'piotr@example.test', firstName: 'Piotr', lastName: 'Nowak', active: true, roleIds: [2], permissionOverrides: [] },
]
function scenario(permissions = ['users.create', 'users.update', 'users.delete', 'users.block', 'roles.create', 'roles.update', 'roles.assign', 'roles.delete', 'users.reset_password']) {
  const calls = [], toasts = [], dirtyValues = []
  let holdUpdate, failRolePermissions = false
  const auth = vue.reactive({ user: { id: 99 }, activeCompanyId: 1, canManageCompany: false, activeCompanyPermissions: permissions, hasActiveCompanyPermission: permission => auth.activeCompanyPermissions.includes(permission), restoreBackendSession: async () => {}, logout: async () => calls.push(['logout']) })
  const store = vue.reactive({
    roles: structuredClone(roles), users: structuredClone(users), permissions: [{ code: 'vehicles.read', name: 'Podgląd pojazdów', category: 'vehicles' }, { code: 'positions.read', name: 'Podgląd lokalizacji', category: 'positions' }], isLoading: false, isMutating: false,
    loadAll: async () => {},
    createRole: async payload => calls.push(['createRole', plain(payload)]),
    updateRole: async (id, payload) => calls.push(['updateRole', id, plain(payload)]),
    updateRolePermissions: async (id, value) => { calls.push(['updateRolePermissions', id, plain(value)]); if (failRolePermissions) throw new Error('failure') },
    createUser: async payload => calls.push(['createUser', plain(payload)]),
    updateUser: async (id, payload) => { calls.push(['updateUser', id, plain(payload)]); if (holdUpdate) await holdUpdate; return { ...store.users.find(user => user.id === id), ...payload } },
    updateUserRoles: async (id, value) => calls.push(['updateUserRoles', id, plain(value)]),
    updateUserPermissionOverrides: async (id, value) => calls.push(['updateUserPermissionOverrides', id, plain(value)]),
    resetUserPassword: async (id, value) => calls.push(['resetUserPassword', id, value]),
    deleteRole: async id => calls.push(['deleteRole', id]), deleteUser: async id => calls.push(['deleteUser', id]),
  })
  const exports = {}
  const mocks = {
    vue: { ...vue, onMounted() {} },
    'vue-router': { useRouter: () => ({ push: async path => calls.push(['navigate', path]) }) },
    '@/stores/companyManagementStore': { useCompanyManagementStore: () => store },
    '@/stores/authStore': { useAuthStore: () => auth },
    '@/stores/uiStore': { useUiStore: () => ({ addToast: value => toasts.push(value) }) },
    '@/composables/useWorkspace': { useWorkspacePortal: () => 'body', useWorkspaceDirty: value => vue.watch(value, dirty => dirtyValues.push(dirty), { immediate: true, flush: 'sync' }) },
  }
  vm.runInNewContext(code, { exports, localStorage: { getItem: () => null, setItem() {} }, window: { matchMedia: () => ({ matches: false }) }, require: name => mocks[name] || (name.endsWith('.vue') ? {} : require(name)) })
  const panel = exports.default.setup({}, { expose() {} })
  return { panel, store, auth, calls, toasts, dirtyValues, hold: promise => { holdUpdate = promise }, failPermissions: () => { failRolePermissions = true } }
}

const main = scenario(), panel = main.panel
assert.equal(panel.activeSection.value, 'users')
panel.openEditUserEditor(main.store.users[1])
assert.equal(panel.isRoleEditorOpen.value, false)
assert.equal(panel.editorDirty.value, false)
panel.userForm.firstName = 'Piotr test'
assert.equal(panel.editorDirty.value, true)
panel.requestEditorSelection(() => panel.openEditRoleEditor(main.store.roles[1]))
assert.ok(panel.pendingEditorAction.value)
assert.equal(panel.isUserEditorOpen.value, true, 'Do not discard a modified user while selecting a role')
panel.confirmEditorSelection()
assert.equal(panel.isUserEditorOpen.value, false)
assert.equal(panel.isRoleEditorOpen.value, true)
assert.equal(panel.editorDirty.value, false)
assert.equal(panel.usersForRole(2)[0].id, 2)
panel.openEditRoleEditor(main.store.roles[0])
assert.equal(panel.canSaveRoleForm.value, false, 'System roles are inspectable but immutable')
await panel.saveRole()
assert.equal(main.calls.length, 0)
panel.openEditRoleEditor(main.store.roles[1])
panel.roleForm.name = 'Transport'
panel.toggleRolePermission('positions.read')
await panel.saveRole()
assert.deepEqual(main.calls.splice(0), [['updateRole', 2, { code: 'DISPATCHER', name: 'Transport' }], ['updateRolePermissions', 2, ['vehicles.read']]])
panel.openEditUserEditor(main.store.users[1])
panel.toggleUserRole(1)
panel.setOverrideEffect('vehicles.read', 'DENY')
assert.equal(panel.overrideEffectFor('vehicles.read'), 'DENY')
panel.setOverrideEffect('vehicles.read', 'INHERIT')
assert.equal(panel.overrideEffectFor('vehicles.read'), null)
panel.setOverrideEffect('positions.read', 'GRANT')
await panel.saveUser()
assert.deepEqual(main.calls.splice(0), [
  ['updateUser', 2, { username: 'piotr', email: 'piotr@example.test', firstName: 'Piotr', lastName: 'Nowak' }],
  ['updateUserRoles', 2, [2, 1]], ['updateUserPermissionOverrides', 2, [{ permission: 'positions.read', effect: 'GRANT' }]],
])
panel.userRoleFilter.value = '1'
assert.deepEqual(Array.from(panel.filteredUsers.value, user => user.id), [1])
panel.userSearch.value = 'piotr'
assert.equal(panel.filteredUsers.value.length, 0)
panel.userRoleFilter.value = 'all'
assert.equal(panel.filteredUsers.value[0].id, 2)

const restricted = scenario(['users.update'])
restricted.panel.openEditUserEditor(restricted.store.users[1])
restricted.panel.toggleUserRole(1)
assert.deepEqual(plain(restricted.panel.userForm.roleIds), [2])
await restricted.panel.saveUser()
assert.equal(restricted.calls.some(call => call[0] === 'updateUserRoles'), false, 'Never widen role assignment rights')
restricted.panel.openNewRoleEditor()
assert.equal(restricted.panel.isRoleEditorOpen.value, false)

const concurrent = scenario()
concurrent.panel.openEditUserEditor(concurrent.store.users[1])
let finish
concurrent.hold(new Promise(resolve => { finish = resolve }))
const saving = concurrent.panel.saveUser()
assert.equal(concurrent.panel.editorBusy.value, true)
await concurrent.panel.saveUser()
concurrent.panel.requestEditorSelection(concurrent.panel.openNewRoleEditor)
assert.equal(concurrent.calls.length, 1, 'Prevent duplicate saves and editor changes during a multi-request save')
finish(); await saving
assert.equal(concurrent.panel.editorBusy.value, false)
assert.equal(concurrent.calls.filter(call => call[0] === 'updateUser').length, 1)

const failure = scenario()
failure.panel.openEditRoleEditor(failure.store.roles[1])
failure.panel.roleForm.name = 'Niezapisana nazwa'
failure.failPermissions()
await failure.panel.saveRole()
assert.equal(failure.panel.isRoleEditorOpen.value, true)
assert.equal(failure.panel.editorDirty.value, true)
assert.equal(failure.panel.editorBusy.value, false)
assert.equal(failure.toasts.at(-1).type, 'error')

const create = scenario(['users.create', 'roles.create'])
create.panel.openNewUserEditor()
await create.panel.saveUser()
assert.equal(create.calls.length, 0, 'Validate missing fields before creating a user')
Object.assign(create.panel.userForm, { username: 'new', email: 'new@example.test', password: 'test-only-password', firstName: 'Jan', lastName: 'Test' })
create.panel.toggleUserRole(2)
create.panel.setOverrideEffect('vehicles.read', 'GRANT')
await create.panel.saveUser()
assert.deepEqual(create.calls[0], ['createUser', { username: 'new', email: 'new@example.test', password: 'test-only-password', firstName: 'Jan', lastName: 'Test', roleIds: [2], permissionOverrides: [{ permission: 'vehicles.read', effect: 'GRANT' }] }])
create.panel.openNewRoleEditor()
Object.assign(create.panel.roleForm, { code: 'TEST', name: 'Test', permissions: ['vehicles.read'] })
await create.panel.saveRole()
assert.equal(create.calls.at(-1)[0], 'createRole')

const account = scenario()
account.panel.openEditUserEditor(account.store.users[1])
await account.panel.toggleSelectedUserStatus()
assert.equal(account.panel.userForm.active, false)
assert.equal(account.panel.editorDirty.value, false, 'An immediately saved account status is not an unsaved form change')
account.panel.openPasswordResetModal()
account.panel.passwordResetForm.newPassword = 'test-only-password'
account.panel.passwordResetForm.repeatPassword = 'different-password'
await account.panel.submitPasswordReset()
assert.equal(account.calls.some(call => call[0] === 'resetUserPassword'), false, 'Password mismatch must be rejected')
account.panel.passwordResetForm.repeatPassword = 'test-only-password'
await account.panel.submitPasswordReset()
assert.deepEqual(account.calls.at(-1), ['resetUserPassword', 2, 'test-only-password'])
account.panel.requestDeleteCurrentUser()
await account.panel.confirmDelete()
assert.deepEqual(account.calls.at(-1), ['deleteUser', 2])
assert.equal(account.panel.isUserEditorOpen.value, false)

const tenant = scenario()
tenant.panel.openEditUserEditor(tenant.store.users[1])
tenant.panel.userForm.firstName = 'Draft'
tenant.panel.requestEditorSelection(tenant.panel.openNewRoleEditor)
tenant.auth.activeCompanyId = 2
await vue.nextTick()
assert.equal(tenant.panel.isUserEditorOpen.value, false)
assert.equal(tenant.panel.pendingEditorAction.value, null)
assert.equal(tenant.panel.editorDirty.value, false)

assert.equal(source.includes('AppDrawer'), false)
console.log('PASS: unified user/role editors, protected drafts, system roles, grouped permissions, filters, create/update contracts, permission guards, concurrent saves and partial failure recovery.')
