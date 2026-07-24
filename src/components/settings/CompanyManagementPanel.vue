<template>
  <div class="space-y-4 xl:flex xl:h-[calc(100dvh-15rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-4 xl:overflow-hidden">
    <div class="flex shrink-0 flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel">
      <button
        v-for="section in sections"
        :key="section.value"
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
        :class="activeSection === section.value ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-app-dark' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-app-elevated'"
        @click="activeSection = section.value"
      >
        <component :is="section.icon" class="h-4 w-4" />
        {{ section.label }}
      </button>
    </div>

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
          <h3 class="text-base font-semibold text-slate-950 dark:text-slate-50">Role i uprawnienia</h3>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <AppInput v-model="roleSearch" class="sm:w-56" placeholder="Szukaj roli" size="sm" clearable />
          <AppInput v-model="permissionMatrixSearch" class="sm:w-64" placeholder="Szukaj uprawnienia" size="sm" clearable />
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

      <div v-if="store.isLoading" class="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
        Ładowanie ról...
      </div>

      <div v-else-if="!filteredRoles.length || !matrixPermissionCategories.length" class="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
        Brak danych dla aktualnego filtra.
      </div>

      <div v-else class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <section
          v-for="group in matrixPermissionCategories"
          :key="group.category"
          class="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-app-border dark:bg-app-dark"
        >
          <header class="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-app-border dark:bg-app-panel">
            <h4 class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ group.label }}</h4>
          </header>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm" :style="matrixTableStyle(group.permissions.length)">
              <thead class="border-b border-slate-100 text-xs text-slate-500 dark:border-app-border dark:text-slate-400">
                <tr>
                  <th class="sticky left-0 z-10 w-56 bg-white py-2 pl-3 pr-3 font-medium shadow-[1px_0_0_0_rgb(var(--rw-app-border))] dark:bg-app-dark">
                    Rola
                  </th>
                  <th
                    v-for="permission in group.permissions"
                    :key="permission.code"
                    class="min-w-32 py-2 pr-3 text-center align-middle font-medium normal-case"
                    :title="permissionTitle(permission)"
                  >
                    <span class="mx-auto block max-w-36 text-balance text-slate-700 dark:text-slate-200">
                      {{ permission.name || permission.code }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="role in filteredRoles"
                  :key="`${group.category}-${role.id}`"
                  class="group border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
                >
                  <td class="sticky left-0 z-10 bg-white py-2 pl-3 pr-3 shadow-[1px_0_0_0_rgb(var(--rw-app-border))] transition group-hover:bg-slate-50 dark:bg-app-dark dark:group-hover:bg-app-elevated">
                    <div class="flex min-w-0 items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ role.name }}</p>
                        <AppBadge v-if="role.systemRole" variant="neutral">Systemowa</AppBadge>
                      </div>
                      <button
                        type="button"
                        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-app-border dark:bg-app-panel dark:text-slate-300 dark:hover:bg-app-elevated"
                        :disabled="role.editable === false || !canUpdateRoles"
                        title="Edytuj rolę"
                        @click="openEditRoleDrawer(role)"
                      >
                        <SquarePen class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td
                    v-for="permission in group.permissions"
                    :key="`${role.id}-${permission.code}`"
                    class="py-2 pr-3 text-center"
                  >
                    <AppCheckbox
                      class="mx-auto"
                      :model-value="roleHasPermission(role, permission.code)"
                      :aria-label="`${role.name}: ${permission.name || permission.code}`"
                      :disabled="role.editable === false || store.isMutating || !canUpdateRoles"
                      @update:model-value="setRolePermission(role, permission.code, $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
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

      <div class="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-app-border dark:text-slate-400">
            <tr>
              <th class="py-2 pr-3 font-medium">Użytkownik</th>
              <th class="py-2 pr-3 font-medium">Email</th>
              <th class="py-2 pr-3 font-medium">Status</th>
              <th class="py-2 pr-3 font-medium">Role</th>
              <th class="sticky right-0 z-10 w-20 bg-white py-2 pr-1 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] dark:bg-app-panel">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="userItem in filteredUsers"
              :key="userItem.id"
              class="group border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
            >
              <td class="py-1.5 pr-3">
                <span class="font-semibold text-slate-950 dark:text-slate-50">{{ displayUserName(userItem) }}</span>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ userItem.username }}</p>
              </td>
              <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{{ userItem.email || '-' }}</td>
              <td class="py-1.5 pr-3">
                <AppBadge :variant="userItem.active === false ? 'error' : 'success'">
                  {{ userItem.active === false ? 'Zablokowany' : 'Aktywny' }}
                </AppBadge>
              </td>
              <td class="py-1.5 pr-3">
                <span class="text-slate-700 dark:text-slate-200">{{ userRoles(userItem).map((role) => role.name).join(', ') || '-' }}</span>
              </td>
              <td class="sticky right-0 z-10 bg-white py-1.5 pr-1 text-right shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] transition group-hover:bg-slate-50 dark:bg-app-panel dark:group-hover:bg-app-elevated">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
                  :disabled="!canUpdateUsers"
                  :title="!canUpdateUsers ? 'Brak uprawnienia: users.update' : 'Edytuj użytkownika'"
                  @click="openEditUserDrawer(userItem)"
                >
                  <SquarePen class="h-4 w-4" />
                </button>
              </td>
            </tr>

            <tr v-if="!filteredUsers.length">
              <td colspan="5" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak użytkowników pasujących do filtra.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <Teleport to="body">
      <div
        v-if="isRoleDrawerOpen"
        class="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
        @click.self="closeRoleDrawer"
      >
        <section class="company-management-drawer flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">{{ roleForm.id ? 'Edytuj rolę' : 'Dodaj rolę' }}</h2>
            </div>
            <button type="button" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-app-elevated dark:hover:text-slate-100" @click="closeRoleDrawer">
              <X class="h-4 w-4" />
            </button>
          </header>

          <form class="min-h-0 flex flex-1 flex-col overflow-hidden" @submit.prevent="saveRole">
            <div class="min-h-0 flex-1 overflow-y-auto p-5">
              <div class="grid gap-3 sm:grid-cols-2">
              <AppInput v-model="roleForm.code" label="Kod roli" placeholder="np. DISPATCHER" size="sm" />
              <AppInput v-model="roleForm.name" label="Nazwa roli" placeholder="np. Dyspozytor" size="sm" />
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Uprawnienia</h3>
              <AppInput v-model="rolePermissionSearch" class="sm:w-72" placeholder="Szukaj uprawnienia" size="sm" clearable />
              </div>

              <div class="mt-3 space-y-4">
              <section
                v-for="group in roleDrawerPermissionCategories"
                :key="group.category"
                class="overflow-hidden rounded-2xl border border-slate-100 dark:border-app-border"
              >
                <header class="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-app-border dark:bg-app-dark">
                  <h4 class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ group.label }}</h4>
                </header>
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-app-border dark:text-slate-400">
                    <tr>
                      <th class="py-2 pl-3 pr-3 font-medium">Uprawnienie</th>
                      <th class="w-20 py-2 pr-3 text-center font-medium">Aktywne</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="permission in group.permissions"
                      :key="permission.code"
                      class="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
                      :title="permissionTitle(permission)"
                      @click="canSaveRoleForm && toggleRolePermission(permission.code)"
                    >
                      <td class="py-2 pl-3 pr-3 font-medium text-slate-950 dark:text-slate-50">
                        {{ permission.name || permission.code }}
                      </td>
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
                  </tbody>
                </table>
              </section>
              </div>
            </div>

            <footer class="shrink-0 flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 dark:border-app-border dark:bg-app-panel sm:flex-row sm:items-center sm:justify-between">
              <AppButton
                v-if="roleForm.id && selectedRole?.editable !== false"
                variant="danger"
                type="button"
                :disabled="!canDeleteRoles"
                :title="!canDeleteRoles ? 'Brak uprawnienia: roles.delete' : undefined"
                @click="requestDeleteCurrentRole"
              >
                <Trash2 class="h-4 w-4" />
                Usuń rolę
              </AppButton>
              <span v-else></span>
              <div class="flex justify-end gap-2">
                <AppButton variant="secondary" type="button" @click="closeRoleDrawer">Anuluj</AppButton>
                <AppButton
                  type="submit"
                  :loading="store.isMutating"
                  :disabled="!canSaveRoleForm"
                  :title="!canSaveRoleForm ? 'Brak uprawnień do zapisu roli' : undefined"
                >
                  <Save class="h-4 w-4" />
                  {{ roleForm.id ? 'Zapisz' : 'Dodaj' }}
                </AppButton>
              </div>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="isUserDrawerOpen"
        class="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
        @click.self="closeUserDrawer"
      >
        <section class="company-management-drawer flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">{{ userForm.id ? 'Edytuj użytkownika' : 'Dodaj użytkownika' }}</h2>
              <AppBadge v-if="userForm.id" class="mt-2" :variant="userForm.active ? 'success' : 'error'">
                {{ userForm.active ? 'Aktywny' : 'Zablokowany' }}
              </AppBadge>
            </div>
            <button type="button" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-app-elevated dark:hover:text-slate-100" @click="closeUserDrawer">
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="border-b border-slate-100 px-5 py-2 dark:border-app-border">
            <div class="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-app-border dark:bg-app-dark">
              <button
                v-for="tab in userDrawerTabs"
                :key="tab.value"
                type="button"
                class="inline-flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition"
                :class="userDrawerTab === tab.value ? 'bg-white text-slate-950 shadow-sm dark:bg-app-panel dark:text-slate-50' : 'text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-app-elevated'"
                @click="userDrawerTab = tab.value"
              >
                <component :is="tab.icon" class="h-3.5 w-3.5" />
                {{ tab.label }}
              </button>
            </div>
          </div>

          <form class="min-h-0 flex flex-1 flex-col overflow-hidden" @submit.prevent="saveUser">
            <div class="min-h-0 flex-1 overflow-y-auto p-5">
              <div v-if="userDrawerTab === 'info'" class="grid gap-3 sm:grid-cols-2">
              <AppInput v-model="userForm.firstName" label="Imię" placeholder="Imię" size="sm" />
              <AppInput v-model="userForm.lastName" label="Nazwisko" placeholder="Nazwisko" size="sm" />
              <AppInput v-model="userForm.username" label="Login" placeholder="Login" size="sm" />
              <AppInput v-model="userForm.email" label="Email" type="email" placeholder="email@firma.pl" size="sm" />
              <AppInput
                v-if="!userForm.id"
                v-model="userForm.password"
                label="Hasło"
                type="password"
                placeholder="Hasło startowe"
                autocomplete="new-password"
                size="sm"
              />
              <label class="flex h-9 cursor-pointer items-center justify-between rounded-2xl border border-slate-100 px-3 text-sm dark:border-app-border">
                <span class="font-medium text-slate-700 dark:text-slate-200">Aktywny</span>
                <AppCheckbox v-model="userForm.active" aria-label="Aktywny" :disabled="!canUpdateUsers" />
              </label>
            </div>

            <div v-else-if="userDrawerTab === 'roles'" class="rounded-2xl border border-slate-100 dark:border-app-border">
              <div
                v-for="role in store.roles"
                :key="role.id"
                class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
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
                <span class="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{{ role.name }}</span>
              </div>
            </div>

            <div v-else class="space-y-3">
              <AppInput v-model="permissionOverrideSearch" placeholder="Szukaj uprawnienia" size="sm" clearable />
              <section
                v-for="group in overridePermissionCategories"
                :key="group.category"
                class="overflow-hidden rounded-2xl border border-slate-100 dark:border-app-border"
              >
                <header class="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-app-border dark:bg-app-dark">
                  <h4 class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ group.label }}</h4>
                </header>
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-app-border dark:text-slate-400">
                    <tr>
                      <th class="py-2 pl-3 pr-3 font-medium">Uprawnienie</th>
                      <th class="w-20 py-2 pr-2 text-center font-medium">Grant</th>
                      <th class="w-20 py-2 pr-3 text-center font-medium">Deny</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="permission in group.permissions"
                      :key="permission.code"
                      class="border-b border-slate-100 last:border-0 dark:border-app-border"
                      :title="permissionTitle(permission)"
                    >
                      <td class="py-2 pl-3 pr-3 font-medium text-slate-950 dark:text-slate-50">{{ permission.name || permission.code }}</td>
                      <td class="py-2 pr-2 text-center">
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40"
                          :class="overrideEffectFor(permission.code) === 'GRANT' ? 'border-success-100 bg-success-50 text-success-600 dark:border-success-400 dark:bg-app-elevated dark:text-success-400' : 'border-slate-200 bg-white text-slate-300 hover:text-slate-600 dark:border-app-border dark:bg-app-panel dark:text-slate-500 dark:hover:text-slate-200'"
                          :disabled="!canUpdateUsers"
                          @click="toggleOverride(permission.code, 'GRANT')"
                        >
                          <CheckCircle2 class="h-4 w-4" />
                        </button>
                      </td>
                      <td class="py-2 pr-3 text-center">
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40"
                          :class="overrideEffectFor(permission.code) === 'DENY' ? 'border-danger-100 bg-danger-50 text-danger-600 dark:border-danger-400 dark:bg-app-elevated dark:text-danger-400' : 'border-slate-200 bg-white text-slate-300 hover:text-slate-600 dark:border-app-border dark:bg-app-panel dark:text-slate-500 dark:hover:text-slate-200'"
                          :disabled="!canUpdateUsers"
                          @click="toggleOverride(permission.code, 'DENY')"
                        >
                          <X class="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>

            </div>

            <footer class="shrink-0 flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 dark:border-app-border dark:bg-app-panel sm:flex-row sm:items-center sm:justify-between">
              <AppButton
                v-if="userForm.id"
                variant="danger"
                type="button"
                :disabled="!canDeleteUsers"
                :title="!canDeleteUsers ? 'Brak uprawnienia: users.delete' : undefined"
                @click="requestDeleteCurrentUser"
              >
                <Trash2 class="h-4 w-4" />
                Usuń użytkownika
              </AppButton>
              <span v-else></span>
              <div class="flex justify-end gap-2">
                <AppButton variant="secondary" type="button" @click="closeUserDrawer">Anuluj</AppButton>
                <AppButton
                  type="submit"
                  :loading="store.isMutating"
                  :disabled="!canSaveUserForm"
                  :title="!canSaveUserForm ? 'Brak uprawnień do zapisu użytkownika' : undefined"
                >
                  <Save class="h-4 w-4" />
                  {{ userForm.id ? 'Zapisz' : 'Dodaj' }}
                </AppButton>
              </div>
            </footer>
          </form>
        </section>
      </div>

      <div
        v-if="roleToDelete || userToDelete"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="clearDeleteTargets"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">
              {{ roleToDelete ? 'Usunąć rolę?' : 'Usunąć użytkownika?' }}
            </h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ deleteMessage }}
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="clearDeleteTargets">Anuluj</AppButton>
            <AppButton
              variant="danger"
              :loading="store.isMutating"
              :disabled="roleToDelete ? !canDeleteRoles : !canDeleteUsers"
              @click="confirmDelete"
            >
              Usuń
            </AppButton>
          </footer>
        </section>
      </div>
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
  Users,
  X,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
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

const activeSection = ref<SectionKey>(readStoredSection())
const userDrawerTab = ref<UserDrawerTab>(readStoredUserDrawerTab())
const roleSearch = ref('')
const userSearch = ref('')
const permissionMatrixSearch = ref('')
const rolePermissionSearch = ref('')
const permissionOverrideSearch = ref('')
const roleToDelete = ref<CompanyRole | null>(null)
const userToDelete = ref<CompanyManagedUser | null>(null)
const isRoleDrawerOpen = ref(false)
const isUserDrawerOpen = ref(false)
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

const matrixPermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, permissionMatrixSearch.value)))
const roleDrawerPermissionCategories = computed(() => groupPermissions(filterPermissions(store.permissions, rolePermissionSearch.value)))
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

function roleHasPermission(role: CompanyRole, permissionCode: string) {
  return role.permissions.includes(permissionCode)
}

async function setRolePermission(role: CompanyRole, permissionCode: string, isEnabled: boolean) {
  if (role.editable === false || !canUpdateRoles.value) {
    return
  }

  const permissions = new Set(role.permissions)

  if (isEnabled) {
    permissions.add(permissionCode)
  } else {
    permissions.delete(permissionCode)
  }

  try {
    await store.updateRolePermissions(role.id, [...permissions])
    uiStore.addToast({
      type: 'success',
      title: 'Uprawnienia zapisane',
      message: `Zaktualizowano rolę ${role.name}.`,
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Błąd uprawnień',
      message: 'Nie udało się zapisać uprawnień roli.',
    })
  }
}

function matrixTableStyle(permissionCount: number) {
  return {
    minWidth: `${Math.max(620, 220 + permissionCount * 150)}px`,
  }
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
  resetUserForm()
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
        active: userForm.active,
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
        message: 'Zablokowano dostęp użytkownika do firmy.',
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

<style scoped>
.company-management-drawer {
  animation: drawer-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

@keyframes drawer-in {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .company-management-drawer {
    animation: none;
  }
}
</style>
