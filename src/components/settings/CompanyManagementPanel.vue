<template>
  <div class="company-management grid min-w-0 gap-3 md:min-h-0 md:flex-1">
    <div class="company-directories grid min-w-0 items-stretch gap-3">
      <AppCard title="Użytkownicy" :icon="Users" compact class="min-w-0" content-class="!p-0">
        <template #actions><AppButton size="sm" :disabled="!canCreateUsers || editorBusy" @click="requestEditorSelection(openNewUserEditor)"><Plus class="h-4 w-4" />Dodaj użytkownika</AppButton></template>
        <div class="flex flex-wrap gap-2 border-b border-ui-divider p-3">
          <AppInput v-model="userSearch" class="min-w-40 flex-1" placeholder="Szukaj użytkownika" aria-label="Szukaj użytkownika" size="sm" clearable />
          <AppSelect v-if="store.roles.length" v-model="userRoleFilter" class="!w-48 max-w-full" :options="userRoleFilterOptions" size="sm" aria-label="Filtruj użytkowników według roli" />
        </div>
        <div class="overflow-x-auto" :aria-busy="store.isLoading">
          <table class="ui-table min-w-[730px]" aria-label="Użytkownicy firmy">
            <thead class="ui-table-head"><tr><th class="w-12 text-center">Lp.</th><th>Użytkownik</th><th>Login</th><th>Email</th><th>Role</th><th>Status</th><th class="w-16 text-right">Akcje</th></tr></thead>
            <tbody>
              <tr v-for="(userItem, index) in filteredUsers" :key="userItem.id" class="ui-table-row" :class="isUserEditorOpen && userForm.id === userItem.id ? 'bg-ui-muted' : ''">
                <td class="text-center tabular-nums text-ui-mutedText">{{ index + 1 }}</td>
                <td><button type="button" class="inline-flex items-center gap-2 text-left font-medium text-ui-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus" :disabled="editorBusy" @click="requestEditorSelection(() => openEditUserEditor(userItem))"><span class="company-avatar !h-7 !w-7 !text-[10px]">{{ userInitials(userItem) }}</span>{{ displayUserName(userItem) }}</button></td>
                <td>{{ userItem.username || '—' }}</td>
                <td>{{ userItem.email || '—' }}</td>
                <td><div class="flex flex-wrap gap-1"><AppBadge v-for="role in userRoles(userItem)" :key="role.id">{{ role.name }}</AppBadge><span v-if="!userRoles(userItem).length" class="ui-caption">Brak roli</span></div></td>
                <td><AppBadge :variant="userItem.active === false ? 'error' : 'success'">{{ userItem.active === false ? 'Zablokowany' : 'Aktywny' }}</AppBadge></td>
                <td class="text-right"><AppIconButton :label="'Otwórz użytkownika ' + displayUserName(userItem)" size="sm" variant="ghost" :disabled="editorBusy" @click="requestEditorSelection(() => openEditUserEditor(userItem))"><SquarePen class="h-4 w-4" /></AppIconButton></td>
              </tr>
              <tr v-if="store.isLoading || !filteredUsers.length"><td colspan="7" class="py-8 text-center ui-caption">{{ store.isLoading ? 'Pobieranie użytkowników…' : 'Brak użytkowników pasujących do filtra.' }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-ui-divider px-4 py-2 ui-caption">Użytkownicy: {{ filteredUsers.length }} z {{ store.users.length }}</div>
      </AppCard>

      <AppCard title="Role" :icon="ShieldCheck" compact class="min-w-0" content-class="!p-0">
        <template #actions><AppButton size="sm" :disabled="!canCreateRoles || editorBusy" @click="requestEditorSelection(openNewRoleEditor)"><Plus class="h-4 w-4" />Dodaj rolę</AppButton></template>
        <div class="border-b border-ui-divider p-3"><AppInput v-model="roleSearch" placeholder="Szukaj roli" aria-label="Szukaj roli" size="sm" clearable /></div>
        <div class="overflow-x-auto" :aria-busy="store.isLoading">
          <table class="ui-table min-w-[450px]" aria-label="Role firmy">
            <thead class="ui-table-head"><tr><th class="w-12 text-center">Lp.</th><th>Rola</th><th class="text-center">Użytkownicy</th><th class="text-center">Uprawnienia</th><th class="w-16 text-right">Akcje</th></tr></thead>
            <tbody>
              <tr v-for="(role, index) in filteredRoles" :key="role.id" class="ui-table-row" :class="isRoleEditorOpen && roleForm.id === role.id ? 'bg-ui-muted' : ''">
                <td class="text-center tabular-nums text-ui-mutedText">{{ index + 1 }}</td>
                <td><button type="button" class="text-left font-medium text-ui-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus" :disabled="editorBusy" @click="requestEditorSelection(() => openEditRoleEditor(role))">{{ role.name }}</button><span class="mt-0.5 block ui-caption">{{ role.systemRole ? 'Systemowa' : role.code }}</span></td>
                <td class="text-center tabular-nums">{{ usersForRole(role.id).length }}</td><td class="text-center tabular-nums">{{ role.permissions.length }}</td>
                <td class="text-right"><AppIconButton :label="'Otwórz rolę ' + role.name" size="sm" variant="ghost" :disabled="editorBusy" @click="requestEditorSelection(() => openEditRoleEditor(role))"><SquarePen class="h-4 w-4" /></AppIconButton></td>
              </tr>
              <tr v-if="store.isLoading || !filteredRoles.length"><td colspan="5" class="py-8 text-center ui-caption">{{ store.isLoading ? 'Pobieranie ról…' : 'Brak ról pasujących do filtra.' }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-ui-divider px-4 py-2 ui-caption">Role: {{ filteredRoles.length }} z {{ store.roles.length }}</div>
      </AppCard>
    </div>
    <div v-if="isUserEditorOpen || isRoleEditorOpen" ref="editorElement" class="company-editor min-h-0 min-w-0 space-y-3" tabindex="-1">
      <template v-if="isUserEditorOpen">
        <AppCard :title="userForm.id ? (selectedUser ? displayUserName(selectedUser) : userForm.username) : 'Nowy użytkownik'" :icon="UserRound" compact content-class="!p-0">
          <template #actions>
            <div class="flex items-center gap-1">
              <AppBadge v-if="userForm.id" :variant="userForm.active ? 'success' : 'error'">{{ userForm.active ? 'Aktywny' : 'Zablokowany' }}</AppBadge>
              <span v-if="userForm.id" ref="userMenuAnchor" class="inline-flex"><AppIconButton label="Opcje użytkownika" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isUserMenuOpen" :disabled="editorBusy" @click="isUserMenuOpen = !isUserMenuOpen"><Ellipsis class="h-4 w-4" /></AppIconButton></span>
              <AppIconButton label="Zamknij użytkownika" size="sm" variant="ghost" :disabled="editorBusy" @click="requestEditorSelection(closeUserEditor)"><X class="h-4 w-4" /></AppIconButton>
            </div>
            <AppDropdown :open="isUserMenuOpen" :anchor="userMenuAnchor" role="menu" :match-width="false" content-class="min-w-44 p-1" @close="isUserMenuOpen = false">
              <AppDropdownItem role="menuitem" :disabled="!canBlockUsers" @click="isUserMenuOpen = false; toggleSelectedUserStatus()"><component :is="userForm.active ? UserRoundX : UserRoundCheck" class="h-4 w-4" />{{ userForm.active ? 'Zablokuj' : 'Odblokuj' }}</AppDropdownItem>
              <AppDropdownItem role="menuitem" class="text-danger-600 dark:text-danger-400" :disabled="!canDeleteUsers" @click="isUserMenuOpen = false; requestDeleteCurrentUser()"><Trash2 class="h-4 w-4" />Usuń użytkownika</AppDropdownItem>
            </AppDropdown>
          </template>
          <AppTabs :model-value="userEditorTab" :items="userEditorTabs" variant="underline" size="sm" class="px-3" aria-label="Sekcje użytkownika" @update:model-value="setUserEditorTab" />
        </AppCard>
        <form id="company-user-form" class="space-y-3" @invalid.capture="showInvalidUserField" @submit.prevent="saveUser">
          <div v-show="userEditorTab === 'info'" class="grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <AppCard title="Dane użytkownika" :icon="UserRound" compact>
              <fieldset :disabled="!canSaveUserForm || editorBusy" class="grid min-w-0 gap-3 sm:grid-cols-2">
                <AppInput v-model="userForm.firstName" label="Imię" size="sm" autocomplete="given-name" />
                <AppInput v-model="userForm.lastName" label="Nazwisko" size="sm" autocomplete="family-name" />
                <AppInput v-model="userForm.username" label="Login" size="sm" required autocomplete="off" />
                <AppInput v-model="userForm.email" label="Email" type="email" size="sm" required autocomplete="off" :disabled="Boolean(userForm.id) && !canChangeRecoveryEmail" :hint="userForm.id && !canChangeRecoveryEmail ? 'Adres odzyskiwania zmienia administrator globalny.' : undefined" />
                <AppPasswordInput v-if="!userForm.id" v-model="userForm.password" label="Hasło startowe" :hint="newPasswordHint" size="sm" required autocomplete="new-password" class="sm:col-span-2" />
              </fieldset>
            </AppCard>
            <AppCard title="Przypisane role" :icon="ShieldCheck" compact content-class="!p-0">
              <p class="border-b border-ui-divider px-4 py-2.5 ui-caption">Użytkownik otrzymuje uprawnienia wybranych ról.</p>
              <label v-for="role in store.roles" :key="role.id" class="company-choice-row" :title="roleTitle(role)">
                <AppCheckbox :model-value="userForm.roleIds.includes(role.id)" :aria-label="role.name" :disabled="!canChangeUserRoles || editorBusy" @update:model-value="toggleUserRole(role.id)" />
                <span class="min-w-0 flex-1"><span class="block text-sm text-ui-text">{{ role.name }}</span><span class="ui-caption">{{ role.permissions.length }} uprawnień</span></span>
                <span v-if="role.systemRole" class="text-[10px] text-ui-mutedText">Systemowa</span>
              </label>
              <p v-if="!store.roles.length" class="p-4 ui-caption">Dodaj rolę w kafelku „Role”, aby przypisać ją użytkownikowi.</p>
            </AppCard>
          </div>
          <AppCard v-if="userEditorTab === 'permissions'" title="Indywidualne uprawnienia" :icon="KeyRound" compact content-class="!p-0">
            <div class="space-y-2 border-b border-ui-divider p-3"><p class="ui-caption">Domyślnie obowiązują role. Tutaj możesz nadać lub odebrać wybrane uprawnienie tej osobie.</p><AppInput v-model="permissionOverrideSearch" placeholder="Szukaj uprawnienia" size="sm" aria-label="Szukaj indywidualnego uprawnienia" clearable /></div>
            <section v-for="category in overridePermissionCategories" :key="category.category">
              <h3 class="company-permission-heading">{{ category.label }}</h3>
              <div v-for="permission in category.permissions" :key="permission.code" class="company-permission-row" :title="permissionTitle(permission)">
                <span class="min-w-0 text-xs text-ui-text">{{ permission.name || permission.code }}</span>
                <AppSelect :model-value="overrideEffectFor(permission.code) || 'INHERIT'" :options="overrideEffectOptions" size="sm" class="ml-auto !w-36 max-w-full shrink-0" :aria-label="'Dostęp: ' + (permission.name || permission.code)" :disabled="!canEditUserOverrides || editorBusy" @update:model-value="setOverrideEffect(permission.code, $event)" />
              </div>
            </section>
            <p v-if="!overridePermissionCategories.length" class="p-5 text-center ui-caption">Brak uprawnień pasujących do filtra.</p>
          </AppCard>
          <div class="company-editor-footer"><span class="mr-auto ui-caption">{{ editorDirty ? 'Niezapisane zmiany' : 'Wszystkie zmiany zapisane' }}</span><AppButton size="sm" variant="secondary" :disabled="editorBusy" @click="requestEditorSelection(closeUserEditor)">Anuluj</AppButton><AppButton size="sm" type="submit" :loading="isSavingEditor" :disabled="!canSaveUserForm || editorBusy || (Boolean(userForm.id) && !editorDirty)"><Save class="h-4 w-4" />{{ userForm.id ? 'Zapisz zmiany' : 'Dodaj użytkownika' }}</AppButton></div>
        </form>
      </template>

      <template v-else-if="isRoleEditorOpen">
        <AppCard :title="roleForm.id ? roleForm.name : 'Nowa rola'" :icon="ShieldCheck" compact>
          <template #actions>
            <div class="flex items-center gap-1"><AppBadge v-if="selectedRole?.systemRole">Systemowa</AppBadge><AppIconButton v-if="roleForm.id && selectedRole?.editable !== false" label="Usuń rolę" size="sm" variant="ghost" :disabled="!canDeleteRoles || editorBusy" @click="requestDeleteCurrentRole"><Trash2 class="h-4 w-4" /></AppIconButton><AppIconButton label="Zamknij rolę" size="sm" variant="ghost" :disabled="editorBusy" @click="requestEditorSelection(closeRoleEditor)"><X class="h-4 w-4" /></AppIconButton></div>
          </template>
          <form id="company-role-form" @submit.prevent="saveRole">
            <fieldset :disabled="!canSaveRoleForm || editorBusy" class="grid gap-3 sm:grid-cols-2"><AppInput v-model="roleForm.name" label="Nazwa roli" placeholder="np. Dyspozytor" size="sm" required /><AppInput v-model="roleForm.code" label="Kod roli" placeholder="np. DISPATCHER" size="sm" required /></fieldset>
            <p v-if="selectedRole?.editable === false" class="mt-3 ui-caption">Ta rola jest zarządzana przez system. Możesz przeglądać jej uprawnienia.</p>
          </form>
        </AppCard>
        <AppCard title="Uprawnienia roli" :icon="KeyRound" compact content-class="!p-0">
          <template #actions><span class="ui-caption">{{ roleForm.permissions.length }} wybranych</span></template>
          <div class="border-b border-ui-divider p-3"><AppInput v-model="rolePermissionSearch" placeholder="Szukaj uprawnienia" aria-label="Szukaj uprawnienia roli" size="sm" clearable /></div>
          <div class="grid items-stretch gap-px bg-ui-border lg:grid-cols-2">
            <section v-for="category in rolePermissionCategories" :key="category.category" class="bg-ui-surface">
              <h3 class="company-permission-heading">{{ category.label }}</h3>
              <label v-for="permission in category.permissions" :key="permission.code" class="company-choice-row" :title="permissionTitle(permission)"><AppCheckbox :model-value="roleForm.permissions.includes(permission.code)" :aria-label="permission.name || permission.code" :disabled="!canSaveRoleForm || editorBusy" @update:model-value="toggleRolePermission(permission.code)" /><span class="text-xs text-ui-text">{{ permission.name || permission.code }}</span></label>
            </section>
          </div>
          <p v-if="!rolePermissionCategories.length" class="p-5 text-center ui-caption">Brak uprawnień pasujących do filtra.</p>
        </AppCard>
        <AppCard v-if="roleForm.id" title="Użytkownicy z tą rolą" :icon="Users" compact content-class="!p-0">
          <button v-for="member in usersForRole(roleForm.id)" :key="member.id" type="button" class="company-choice-row w-full text-left hover:bg-ui-hover" :disabled="editorBusy" @click="requestEditorSelection(() => openEditUserEditor(member))"><span class="company-avatar !h-7 !w-7 !text-[10px]">{{ userInitials(member) }}</span><span class="min-w-0 flex-1 truncate text-sm text-ui-text">{{ displayUserName(member) }}</span><ChevronRight class="h-4 w-4 text-ui-icon" /></button>
          <p v-if="!usersForRole(roleForm.id).length" class="p-4 ui-caption">Żaden użytkownik nie ma jeszcze tej roli.</p>
        </AppCard>
        <div v-if="canSaveRoleForm" class="company-editor-footer"><span class="mr-auto ui-caption">{{ editorDirty ? 'Niezapisane zmiany' : 'Wszystkie zmiany zapisane' }}</span><AppButton size="sm" variant="secondary" :disabled="editorBusy" @click="requestEditorSelection(closeRoleEditor)">Anuluj</AppButton><AppButton size="sm" form="company-role-form" type="submit" :loading="isSavingEditor" :disabled="editorBusy || (Boolean(roleForm.id) && !editorDirty)"><Save class="h-4 w-4" />{{ roleForm.id ? 'Zapisz zmiany' : 'Dodaj rolę' }}</AppButton></div>
      </template>

    </div>
    <Teleport :to="workspacePortal">
      <AppModal
        :open="Boolean(roleToDelete || userToDelete)"
        :title="roleToDelete ? 'Usunąć rolę?' : 'Usunąć użytkownika?'"
        :description="deleteMessage"
        size="sm"
        :busy="store.isMutating"
        @close="clearDeleteTargets"
      >
        <p class="ui-body-sm text-ui-mutedText">Tej operacji nie można cofnąć.</p>
        <template #footer>
          <AppButton variant="secondary" @click="clearDeleteTargets">Anuluj</AppButton>
          <AppButton
            variant="danger"
            :loading="store.isMutating"
            :disabled="roleToDelete ? !canDeleteRoles : !canDeleteUsers"
            @click="confirmDelete"
          >
            Usuń
          </AppButton>
        </template>
      </AppModal>

      <AppConfirmModal :open="Boolean(pendingEditorAction)" title="Odrzucić niezapisane zmiany?" description="Zmiany w bieżącym formularzu nie zostały zapisane." confirm-label="Odrzuć zmiany" confirm-variant="danger" @close="pendingEditorAction = null" @confirm="confirmEditorSelection" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceDirty } from '@/composables/useWorkspace'
import { useWorkspacePortal } from '@/composables/useWorkspace'
import { computed, nextTick, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import {
  IconChevronRight as ChevronRight,
  IconDots as Ellipsis,
  IconKey as KeyRound,
  IconPlus as Plus,
  IconDeviceFloppy as Save,
  IconShieldCheck as ShieldCheck,
  IconEdit as SquarePen,
  IconTrash as Trash2,
  IconUser as UserRound,
  IconUserCheck as UserRoundCheck,
  IconUserX as UserRoundX,
  IconUsers as Users,
  IconX as X,
} from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPasswordInput from '@/components/ui/AppPasswordInput.vue'
import { newPasswordError, newPasswordHint } from '@/utils/passwordRules'
import AppTabs from '@/components/ui/AppTabs.vue'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyManagementStore } from '@/stores/companyManagementStore'
import { useUiStore } from '@/stores/uiStore'
import type {
  CompanyManagedUser,
  CompanyPermission,
  CompanyRole,
  CompanyUserPermissionOverride,
} from '@/types/companyManagement'

type UserEditorTab = 'info' | 'permissions'
type OverrideEffect = 'GRANT' | 'DENY'

interface PermissionCategoryGroup {
  category: string
  label: string
  permissions: CompanyPermission[]
}

const USER_EDITOR_TAB_KEY = 'routewise.companyManagement.userEditorTab'


const userEditorTabs = [
  { value: 'info' as const, label: 'Dane i role', icon: UserRound },
  { value: 'permissions' as const, label: 'Uprawnienia', icon: KeyRound },
]

const categoryLabels: Record<string, string> = {
  system: 'System',
  vehicles: 'Pojazdy',
  devices: 'Urządzenia',
  repairs: 'Naprawy',
  vehicle_returns: 'Zjazdy i wyjazdy',
  fuel_cards: 'Karty paliwowe',
  fuel_imports: 'Tankowania i importy',
  places_positions: 'Miejsca, strefy i GPS',
  drivers: 'Kierowcy',
  notifications: 'Powiadomienia',
  roles: 'Role',
  users: 'Użytkownicy',
  other: 'Inne',
}

const categoryOrder: Record<string, number> = {
  system: 0,
  vehicles: 1,
  devices: 2,
  repairs: 3,
  vehicle_returns: 3.5,
  fuel_cards: 3.6,
  fuel_imports: 3.7,
  places_positions: 4,
  drivers: 5,
  notifications: 6,
  roles: 7,
  users: 8,
  other: 99,
}

const categoryAliases: Record<string, string> = {
  company: 'system',
  dashboard: 'system',
  integrations: 'system',
  settings: 'system',
  vehicles: 'vehicles',
  vehicle_groups: 'vehicles',
  vignettes: 'vehicles',
  devices: 'devices',
  repairs: 'repairs',
  faults: 'repairs',
  comments: 'repairs',
  fault_photos: 'repairs',
  mechanics: 'repairs',
  places: 'places_positions',
  positions: 'places_positions',
}

const actionOrder: Record<string, number> = {
  read: 10,
  view: 10,
  list: 10,
  get: 10,
  history: 12,
  create: 20,
  add: 20,
  assign: 25,
  change_status: 28,
  status: 28,
  update: 30,
  edit: 30,
  edit_any: 30,
  patch: 30,
  manage: 35,
  delete: 40,
  delete_any: 40,
  remove: 40,
  block: 45,
  sync: 50,
}
const store = useCompanyManagementStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const canChangeRecoveryEmail = computed(() => authStore.user?.sysAdmin === true || authStore.user?.globalRoles?.includes('GLOBAL_ADMIN'))

const userEditorTab = ref<UserEditorTab>(readStoredUserEditorTab())
const roleSearch = ref('')
const userSearch = ref('')
const userRoleFilter = ref('all')
const userRoleFilterOptions = computed(() => [
  {value:'all', label:'Wszystkie role'},
  ...store.roles.map(role => ({value:String(role.id), label:role.name})),
])
const overrideEffectOptions = [
  {value:'INHERIT', label:'Zgodnie z rolą'},
  {value:'GRANT', label:'Nadaj dostęp'},
  {value:'DENY', label:'Odbierz dostęp'},
]
const isSavingEditor = ref(false)
const editorBusy = computed(() => store.isMutating || isSavingEditor.value || isChangingUserStatus.value)
const userMenuAnchor = ref<HTMLElement | null>(null)
const isUserMenuOpen = ref(false)
const editorElement = ref<HTMLElement | null>(null)
const pendingEditorAction = shallowRef<(() => void) | null>(null)
const editorBaseline = ref('')
const editorSnapshot = computed(() => isUserEditorOpen.value ? JSON.stringify({
  ...userForm, roleIds:[...userForm.roleIds].sort((a,b) => a-b),
  overrides:[...permissionOverrideForm.value].sort((a,b) => a.permission.localeCompare(b.permission)),
}) : isRoleEditorOpen.value ? JSON.stringify({...roleForm, permissions:[...roleForm.permissions].sort()}) : '')
const editorDirty = computed(() => editorSnapshot.value !== editorBaseline.value)
const canEditUserOverrides = computed(() => userForm.id ? canUpdateUsers.value : canCreateUsers.value)
function markEditorSaved() { editorBaseline.value = editorSnapshot.value }
function focusEditor() {
  void nextTick(() => {
    editorElement.value?.focus({preventScroll:true})
    editorElement.value?.scrollIntoView({behavior:'smooth',block:'start'})
  })
}
function requestEditorSelection(action: () => void) {
  if (editorBusy.value) return
  if (editorDirty.value) { pendingEditorAction.value = action; return }
  action()
}
function confirmEditorSelection() {
  const action = pendingEditorAction.value
  pendingEditorAction.value = null
  action?.()
}
function showInvalidUserField(event: Event) {
  event.preventDefault()
  userEditorTab.value = 'info'
  const input = event.target as HTMLInputElement
  void nextTick(() => input.focus())
}
function usersForRole(roleId: number) { return store.users.filter(user => userRoles(user).some(role => role.id === roleId)) }
function userInitials(user: CompanyManagedUser) {
  return ((user.firstName?.[0] || user.username?.[0] || '?') + (user.lastName?.[0] || '')).toLocaleUpperCase('pl-PL')
}
function setOverrideEffect(permission: string, value: string) {
  if (!canEditUserOverrides.value || editorBusy.value) return
  if (value === 'INHERIT') {
    permissionOverrideForm.value = permissionOverrideForm.value.filter(item => item.permission !== permission)
  } else if (value === 'GRANT' || value === 'DENY') {
    if (overrideEffectFor(permission) !== value) toggleOverride(permission, value)
  }
}
const rolePermissionSearch = ref('')
const permissionOverrideSearch = ref('')
const roleToDelete = ref<CompanyRole | null>(null)
const userToDelete = ref<CompanyManagedUser | null>(null)
const isRoleEditorOpen = ref(false)
const isUserEditorOpen = ref(false)
const isChangingUserStatus = ref(false)
const permissionOverrideForm = ref<CompanyUserPermissionOverride[]>([])

const roleForm = reactive({
  id: null as number | null,
  code: '',
  name: '',
  permissions: [] as string[],
})

const userForm = reactive({
  id: null as number | null,
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  active: true,
  roleIds: [] as number[],
})

const canCreateRoles = computed(() => hasPermission('roles.create'))
const canUpdateRoles = computed(() => hasPermission('roles.update'))
const canDeleteRoles = computed(() => hasPermission('roles.delete'))
const canCreateUsers = computed(() => hasPermission('users.create'))
const canUpdateUsers = computed(() => hasPermission('users.update'))
const canDeleteUsers = computed(() => hasPermission('users.delete'))
const canBlockUsers = computed(() => hasPermission('users.block'))
const canAssignRoles = computed(() => hasPermission('roles.assign'))
const canSaveRoleForm = computed(() => roleForm.id ? canUpdateRoles.value && selectedRole.value?.editable !== false : canCreateRoles.value)
const canSaveUserForm = computed(() => userForm.id ? canUpdateUsers.value : canCreateUsers.value)
const canChangeUserRoles = computed(() => userForm.id ? canAssignRoles.value : canCreateUsers.value)

const permissionByCode = computed(() => {
  const map = new Map<string, CompanyPermission>()
  store.permissions.forEach((permission) => map.set(permission.code, permission))
  return map
})

const selectedRole = computed(() => (
  roleForm.id ? store.roles.find((role) => role.id === roleForm.id) || null : null
))

const selectedUser = computed(() => (
  userForm.id ? store.users.find((userItem) => userItem.id === userForm.id) || null : null
))

const filteredRoles = computed(() => {
  const query = roleSearch.value.trim().toLowerCase()

  if (!query) {
    return store.roles
  }

  return store.roles.filter((role) => [
    role.name,
    ...role.permissions.map(permissionLabel),
    ...role.permissions,
  ].some((value) => value.toLowerCase().includes(query)))
})

const rolePermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, rolePermissionSearch.value)))
const overridePermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, permissionOverrideSearch.value)))

const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase()
  return store.users.filter(userItem => {
    const roles = userRoles(userItem)
    return (userRoleFilter.value === 'all' || roles.some(role => String(role.id) === userRoleFilter.value)) && (!query || [
      userItem.username,userItem.email,userItem.firstName,userItem.lastName,...roles.map(role => role.name),
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(query)))
  })
})

const deleteMessage = computed(() => {
  if (roleToDelete.value) {
    return `Rola ${roleToDelete.value.name} zostanie usunięta z firmy.`
  }

  if (userToDelete.value) {
    return `Użytkownik ${displayUserName(userToDelete.value)} straci dostęp do firmy.`
  }

  return ''
})

watch(() => store.roles.map(role => String(role.id)), ids => {
  if (userRoleFilter.value !== 'all' && !ids.includes(userRoleFilter.value)) userRoleFilter.value = 'all'
})

watch(() => authStore.activeCompanyId, () => {
  pendingEditorAction.value = null
  closeRoleEditor()
  closeUserEditor()
  clearDeleteTargets()
  userRoleFilter.value = 'all'
  userSearch.value = ''
  roleSearch.value = ''
})


watch(userEditorTab, (tab) => {
  localStorage.setItem(USER_EDITOR_TAB_KEY, tab)
})


function readStoredUserEditorTab(): UserEditorTab {
  const storedValue = localStorage.getItem(USER_EDITOR_TAB_KEY)

  if (storedValue === 'permissions') {
    return storedValue
  }

  return 'info'
}


function setUserEditorTab(value: string) {
  if (value === 'info' || value === 'permissions') userEditorTab.value = value
}

function normalizeCategory(category?: string | null) {
  const normalizedCategory = category || 'other'
  return categoryAliases[normalizedCategory] || normalizedCategory
}

function categoryLabel(category: string) {
  return categoryLabels[category] || category
}

function groupPermissions(permissions: CompanyPermission[]): PermissionCategoryGroup[] {
  const map = new Map<string, CompanyPermission[]>()

  permissions.forEach((permission) => {
    const category = normalizeCategory(permission.category)
    map.set(category, [...(map.get(category) || []), permission])
  })

  return [...map.entries()]
    .sort(([first], [second]) => (
      (categoryOrder[first] ?? categoryOrder.other) - (categoryOrder[second] ?? categoryOrder.other) ||
      categoryLabel(first).localeCompare(categoryLabel(second), 'pl')
    ))
    .map(([category, items]) => ({
      category,
      label: categoryLabel(category),
      permissions: [...items].sort(comparePermissions),
    }))
}

function permissionActionRank(permission: CompanyPermission) {
  const code = permission.code.toLowerCase()
  const codeParts = code.split(/[.:_-]/).filter(Boolean)
  const label = `${permission.name || ''} ${permission.description || ''}`.toLowerCase()
  const directAction = codeParts[codeParts.length - 1]

  if (code.endsWith('.edit_any')) return actionOrder.edit_any
  if (code.endsWith('.delete_any')) return actionOrder.delete_any
  if (code.endsWith('.change_status')) return actionOrder.change_status

  if (directAction && actionOrder[directAction] !== undefined) {
    return actionOrder[directAction]
  }

  if (/\b(podgląd|podglad|odczyt|wyświetl|wyswietl|lista)\b/.test(label)) return actionOrder.read
  if (/\b(dodawanie|dodaj|tworzenie|utwórz|utworz|nowy)\b/.test(label)) return actionOrder.create
  if (/\b(edycja|edytuj|aktualizacja|zmiana|modyfikacja)\b/.test(label)) return actionOrder.update
  if (/\b(usuwanie|usuń|usun|kasowanie)\b/.test(label)) return actionOrder.delete

  return 80
}

function comparePermissions(first: CompanyPermission, second: CompanyPermission) {
  return permissionActionRank(first) - permissionActionRank(second) ||
    (first.name || first.code).localeCompare(second.name || second.code, 'pl') ||
    first.code.localeCompare(second.code)
}

function filterPermissions(permissions: CompanyPermission[], queryValue: string) {
  const query = queryValue.trim().toLowerCase()

  if (!query) {
    return permissions
  }

  return permissions.filter((permission) => [
    permission.code,
    permission.name,
    permission.description,
    permission.category,
    categoryLabel(normalizeCategory(permission.category)),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query)))
}

function displayUserName(userItem: CompanyManagedUser) {
  const fullName = `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim()
  return fullName || userItem.username || userItem.email || `#${userItem.id}`
}

function userRoles(userItem: CompanyManagedUser) {
  if (userItem.roles?.length) {
    return userItem.roles
  }

  return store.roles.filter((role) => (userItem.roleIds || []).includes(role.id))
}

function permissionLabel(permissionCode: string) {
  return permissionByCode.value.get(permissionCode)?.name || permissionCode
}

function permissionTitle(permission: CompanyPermission) {
  return [
    permission.name || permission.code,
    permission.description,
    permission.code,
  ].filter(Boolean).join(' · ')
}

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function roleTitle(role: CompanyRole) {
  return [
    role.name,
    role.code,
    role.permissions.map(permissionLabel).join(', '),
  ].filter(Boolean).join(' · ')
}

function resetRoleForm() {
  roleForm.id = null
  roleForm.code = ''
  roleForm.name = ''
  roleForm.permissions = []
  rolePermissionSearch.value = ''
}

function openNewRoleEditor() {
  if (!canCreateRoles.value) {
    return
  }

  closeUserEditor()
  resetRoleForm()
  isRoleEditorOpen.value = true
  markEditorSaved()
  focusEditor()
}

function openEditRoleEditor(role: CompanyRole) {
  closeUserEditor()
  roleForm.id = role.id
  roleForm.code = role.code
  roleForm.name = role.name
  roleForm.permissions = [...role.permissions]
  rolePermissionSearch.value = ''
  isRoleEditorOpen.value = true
  markEditorSaved()
  focusEditor()
}

function closeRoleEditor() {
  isRoleEditorOpen.value = false
  resetRoleForm()
  markEditorSaved()
}

function toggleRolePermission(permission: string) {
  if (!canSaveRoleForm.value) {
    return
  }

  const index = roleForm.permissions.indexOf(permission)

  if (index >= 0) {
    roleForm.permissions.splice(index, 1)
    return
  }

  roleForm.permissions.push(permission)
}

async function saveRole() {
  if (editorBusy.value || !canSaveRoleForm.value) {
    return
  }

  const code = roleForm.code.trim()
  const name = roleForm.name.trim()
  const permissions = [...new Set(roleForm.permissions)]

  if (!code || !name) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak danych',
      message: 'Kod i nazwa roli są wymagane.',
    })
    return
  }

  isSavingEditor.value = true
  try {
    if (roleForm.id) {
      await store.updateRole(roleForm.id, { code, name })
      await store.updateRolePermissions(roleForm.id, permissions)
      uiStore.addToast({
        type: 'success',
        title: 'Rola zapisana',
        message: 'Zaktualizowano rolę i jej uprawnienia.',
      })
    } else {
      await store.createRole({ code, name, permissions })
      uiStore.addToast({
        type: 'success',
        title: 'Rola dodana',
        message: 'Utworzono nową rolę.',
      })
    }

    closeRoleEditor()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Błąd roli',
      message: 'Nie udało się zapisać roli.',
    })
  } finally {
    isSavingEditor.value = false
  }
}

function resetUserForm() {
  userForm.id = null
  userForm.username = ''
  userForm.email = ''
  userForm.password = ''
  userForm.firstName = ''
  userForm.lastName = ''
  userForm.active = true
  userForm.roleIds = []
  permissionOverrideForm.value = []
  permissionOverrideSearch.value = ''
}

function openNewUserEditor() {
  if (!canCreateUsers.value) {
    return
  }

  closeRoleEditor()
  resetUserForm()
  userEditorTab.value = 'info'
  isUserEditorOpen.value = true
  markEditorSaved()
  focusEditor()
}

function openEditUserEditor(userItem: CompanyManagedUser) {
  isUserMenuOpen.value = false
  closeRoleEditor()
  userEditorTab.value = 'info'
  userForm.id = userItem.id
  userForm.username = userItem.username || ''
  userForm.email = userItem.email || ''
  userForm.password = ''
  userForm.firstName = userItem.firstName || ''
  userForm.lastName = userItem.lastName || ''
  userForm.active = userItem.active !== false
  userForm.roleIds = [...(userItem.roleIds || userRoles(userItem).map((role) => role.id))]
  permissionOverrideForm.value = [...(userItem.permissionOverrides || [])]
  permissionOverrideSearch.value = ''
  isUserEditorOpen.value = true
  markEditorSaved()
  focusEditor()
}

function closeUserEditor() {
  isUserEditorOpen.value = false
  resetUserForm()
  isUserMenuOpen.value = false
  markEditorSaved()
}

async function toggleSelectedUserStatus() {
  if (!selectedUser.value || !canBlockUsers.value || isChangingUserStatus.value) {
    return
  }

  const nextActive = selectedUser.value.active === false
  isChangingUserStatus.value = true

  try {
    const updatedUser = await store.updateUser(selectedUser.value.id, { active: nextActive })
    userForm.active = updatedUser.active !== false
    if (editorBaseline.value) {
      const baseline = JSON.parse(editorBaseline.value)
      baseline.active = userForm.active
      editorBaseline.value = JSON.stringify(baseline)
    }
    uiStore.addToast({
      type: 'success',
      title: nextActive ? 'Użytkownik odblokowany' : 'Użytkownik zablokowany',
      message: nextActive
        ? 'Użytkownik ponownie ma dostęp do firmy.'
        : 'Dostęp użytkownika do firmy został zablokowany.',
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się zmienić statusu',
      message: 'Status użytkownika nie został zmieniony.',
    })
  } finally {
    isChangingUserStatus.value = false
  }
}

function toggleUserRole(roleId: number) {
  if (!canChangeUserRoles.value) {
    return
  }

  const index = userForm.roleIds.indexOf(roleId)

  if (index >= 0) {
    userForm.roleIds.splice(index, 1)
    return
  }

  userForm.roleIds.push(roleId)
}

async function saveUser() {
  if (editorBusy.value || !canSaveUserForm.value) {
    return
  }

  const username = userForm.username.trim()
  const email = userForm.email.trim()
  const firstName = userForm.firstName.trim()
  const lastName = userForm.lastName.trim()
  const overrides = [...permissionOverrideForm.value]

  if (!username || !email || (!userForm.id && !userForm.password.trim())) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak danych',
      message: 'Login, email i hasło dla nowego użytkownika są wymagane.',
    })
    return
  }
  if (!userForm.id) {
    const message = newPasswordError(userForm.password)
    if (message) {
      uiStore.addToast({ type: 'warning', title: 'Nieprawidłowe hasło', message })
      return
    }
  }

  isSavingEditor.value = true
  try {
    if (userForm.id) {
      await store.updateUser(userForm.id, {
        username,
        email,
        firstName,
        lastName,
      })

      if (canAssignRoles.value) {
        await store.updateUserRoles(userForm.id, [...new Set(userForm.roleIds)])
      }

      if (canUpdateUsers.value) {
        await store.updateUserPermissionOverrides(userForm.id, overrides)
      }
      uiStore.addToast({
        type: 'success',
        title: 'Użytkownik zapisany',
        message: 'Zaktualizowano dane, role i uprawnienia.',
      })
    } else {
      await store.createUser({
        username,
        email,
        password: userForm.password,
        firstName,
        lastName,
        roleIds: [...new Set(userForm.roleIds)],
        permissionOverrides: overrides,
      })
      uiStore.addToast({
        type: 'success',
        title: 'Użytkownik dodany',
        message: 'Dodano użytkownika do firmy.',
      })
    }

    closeUserEditor()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Błąd użytkownika',
      message: 'Nie udało się zapisać użytkownika.',
    })
  } finally {
    isSavingEditor.value = false
  }
}

function overrideEffectFor(permission: string) {
  return permissionOverrideForm.value.find((override) => override.permission === permission)?.effect || null
}

function toggleOverride(permission: string, effect: OverrideEffect) {
  if (!canEditUserOverrides.value) {
    return
  }

  const currentEffect = overrideEffectFor(permission)

  if (currentEffect === effect) {
    permissionOverrideForm.value = permissionOverrideForm.value.filter((override) => override.permission !== permission)
    return
  }

  const nextOverride = { permission, effect }
  const index = permissionOverrideForm.value.findIndex((override) => override.permission === permission)

  if (index >= 0) {
    permissionOverrideForm.value.splice(index, 1, nextOverride)
    return
  }

  permissionOverrideForm.value = [...permissionOverrideForm.value, nextOverride]
}

function requestDeleteCurrentRole() {
  if (canDeleteRoles.value && selectedRole.value) {
    roleToDelete.value = selectedRole.value
  }
}

function requestDeleteCurrentUser() {
  if (canDeleteUsers.value && selectedUser.value) {
    userToDelete.value = selectedUser.value
  }
}

function clearDeleteTargets() {
  roleToDelete.value = null
  userToDelete.value = null
}

async function confirmDelete() {
  try {
    if (roleToDelete.value) {
      if (!canDeleteRoles.value) {
        return
      }

      const deletedRoleId = roleToDelete.value.id
      await store.deleteRole(deletedRoleId)
      uiStore.addToast({
        type: 'success',
        title: 'Rola usunięta',
        message: 'Usunięto rolę z firmy.',
      })

      if (roleForm.id === deletedRoleId) {
        closeRoleEditor()
      }
    }

    if (userToDelete.value) {
      if (!canDeleteUsers.value) {
        return
      }

      const deletedUserId = userToDelete.value.id
      await store.deleteUser(deletedUserId)
      uiStore.addToast({
        type: 'success',
        title: 'Użytkownik usunięty',
        message: 'Użytkownik został usunięty z firmy.',
      })

      if (userForm.id === deletedUserId) {
        closeUserEditor()
      }
    }

    clearDeleteTargets()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się usunąć',
      message: 'Operacja nie została wykonana.',
    })
  }
}

async function reload() {
  try {
    await store.loadAll()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się pobrać danych',
      message: 'Sprawdź uprawnienia lub spróbuj ponownie.',
    })
  }
}

onMounted(async () => {
  await authStore.restoreBackendSession()
  await reload()
})
const workspacePortal = useWorkspacePortal()
useWorkspaceDirty(editorDirty)
</script>

<style scoped>
.company-management { grid-template-columns: minmax(0,1fr); }
.company-editor { outline: none; scroll-margin-top: 1rem; }
.company-avatar { display:grid; width:2.25rem; height:2.25rem; flex-shrink:0; place-items:center; border:1px solid rgb(var(--rw-border)); border-radius:var(--rw-radius-control); background:rgb(var(--rw-surface-muted)); font-size:.75rem; font-weight:600; color:rgb(var(--rw-text-muted)); }
.company-choice-row { display:flex; min-width:0; align-items:center; gap:.75rem; padding:.75rem 1rem; border-bottom:1px solid rgb(var(--rw-border)); cursor:pointer; }
.company-choice-row:last-child { border-bottom:0; }
.company-permission-heading { padding:.6rem 1rem; border-bottom:1px solid rgb(var(--rw-border)); background:rgb(var(--rw-surface-muted)); color:rgb(var(--rw-text-muted)); font-size:.6875rem; font-weight:600; }
.company-permission-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.5rem 1rem; border-bottom:1px solid rgb(var(--rw-border)); }
.company-editor-footer { position:sticky; bottom:0; z-index:5; display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:.5rem; padding:.75rem; border:1px solid rgb(var(--rw-border)); border-radius:var(--rw-radius-panel); background:rgb(var(--rw-surface)); }
.company-editor :deep(.ui-card-header > div:first-child) { min-width:0; }
@media(min-width:1536px) { .company-directories { grid-template-columns:minmax(0,1.65fr) minmax(0,1fr); } }
@media(max-width:479px) { .company-permission-row { flex-wrap:wrap; gap:.5rem; } }
</style>
