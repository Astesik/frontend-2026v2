<template>
  <div class="space-y-4 xl:flex xl:h-[calc(100dvh-15rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-4 xl:overflow-hidden">
    <AppTabs
      class="w-fit shrink-0"
      :model-value="activeSection"
      :items="sections"
      aria-label="Zarządzanie firmą"
      @update:model-value="setActiveSection"
    />

    <div
      v-if="!store.isLoading && !store.roles.length && !store.permissions.length"
      class="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400 dark:bg-app-panel dark:text-amber-300"
    >
      <p class="font-semibold">Nie pobrano jeszcze ról ani uprawnień.</p>
      <p class="mt-1">
        Aktywna firma: {{ authStore.activeCompanyId || '-' }} · Role sesji: {{ sessionRolesText }} · Uprawnienia sesji: {{ sessionPermissionsText }}
      </p>
    </div>

    <AppCard
      v-if="activeSection === 'roles'"
      compact
      class="xl:min-h-0 xl:flex-1 xl:overflow-hidden"
      content-class="xl:flex xl:h-full xl:min-h-0 xl:flex-col"
    >
      <div class="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-950 dark:text-slate-50">Role</h3>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <AppInput v-model="roleSearch" class="sm:w-72" placeholder="Szukaj roli" size="sm" clearable />
          <AppButton
            size="sm"
            :disabled="!canCreateRoles"
            :title="!canCreateRoles ? 'Brak uprawnienia: roles.create' : undefined"
            @click="openNewRoleDrawer"
          >
            <Plus class="h-4 w-4" />
            Dodaj rolę
          </AppButton>
        </div>
      </div>

      <div v-if="store.isLoading" class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Pobieranie danych...
      </div>

      <div v-if="store.isLoading" class="ui-empty-state">
        Ładowanie ról...
      </div>

      <div v-else-if="!filteredRoles.length" class="ui-empty-state">
        Brak danych dla aktualnego filtra.
      </div>

      <div v-else class="ui-table-shell min-h-0 flex-1 overflow-auto">
        <table class="ui-table min-w-[520px]">
          <thead class="ui-table-head sticky top-0 z-10">
            <tr>
              <th class="ui-table-cell">Nazwa</th>
              <th class="ui-table-cell">Typ</th>
              <th class="ui-table-cell sticky right-0 z-10 w-20 bg-ui-muted text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))]">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="role in filteredRoles"
              :key="role.id"
              class="ui-table-row group"
            >
              <td class="ui-table-cell">
                <span class="font-semibold text-ui-text">{{ role.name }}</span>
              </td>
              <td class="ui-table-cell">
                <AppBadge :variant="role.systemRole ? 'neutral' : 'info'">
                  {{ role.systemRole ? 'Systemowa' : 'Własna' }}
                </AppBadge>
              </td>
              <td class="ui-table-cell sticky right-0 z-10 bg-ui-surface text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))] transition group-hover:bg-ui-hover">
                <AppIconButton
                  size="sm"
                  :label="role.editable === false ? 'Rola systemowa' : !canUpdateRoles ? 'Brak uprawnienia: roles.update' : 'Edytuj rolę'"
                  :disabled="role.editable === false || !canUpdateRoles"
                  @click="openEditRoleDrawer(role)"
                >
                  <SquarePen class="h-4 w-4" />
                </AppIconButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <AppCard
      v-else
      compact
      class="xl:min-h-0 xl:flex-1 xl:overflow-hidden"
      content-class="xl:flex xl:h-full xl:min-h-0 xl:flex-col"
    >
      <div class="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-950 dark:text-slate-50">Użytkownicy</h3>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <AppInput v-model="userSearch" class="sm:w-72" placeholder="Szukaj użytkownika" size="sm" clearable />
          <AppButton
            size="sm"
            :disabled="!canCreateUsers"
            :title="!canCreateUsers ? 'Brak uprawnienia: users.create' : undefined"
            @click="openNewUserDrawer"
          >
            <Plus class="h-4 w-4" />
            Dodaj użytkownika
          </AppButton>
        </div>
      </div>

      <div v-if="store.isLoading" class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Pobieranie danych...
      </div>

      <div class="ui-table-shell min-h-0 flex-1 overflow-auto">
        <table class="ui-table min-w-[760px]">
          <thead class="ui-table-head sticky top-0 z-10">
            <tr>
              <th class="ui-table-cell">Użytkownik</th>
              <th class="ui-table-cell">Email</th>
              <th class="ui-table-cell">Status</th>
              <th class="ui-table-cell">Role</th>
              <th class="ui-table-cell sticky right-0 z-10 w-20 bg-ui-muted text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))]">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="userItem in filteredUsers"
              :key="userItem.id"
              class="ui-table-row group"
            >
              <td class="ui-table-cell">
                <span class="font-semibold text-ui-text">{{ displayUserName(userItem) }}</span>
                <p class="mt-0.5 ui-caption">{{ userItem.username }}</p>
              </td>
              <td class="ui-table-cell text-ui-text-secondary">{{ userItem.email || '-' }}</td>
              <td class="ui-table-cell">
                <AppBadge :variant="userItem.active === false ? 'error' : 'success'">
                  {{ userItem.active === false ? 'Zablokowany' : 'Aktywny' }}
                </AppBadge>
              </td>
              <td class="ui-table-cell">
                <span class="text-ui-text-secondary">{{ userRoles(userItem).map((role) => role.name).join(', ') || '-' }}</span>
              </td>
              <td class="ui-table-cell sticky right-0 z-10 bg-ui-surface text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))] transition group-hover:bg-ui-hover">
                <AppIconButton
                  size="sm"
                  :label="!canUpdateUsers ? 'Brak uprawnienia: users.update' : 'Edytuj użytkownika'"
                  :disabled="!canUpdateUsers"
                  @click="openEditUserDrawer(userItem)"
                >
                  <SquarePen class="h-4 w-4" />
                </AppIconButton>
              </td>
            </tr>

            <tr v-if="!filteredUsers.length">
              <td colspan="5" class="ui-empty-state border-0">
                Brak użytkowników pasujących do filtra.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <Teleport to="body">
      <AppDrawer
        :open="isRoleDrawerOpen"
        :title="roleForm.id ? 'Edytuj rolę' : 'Dodaj rolę'"
        size="lg"
        :busy="store.isMutating"
        @close="closeRoleDrawer"
      >
        <form id="company-role-form" @submit.prevent="saveRole">
          <div class="grid gap-3 sm:grid-cols-2">
            <AppInput v-model="roleForm.code" label="Kod roli" placeholder="np. DISPATCHER" size="sm" />
            <AppInput v-model="roleForm.name" label="Nazwa roli" placeholder="np. Dyspozytor" size="sm" />
          </div>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h3 class="ui-card-title">Uprawnienia</h3>
            <AppInput v-model="rolePermissionSearch" class="sm:w-72" placeholder="Szukaj uprawnienia" size="sm" clearable />
          </div>

          <div class="ui-table-shell mt-3">
            <table class="ui-table">
              <thead class="ui-table-head">
                <tr>
                  <th class="py-2 pl-3 pr-3 font-medium">Uprawnienie</th>
                  <th class="w-20 py-2 pr-3 text-center font-medium">Aktywne</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="permission in roleDrawerPermissions"
                  :key="permission.code"
                  class="ui-table-row cursor-pointer"
                  :title="permissionTitle(permission)"
                  @click="canSaveRoleForm && toggleRolePermission(permission.code)"
                >
                  <td class="py-2 pl-3 pr-3 font-medium text-ui-text">{{ permission.name || permission.code }}</td>
                  <td class="py-2 pr-3 text-center">
                    <AppCheckbox
                      class="mx-auto"
                      :model-value="roleForm.permissions.includes(permission.code)"
                      :aria-label="permission.name || permission.code"
                      :disabled="!canSaveRoleForm"
                      @click.stop
                      @update:model-value="toggleRolePermission(permission.code)"
                    />
                  </td>
                </tr>
                <tr v-if="!roleDrawerPermissions.length">
                  <td colspan="2" class="py-6 text-center ui-body-sm text-ui-mutedText">Brak uprawnień pasujących do filtra.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </form>

        <template #footer>
          <AppButton
            v-if="roleForm.id && selectedRole?.editable !== false"
            variant="danger"
            type="button"
            :disabled="!canDeleteRoles"
            @click="requestDeleteCurrentRole"
          >
            <Trash2 class="h-4 w-4" />
            Usuń rolę
          </AppButton>
          <span class="flex-1"></span>
          <AppButton variant="secondary" type="button" @click="closeRoleDrawer">Anuluj</AppButton>
          <AppButton form="company-role-form" type="submit" :loading="store.isMutating" :disabled="!canSaveRoleForm">
            <Save class="h-4 w-4" />
            {{ roleForm.id ? 'Zapisz' : 'Dodaj' }}
          </AppButton>
        </template>
      </AppDrawer>

      <AppDrawer
        :open="isUserDrawerOpen"
        :title="userForm.id ? 'Edytuj użytkownika' : 'Dodaj użytkownika'"
        size="lg"
        :busy="store.isMutating"
        @close="closeUserDrawer"
      >
        <template #header>
          <div>
            <h2 class="ui-section-title">{{ userForm.id ? 'Edytuj użytkownika' : 'Dodaj użytkownika' }}</h2>
            <AppBadge v-if="userForm.id" class="mt-2" :variant="userForm.active ? 'success' : 'error'">
              {{ userForm.active ? 'Aktywny' : 'Zablokowany' }}
            </AppBadge>
          </div>
        </template>

        <template #toolbar>
          <AppTabs
            :model-value="userDrawerTab"
            :items="userDrawerTabs"
            aria-label="Sekcje użytkownika"
            size="sm"
            @update:model-value="setUserDrawerTab"
          />
        </template>

        <form id="company-user-form" @submit.prevent="saveUser">
          <div v-if="userDrawerTab === 'info'" class="grid gap-3 sm:grid-cols-2">
            <AppInput v-model="userForm.firstName" label="Imię" placeholder="Imię" size="sm" />
            <AppInput v-model="userForm.lastName" label="Nazwisko" placeholder="Nazwisko" size="sm" />
            <AppInput v-model="userForm.username" label="Login" placeholder="Login" size="sm" />
            <AppInput v-model="userForm.email" label="Email" type="email" placeholder="email@firma.pl" size="sm" />
            <AppPasswordInput
              v-if="!userForm.id"
              v-model="userForm.password"
              label="Hasło"
              placeholder="Hasło startowe"
              autocomplete="new-password"
              size="sm"
            />
          </div>

          <div v-else-if="userDrawerTab === 'roles'" class="ui-table-shell">
            <div
              v-for="role in store.roles"
              :key="role.id"
              class="flex cursor-pointer items-center gap-2 border-b border-ui-divider px-3 py-2 text-sm transition last:border-0 hover:bg-ui-hover"
              :title="roleTitle(role)"
              @click="canChangeUserRoles && toggleUserRole(role.id)"
            >
              <AppCheckbox
                :model-value="userForm.roleIds.includes(role.id)"
                :aria-label="role.name"
                :disabled="!canChangeUserRoles"
                @click.stop
                @update:model-value="toggleUserRole(role.id)"
              />
              <span class="min-w-0 truncate font-medium text-ui-text">{{ role.name }}</span>
            </div>
          </div>

          <div v-else class="space-y-3">
            <AppInput v-model="permissionOverrideSearch" placeholder="Szukaj uprawnienia" size="sm" clearable />
            <section class="ui-table-shell">
              <table class="ui-table">
                <thead class="ui-table-head">
                  <tr>
                    <th class="py-2 pl-3 pr-3 font-medium">Uprawnienie</th>
                    <th class="w-20 py-2 pr-2 text-center font-medium">Grant</th>
                    <th class="w-20 py-2 pr-3 text-center font-medium">Deny</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="permission in overridePermissions" :key="permission.code" class="ui-table-row" :title="permissionTitle(permission)">
                    <td class="py-2 pl-3 pr-3 font-medium text-ui-text">{{ permission.name || permission.code }}</td>
                    <td class="py-2 pr-2 text-center">
                      <AppIconButton
                        size="sm"
                        label="Nadaj uprawnienie"
                        :class="overrideEffectFor(permission.code) === 'GRANT' ? '!border-success-100 !bg-success-50 !text-success-600 dark:!border-success-400/50 dark:!bg-success-400/10 dark:!text-success-400' : ''"
                        :disabled="!canUpdateUsers"
                        @click="toggleOverride(permission.code, 'GRANT')"
                      >
                        <CheckCircle2 class="h-4 w-4" />
                      </AppIconButton>
                    </td>
                    <td class="py-2 pr-3 text-center">
                      <AppIconButton
                        size="sm"
                        label="Odbierz uprawnienie"
                        :class="overrideEffectFor(permission.code) === 'DENY' ? '!border-danger-100 !bg-danger-50 !text-danger-600 dark:!border-danger-400/50 dark:!bg-danger-400/10 dark:!text-danger-400' : ''"
                        :disabled="!canUpdateUsers"
                        @click="toggleOverride(permission.code, 'DENY')"
                      >
                        <X class="h-4 w-4" />
                      </AppIconButton>
                    </td>
                  </tr>
                  <tr v-if="!overridePermissions.length">
                    <td colspan="3" class="py-6 text-center ui-body-sm text-ui-mutedText">Brak uprawnień pasujących do filtra.</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        </form>

        <template #footer>
          <AppButton v-if="userForm.id && canResetUserPassword" variant="secondary" type="button" @click="openPasswordResetModal">
            <KeyRound class="h-4 w-4" />
            Resetuj hasło
          </AppButton>
          <AppButton v-if="userForm.id && canBlockUsers" variant="secondary" type="button" :loading="isChangingUserStatus" @click="toggleSelectedUserStatus">
            <component :is="userForm.active ? UserRoundX : UserRoundCheck" class="h-4 w-4" />
            {{ userForm.active ? 'Zablokuj' : 'Odblokuj' }}
          </AppButton>
          <AppButton v-if="userForm.id" variant="danger" type="button" :disabled="!canDeleteUsers" @click="requestDeleteCurrentUser">
            <Trash2 class="h-4 w-4" />
            Usuń użytkownika
          </AppButton>
          <span class="flex-1"></span>
          <AppButton variant="secondary" type="button" @click="closeUserDrawer">Anuluj</AppButton>
          <AppButton form="company-user-form" type="submit" :loading="store.isMutating" :disabled="!canSaveUserForm">
            <Save class="h-4 w-4" />
            {{ userForm.id ? 'Zapisz' : 'Dodaj' }}
          </AppButton>
        </template>
      </AppDrawer>

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

      <AppModal
        :open="Boolean(passwordResetUser)"
        title="Resetuj hasło"
        :description="passwordResetUser ? displayUserName(passwordResetUser) : undefined"
        size="sm"
        :busy="store.isMutating"
        @close="closePasswordResetModal"
      >
        <form id="password-reset-form" class="space-y-3" @submit.prevent="submitPasswordReset">
          <AppPasswordInput
            id="company-user-new-password"
            v-model="passwordResetForm.newPassword"
            label="Nowe hasło"
            autocomplete="new-password"
            required
          />
          <AppPasswordInput
            id="company-user-repeat-password"
            v-model="passwordResetForm.repeatPassword"
            label="Powtórz hasło"
            autocomplete="new-password"
            required
          />
          <p v-if="passwordResetError" class="ui-error">{{ passwordResetError }}</p>
        </form>
        <template #footer>
          <AppButton variant="secondary" type="button" @click="closePasswordResetModal">Anuluj</AppButton>
          <AppButton form="password-reset-form" type="submit" :loading="store.isMutating">
            <KeyRound class="h-4 w-4" />
            Zmień hasło
          </AppButton>
        </template>
      </AppModal>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  CheckCircle2,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  SquarePen,
  Trash2,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPasswordInput from '@/components/ui/AppPasswordInput.vue'
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

type SectionKey = 'roles' | 'users'
type UserDrawerTab = 'info' | 'roles' | 'permissions'
type OverrideEffect = 'GRANT' | 'DENY'

interface PermissionCategoryGroup {
  category: string
  label: string
  permissions: CompanyPermission[]
}

const SECTION_KEY = 'routewise.companyManagement.section'
const USER_DRAWER_TAB_KEY = 'routewise.companyManagement.userDrawerTab'

const sections = [
  { value: 'roles' as const, label: 'Role', icon: ShieldCheck },
  { value: 'users' as const, label: 'Użytkownicy', icon: Users },
]

const userDrawerTabs = [
  { value: 'info' as const, label: 'Informacje', icon: UserRound },
  { value: 'roles' as const, label: 'Role', icon: Users },
  { value: 'permissions' as const, label: 'Uprawnienia', icon: KeyRound },
]

const categoryLabels: Record<string, string> = {
  system: 'System',
  vehicles: 'Pojazdy',
  devices: 'Urządzenia',
  repairs: 'Naprawy',
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
const router = useRouter()

const activeSection = ref<SectionKey>(readStoredSection())
const userDrawerTab = ref<UserDrawerTab>(readStoredUserDrawerTab())
const roleSearch = ref('')
const userSearch = ref('')
const rolePermissionSearch = ref('')
const permissionOverrideSearch = ref('')
const roleToDelete = ref<CompanyRole | null>(null)
const userToDelete = ref<CompanyManagedUser | null>(null)
const passwordResetUser = ref<CompanyManagedUser | null>(null)
const isRoleDrawerOpen = ref(false)
const isUserDrawerOpen = ref(false)
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
const passwordResetForm = reactive({
  newPassword: '',
  repeatPassword: '',
})
const passwordResetError = ref('')

const canCreateRoles = computed(() => hasPermission('roles.create'))
const canUpdateRoles = computed(() => hasPermission('roles.update'))
const canDeleteRoles = computed(() => hasPermission('roles.delete'))
const canCreateUsers = computed(() => hasPermission('users.create'))
const canUpdateUsers = computed(() => hasPermission('users.update'))
const canDeleteUsers = computed(() => hasPermission('users.delete'))
const canBlockUsers = computed(() => hasPermission('users.block'))
const canResetUserPassword = computed(() => authStore.hasActiveCompanyPermission('users.reset_password'))
const canAssignRoles = computed(() => hasPermission('roles.assign'))
const canSaveRoleForm = computed(() => roleForm.id ? canUpdateRoles.value : canCreateRoles.value)
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

const roleDrawerPermissions = computed(() => [...filterPermissions(store.permissions, rolePermissionSearch.value)].sort(comparePermissions))
const roleDrawerPermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, rolePermissionSearch.value)))
const overridePermissions = computed(() => [...filterPermissions(store.permissions, permissionOverrideSearch.value)].sort(comparePermissions))
const overridePermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, permissionOverrideSearch.value)))
const sessionRolesText = computed(() => authStore.activeCompanyRoles.length ? authStore.activeCompanyRoles.join(', ') : '-')
const sessionPermissionsText = computed(() => authStore.activeCompanyPermissions.length ? authStore.activeCompanyPermissions.join(', ') : '-')

const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase()

  if (!query) {
    return store.users
  }

  return store.users.filter((userItem) => [
    userItem.username,
    userItem.email,
    userItem.firstName,
    userItem.lastName,
    ...userRoles(userItem).map((role) => role.name),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query)))
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

watch(activeSection, (section) => {
  localStorage.setItem(SECTION_KEY, section)
})

watch(userDrawerTab, (tab) => {
  localStorage.setItem(USER_DRAWER_TAB_KEY, tab)
})

function readStoredSection(): SectionKey {
  const storedValue = localStorage.getItem(SECTION_KEY)
  return storedValue === 'users' ? 'users' : 'roles'
}

function readStoredUserDrawerTab(): UserDrawerTab {
  const storedValue = localStorage.getItem(USER_DRAWER_TAB_KEY)

  if (storedValue === 'roles' || storedValue === 'permissions') {
    return storedValue
  }

  return 'info'
}

function setActiveSection(value: string) {
  if (value === 'roles' || value === 'users') activeSection.value = value
}

function setUserDrawerTab(value: string) {
  if (value === 'info' || value === 'roles' || value === 'permissions') userDrawerTab.value = value
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

function openNewRoleDrawer() {
  if (!canCreateRoles.value) {
    return
  }

  resetRoleForm()
  isRoleDrawerOpen.value = true
}

function openEditRoleDrawer(role: CompanyRole) {
  if (role.editable === false || !canUpdateRoles.value) {
    return
  }

  roleForm.id = role.id
  roleForm.code = role.code
  roleForm.name = role.name
  roleForm.permissions = [...role.permissions]
  rolePermissionSearch.value = ''
  isRoleDrawerOpen.value = true
}

function closeRoleDrawer() {
  isRoleDrawerOpen.value = false
  resetRoleForm()
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
  if (!canSaveRoleForm.value) {
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

    closeRoleDrawer()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Błąd roli',
      message: 'Nie udało się zapisać roli.',
    })
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

function openNewUserDrawer() {
  if (!canCreateUsers.value) {
    return
  }

  resetUserForm()
  userDrawerTab.value = 'info'
  isUserDrawerOpen.value = true
}

function openEditUserDrawer(userItem: CompanyManagedUser) {
  if (!canUpdateUsers.value) {
    return
  }

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
  isUserDrawerOpen.value = true
}

function closeUserDrawer() {
  isUserDrawerOpen.value = false
  closePasswordResetModal()
  resetUserForm()
}

function openPasswordResetModal() {
  if (!canResetUserPassword.value || !selectedUser.value) {
    return
  }

  passwordResetForm.newPassword = ''
  passwordResetForm.repeatPassword = ''
  passwordResetError.value = ''
  passwordResetUser.value = selectedUser.value
}

function closePasswordResetModal() {
  passwordResetUser.value = null
  passwordResetForm.newPassword = ''
  passwordResetForm.repeatPassword = ''
  passwordResetError.value = ''
}

function isCurrentSessionUser(userId: number | string) {
  const sessionUserId = authStore.user?.userId ?? authStore.user?.id ?? authStore.user?.uid
  return sessionUserId !== undefined && String(sessionUserId) === String(userId)
}

async function submitPasswordReset() {
  if (!passwordResetUser.value || !canResetUserPassword.value) {
    return
  }

  const newPassword = passwordResetForm.newPassword

  if (newPassword.length < 8 || newPassword.length > 128) {
    passwordResetError.value = 'Hasło musi mieć od 8 do 128 znaków.'
    return
  }

  if (newPassword !== passwordResetForm.repeatPassword) {
    passwordResetError.value = 'Podane hasła nie są takie same.'
    return
  }

  const resetUserId = passwordResetUser.value.id
  const shouldLogout = isCurrentSessionUser(resetUserId)

  try {
    await store.resetUserPassword(resetUserId, newPassword)
    closePasswordResetModal()
    uiStore.addToast({
      type: 'success',
      title: 'Hasło zmienione',
      message: shouldLogout
        ? 'Twoje hasło zostało zmienione. Zaloguj się ponownie.'
        : 'Nowe hasło użytkownika zostało zapisane.',
    })

    if (shouldLogout) {
      await authStore.logout()
      await router.push('/login')
    }
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się zmienić hasła',
      message: 'Sprawdź hasło i spróbuj ponownie.',
    })
  }
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
  if (!canSaveUserForm.value) {
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

    closeUserDrawer()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Błąd użytkownika',
      message: 'Nie udało się zapisać użytkownika.',
    })
  }
}

function overrideEffectFor(permission: string) {
  return permissionOverrideForm.value.find((override) => override.permission === permission)?.effect || null
}

function toggleOverride(permission: string, effect: OverrideEffect) {
  if (!canUpdateUsers.value) {
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
        closeRoleDrawer()
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
        closeUserDrawer()
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
</script>
