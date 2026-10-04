<template>
  <div
    ref="repairsViewRoot"
    class="flex min-h-full w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden"
    :class="repairViewMode === 'kanban' ? 'xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:overflow-hidden' : ''"
  >
    <header class="flex w-full min-w-0 shrink-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <AppInput
          v-model="repairSearch"
          class="min-w-0 sm:w-64"
          label="Szukaj"
          placeholder="Tablica, miejsce, usterka"
          size="sm"
          clearable
        />
        <AppButton size="sm" variant="secondary" @click="openMechanicsModal">
          <Users class="h-4 w-4" />
          Mechanicy
        </AppButton>
      </div>

      <div class="flex w-full shrink-0 flex-wrap items-center gap-2 sm:justify-end xl:w-auto">
        <AppTabs
          class="w-fit max-w-full"
          :model-value="repairViewMode"
          :items="repairViewTabs"
          size="sm"
          aria-label="Sposób wyświetlania napraw"
          @update:model-value="setRepairViewMode"
        />
        <AppButton size="sm" :disabled="!canCreateRepairs" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          Dodaj nową naprawę
        </AppButton>
      </div>
    </header>

    <div v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie napraw...
    </div>

    <section v-else-if="repairViewMode === 'kanban'" class="grid w-full min-w-0 max-w-full min-h-[calc(100vh-220px)] gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
      <div
        v-for="column in repairColumns"
        :key="column.key"
        class="flex w-full min-w-0 max-w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel"
        :class="[
          dragOverColumn === column.key ? 'ring-2 ring-inset ring-slate-400 dark:ring-app-muted' : '',
          isRepairColumnCollapsed(column.key) ? 'self-start' : '',
        ]"
        @dragenter.prevent="dragOverColumn = column.key"
        @dragover.prevent="dragOverColumn = column.key"
        @dragleave="dragOverColumn = null"
        @drop="dropRepairOnColumn(column)"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
          :aria-expanded="!isRepairColumnCollapsed(column.key)"
          :aria-label="isRepairColumnCollapsed(column.key) ? `Rozwiń sekcję ${column.label}` : `Zwiń sekcję ${column.label}`"
          @click="toggleRepairColumn(column.key)"
        >
          <span
            class="flex min-w-0 items-center gap-2"
            :aria-expanded="!isRepairColumnCollapsed(column.key)"
          >
            <component :is="column.icon" class="h-4 w-4 shrink-0 text-slate-400" />
            <h2 class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{{ column.label }}</h2>
            <ChevronDown
              class="h-3.5 w-3.5 shrink-0 text-slate-400 transition"
              :class="isRepairColumnCollapsed(column.key) ? '-rotate-90' : 'rotate-0'"
            />
          </span>
          <AppBadge>{{ column.repairs.length }}</AppBadge>
        </button>

        <div
          v-if="!isRepairColumnCollapsed(column.key)"
          :data-repairs-scroll-key="`column:${column.key}`"
          class="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <article
            v-for="repair in visibleColumnRepairs(column)"
            :key="repair.id"
            :draggable="canUpdateRepairs"
            class="max-w-full min-w-0 cursor-grab overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 transition hover:bg-slate-50 active:cursor-grabbing dark:border-app-border dark:bg-app-dark dark:hover:bg-app-elevated"
            :class="[draggedRepairId === repair.id ? 'opacity-20' : '', !canUpdateRepairs ? 'cursor-pointer' : '']"
            @dragstart="startRepairDrag(repair, $event)"
            @drag="updateRepairDragPreview"
            @dragend="endRepairDrag"
            @click="openRepairDetails(repair)"
            >
              <RepairCardContent
                :repair="repair"
                show-place
                show-country-flag
              />
            </article>

          <div v-if="!column.repairs.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
            Przeciągnij tutaj naprawę, aby zmienić status.
          </div>
          <AppButton
            v-if="hasMoreColumnRepairs(column)"
            class="w-full"
            size="sm"
            variant="secondary"
            @click.stop="loadMoreColumnRepairs(column.key)"
          >
            Załaduj więcej
            <span class="text-ui-mutedText">({{ remainingColumnRepairs(column) }})</span>
          </AppButton>
        </div>
      </div>
    </section>

    <section v-else-if="repairViewMode === 'list'" class="min-w-0 space-y-3">
      <article
        v-for="column in repairColumns"
        :key="`list-${column.key}`"
        class="overflow-hidden rounded-[var(--rw-radius-card)] border border-ui-border bg-ui-surface shadow-soft"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 border-b border-ui-divider bg-ui-muted px-4 py-3 text-left transition hover:bg-ui-hover"
          :aria-expanded="!isRepairColumnCollapsed(column.key)"
          @click="toggleRepairColumn(column.key)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <component :is="column.icon" class="h-4 w-4 shrink-0 text-ui-icon" />
            <span class="truncate text-sm font-semibold text-ui-text">{{ column.label }}</span>
            <ChevronDown
              class="h-3.5 w-3.5 shrink-0 text-ui-icon transition"
              :class="isRepairColumnCollapsed(column.key) ? '-rotate-90' : ''"
            />
          </span>
          <AppBadge>{{ column.repairs.length }}</AppBadge>
        </button>

        <div v-if="!isRepairColumnCollapsed(column.key)" class="overflow-x-auto">
          <table class="ui-table min-w-[900px]">
            <thead class="ui-table-head">
              <tr>
                <th class="w-10 py-2 pl-3 pr-1"><span class="sr-only">Rozwiń</span></th>
                <th class="py-2 pr-3 font-medium">Pojazd</th>
                <th class="py-2 pr-3 font-medium">Miejsce naprawy</th>
                <th class="py-2 pr-3 font-medium">Planowany przyjazd</th>
                <th class="py-2 pr-3 font-medium">Planowany odjazd</th>
                <th class="w-36 py-2 pr-3 font-medium">Status</th>
                <th class="w-24 py-2 pr-3 text-right font-medium">Usterki</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="repair in visibleColumnRepairs(column)" :key="repair.id">
                <tr
                  class="ui-table-row cursor-pointer"
                  :aria-expanded="isListRepairExpanded(repair.id)"
                  tabindex="0"
                  @click="toggleListRepair(repair.id)"
                  @keydown.enter.prevent="toggleListRepair(repair.id)"
                  @keydown.space.prevent="toggleListRepair(repair.id)"
                >
                  <td class="py-2 pl-3 pr-1">
                    <ChevronDown
                      class="h-4 w-4 text-ui-icon transition"
                      :class="isListRepairExpanded(repair.id) ? 'rotate-180' : ''"
                    />
                  </td>
                  <td class="py-2 pr-3">
                    <span class="flex min-w-0 items-center gap-2">
                      <img
                        v-if="repairCountryCode(repair)"
                        class="h-4 w-4 shrink-0 rounded-full object-cover"
                        :src="`https://flagsapi.com/${repairCountryCode(repair)}/flat/64.png`"
                        :alt="repairCountryCode(repair) || ''"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                      <span class="truncate text-sm font-semibold text-ui-text">{{ repairVehicleLabel(repair) }}</span>
                    </span>
                  </td>
                  <td class="max-w-48 truncate py-2 pr-3 text-xs text-ui-text-secondary">{{ repairPlaceLabel(repair) }}</td>
                  <td class="py-2 pr-3 text-xs tabular-nums text-ui-text-secondary">{{ formatDateTime(repair.plannedArrivalAt) }}</td>
                  <td class="py-2 pr-3 text-xs tabular-nums text-ui-text-secondary">{{ formatDateTime(repair.plannedDepartureAt) }}</td>
                  <td class="py-2 pr-3">
                    <AppBadge fixed-width="lg" :variant="statusVariant(repair.status)">{{ statusLabel(repair.status) }}</AppBadge>
                  </td>
                  <td class="py-2 pr-3 text-right text-xs font-semibold text-ui-text-secondary">
                    {{ repair.doneFaults || 0 }}/{{ repair.totalFaults || repair.faults?.length || 0 }}
                  </td>
                </tr>
                <tr v-if="isListRepairExpanded(repair.id)" class="border-b border-ui-divider bg-ui-muted">
                  <td colspan="7" class="p-3">
                    <div class="space-y-2">
                      <div
                        v-for="fault in repair.faults || []"
                        :key="fault.id"
                        class="flex min-w-0 items-center gap-3 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface px-3 py-2"
                      >
                        <button
                          type="button"
                          class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ui-icon transition hover:bg-ui-hover hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-45"
                          :aria-label="fault.status === 'DONE' ? 'Oznacz usterkę jako niezrobioną' : 'Oznacz usterkę jako zrobioną'"
                          :disabled="isMutating || !canChangeFaultStatus"
                          :title="!canChangeFaultStatus ? 'Brak uprawnienia: faults.change_status' : undefined"
                          @click.stop="requestListFaultStatusChange(repair, fault)"
                        >
                          <CircleCheck v-if="fault.status === 'DONE'" class="h-5 w-5 text-success-600 dark:text-success-400" />
                          <Circle v-else class="h-5 w-5" />
                        </button>
                        <span
                          class="min-w-0 flex-1 break-words text-sm"
                          :class="fault.status === 'DONE' ? 'text-ui-mutedText line-through' : 'font-medium text-ui-text'"
                        >
                          {{ fault.description }}
                        </span>
                        <AppBadge :variant="fault.status === 'DONE' ? 'success' : 'neutral'">
                          {{ fault.status === 'DONE' ? 'Zrobiona' : 'Otwarta' }}
                        </AppBadge>
                      </div>
                      <p v-if="!repair.faults?.length" class="rounded-[var(--rw-radius-control)] border border-dashed border-ui-border px-3 py-4 text-center ui-body-sm text-ui-mutedText">
                        Brak usterek w tej naprawie.
                      </p>
                      <div class="flex justify-end">
                        <AppButton size="sm" variant="secondary" @click="openRepairDetails(repair)">
                          <SquarePen class="h-4 w-4" />
                          Przejdź do naprawy
                        </AppButton>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="hasMoreColumnRepairs(column)">
                <td colspan="7" class="p-3 text-center">
                  <AppButton
                    size="sm"
                    variant="secondary"
                    @click="loadMoreColumnRepairs(column.key)"
                  >
                    Załaduj więcej
                    <span class="text-ui-mutedText">({{ remainingColumnRepairs(column) }})</span>
                  </AppButton>
                </td>
              </tr>
              <tr v-if="!column.repairs.length">
                <td colspan="7" class="px-4 py-6 text-center ui-body-sm text-ui-mutedText">
                  Brak napraw w tej sekcji.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'field'" class="hidden">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border">
        <div>
          <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Naprawy w terenie</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ selectedWeekLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          <AppBadge>{{ fieldRepairs.length }}</AppBadge>
          <AppButton
            size="sm"
            variant="secondary"
            :disabled="!selectedFieldRepairs.length"
            @click="generateRepairsPdf(selectedFieldRepairs)"
          >
            <FileDown class="h-4 w-4" />
            Generuj PDF
            <span v-if="selectedFieldRepairs.length">({{ selectedFieldRepairs.length }})</span>
          </AppButton>
        </div>
      </header>

      <div data-repairs-scroll-key="field-table" class="min-h-0 min-w-0 flex-1 overflow-auto">
        <table class="w-full min-w-[920px] table-fixed text-left text-xs">
          <thead class="sticky top-0 z-10 border-b border-slate-200 bg-white text-[10px] uppercase text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-app-muted">
            <tr>
              <th class="w-12 px-2 py-2 text-center">
                <AppCheckbox
                  :model-value="areAllFieldRepairsSelected"
                  aria-label="Zaznacz wszystkie naprawy w terenie"
                  :disabled="!fieldRepairs.length"
                  @update:model-value="toggleAllFieldRepairs"
                />
              </th>
              <th class="w-[16%] px-2 py-2 font-semibold">Numer rej.</th>
              <th class="w-[18%] px-2 py-2 font-semibold">Miejsce</th>
              <th class="w-[16%] px-2 py-2 font-semibold">Przyjazd</th>
              <th class="w-[16%] px-2 py-2 font-semibold">Odjazd</th>
              <th class="w-[13%] px-2 py-2 font-semibold">Status</th>
              <th class="w-[13%] px-2 py-2 font-semibold">Usterki</th>
              <th class="w-24 px-2 py-2 text-right font-semibold">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="repair in fieldRepairs" :key="repair.id">
              <tr class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated">
                <td class="px-2 py-1 text-center">
                  <AppCheckbox
                    :model-value="isFieldRepairSelected(repair.id)"
                    :aria-label="`Zaznacz naprawę ${repairVehicleLabel(repair)}`"
                    @update:model-value="toggleFieldRepairSelection(repair.id)"
                  />
                </td>
                <td class="truncate px-2 py-2 font-semibold text-slate-950 dark:text-slate-50">
                  {{ repairVehicleLabel(repair) }}
                </td>
                <td class="truncate px-2 py-2 text-slate-600 dark:text-slate-300">
                  {{ repairPlaceLabel(repair) }}
                </td>
                <td class="px-2 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                  {{ formatDateTime(repair.plannedArrivalAt) }}
                </td>
                <td class="px-2 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                  {{ formatDateTime(repair.plannedDepartureAt) }}
                </td>
                <td class="px-2 py-2">
                  <AppBadge fixed-width="lg" :variant="statusVariant(repair.status)">{{ statusLabel(repair.status) }}</AppBadge>
                </td>
                <td class="px-2 py-1.5">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-dark dark:hover:text-slate-50"
                    :aria-expanded="isFieldRepairExpanded(repair.id)"
                    @click="toggleFieldRepairExpansion(repair.id)"
                  >
                    <ChevronDown
                      class="h-3.5 w-3.5 transition"
                      :class="isFieldRepairExpanded(repair.id) ? 'rotate-180' : ''"
                    />
                    {{ repair.doneFaults || 0 }}/{{ repair.totalFaults || repair.faults?.length || 0 }}
                  </button>
                </td>
                <td class="px-2 py-1.5">
                  <div class="flex justify-end gap-1">
                    <AppIconButton
                      size="sm"
                      label="Generuj PDF"
                      :aria-label="`Generuj PDF naprawy ${repairVehicleLabel(repair)}`"
                      @click="generateRepairsPdf([repair])"
                    >
                      <FileDown class="h-4 w-4" />
                    </AppIconButton>
                    <AppIconButton
                      size="sm"
                      label="Szczegóły naprawy"
                      :aria-label="`Otwórz naprawę ${repairVehicleLabel(repair)}`"
                      @click="openRepairDetails(repair)"
                    >
                      <SquarePen class="h-4 w-4" />
                    </AppIconButton>
                  </div>
                </td>
              </tr>
              <tr v-if="isFieldRepairExpanded(repair.id)" class="border-b border-slate-100 bg-slate-50/70 dark:border-app-border dark:bg-app-dark">
                <td></td>
                <td colspan="7" class="px-2 py-3">
                  <div v-if="repair.faults?.length" class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <div
                      v-for="fault in repair.faults"
                      :key="fault.id"
                      class="flex min-w-0 items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-app-border dark:bg-app-panel dark:text-slate-200"
                    >
                      <CircleCheck v-if="fault.status === 'DONE'" class="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
                      <span v-else class="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-app-muted"></span>
                      <span class="min-w-0 break-words">{{ fault.description }}</span>
                    </div>
                  </div>
                  <p v-else class="text-sm text-slate-500 dark:text-slate-400">Brak usterek.</p>
                </td>
              </tr>
            </template>
            <tr v-if="!fieldRepairs.length">
              <td colspan="8" class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak napraw w terenie.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
      <div class="grid h-[calc(100vh-210px)] min-h-[34rem] overflow-hidden lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col border-b border-slate-100 bg-slate-50/70 dark:border-app-border dark:bg-app-dark lg:border-b-0 lg:border-r">
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Pojazdy do naprawy</p>
                <p class="mt-0.5 truncate text-[11px] text-slate-400 dark:text-app-muted">{{ selectedWeekLabel }}</p>
              </div>
              <AppBadge>{{ mapRepairVehicles.length }}</AppBadge>
            </div>
            <button
              v-for="item in mapRepairVehicles"
              :key="item.vehicle.id"
              type="button"
              class="mb-1.5 w-full rounded-2xl border border-slate-100 bg-white px-2.5 py-2 text-left transition hover:bg-slate-50 dark:border-app-border dark:bg-app-panel dark:hover:bg-app-elevated"
              @click="openRepairDetails(item.repair)"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{{ item.vehicle.plateNumber }}</span>
                <AppBadge>{{ item.repairs.length }}</AppBadge>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span class="truncate">{{ repairPlaceLabel(item.repair) }}</span>
                <span class="shrink-0">{{ statusLabel(item.repair.status) }}</span>
              </div>
            </button>

            <div v-if="!mapRepairVehicles.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
              Brak pojazdów z pozycją GPS dla wybranego tygodnia.
            </div>
          </div>
        </aside>

        <div class="relative min-h-0 bg-slate-100 dark:bg-app-dark">
          <div ref="mapElement" class="h-full w-full"></div>
          <div
            v-if="mapState !== 'ready'"
            class="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center text-sm text-slate-500 dark:bg-app-dark/90 dark:text-slate-300"
          >
            <span v-if="mapState === 'missing-key'">Brak klucza Google Maps w `VITE_GOOGLE_MAPS_API_KEY`.</span>
            <span v-else-if="mapState === 'loading'">Ładowanie mapy...</span>
            <span v-else>Mapa pokaże pojazdy z pozycją GPS przypisane do napraw.</span>
          </div>
        </div>
      </div>
    </section>

    <AppConfirmModal
      :open="Boolean(listFaultStatusTarget)"
      :title="listFaultStatusTarget?.fault.status === 'DONE' ? 'Cofnąć wykonanie usterki?' : 'Zakończyć usterkę?'"
      :description="listFaultStatusTarget?.fault.status === 'DONE'
        ? 'Czy na pewno chcesz oznaczyć tę usterkę jako niezrobioną?'
        : 'Czy na pewno chcesz oznaczyć tę usterkę jako zrobioną?'"
      :confirm-label="listFaultStatusTarget?.fault.status === 'DONE' ? 'Oznacz jako niezrobioną' : 'Oznacz jako zrobioną'"
      :busy="isMutating"
      :confirm-disabled="!canChangeFaultStatus"
      @close="listFaultStatusTarget = null"
      @confirm="confirmListFaultStatusChange"
    />

    <RepairCreateModal
      :open="isCreateModalOpen"
      :existing-repairs="repairs"
      @close="closeCreateModal"
      @created="handleCreatedRepair"
      @open-repair="openRepairFromCreate"
    />

    <AppModal
      :open="isMechanicsModalOpen"
      title="Mechanicy"
      size="md"
      :busy="isMutating"
      @close="closeMechanicsModal"
    >
      <div class="ui-table-shell max-h-[55dvh] overflow-auto">
        <table class="ui-table w-full min-w-[32rem]">
          <thead class="ui-table-head">
            <tr>
              <th class="ui-table-cell font-medium">Imię</th>
              <th class="ui-table-cell font-medium">Nazwisko</th>
              <th class="ui-table-cell w-24 text-right font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mechanic in mechanics" :key="mechanic.id" class="ui-table-row group">
              <td class="ui-table-cell font-semibold text-ui-text">{{ mechanic.firstName || '-' }}</td>
              <td class="ui-table-cell text-ui-text-secondary">{{ mechanic.lastName || '-' }}</td>
              <td class="ui-table-cell text-right">
                <div class="flex justify-end gap-1">
                  <AppIconButton label="Edytuj mechanika" size="sm" variant="ghost" @click="editMechanic(mechanic)">
                    <SquarePen class="h-4 w-4" />
                  </AppIconButton>
                  <AppIconButton label="Usuń mechanika" size="sm" variant="ghost" @click="mechanicToDelete = mechanic">
                    <Trash2 class="h-4 w-4" />
                  </AppIconButton>
                </div>
              </td>
            </tr>
            <tr v-if="!mechanics.length">
              <td colspan="3" class="py-10 text-center ui-body-sm text-ui-mutedText">Brak mechaników.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <AppButton type="button" @click="openNewMechanicForm">
          <Plus class="h-4 w-4" />
          Dodaj mechanika
        </AppButton>
      </template>
    </AppModal>

    <AppModal
      :open="isMechanicFormModalOpen"
      :title="mechanicForm.id ? 'Edytuj mechanika' : 'Dodaj mechanika'"
      size="sm"
      :busy="isMutating"
      :close-on-backdrop="false"
      @close="closeMechanicForm"
    >
      <form id="mechanic-form" class="flex flex-col gap-4" @submit.prevent="submitMechanic">
        <AppInput v-model="mechanicForm.firstName" label="Imię" placeholder="Wpisz imię" required />
        <AppInput v-model="mechanicForm.lastName" label="Nazwisko" placeholder="Wpisz nazwisko" required />
      </form>

      <template #footer>
        <div class="flex w-full flex-col gap-2">
          <AppButton form="mechanic-form" type="submit" full-width :loading="isMutating">
            <Check v-if="mechanicForm.id" class="h-4 w-4" />
            <Plus v-else class="h-4 w-4" />
            {{ mechanicForm.id ? 'Zapisz zmiany' : 'Dodaj mechanika' }}
          </AppButton>
          <AppButton type="button" variant="secondary" full-width @click="closeMechanicForm">Anuluj</AppButton>
        </div>
      </template>
    </AppModal>

    <AppConfirmModal
      :open="Boolean(mechanicToDelete)"
      title="Usunąć mechanika?"
      :description="mechanicToDelete ? `Czy na pewno chcesz usunąć mechanika ${mechanicDisplayName(mechanicToDelete)}?` : undefined"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="isMutating"
      @close="mechanicToDelete = null"
      @confirm="confirmDeleteMechanic"
    />

    <Teleport to="body">
      <div
        v-if="draggedRepair"
        class="pointer-events-none fixed z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-panel"
        :style="{ left: `${dragPreview.x}px`, top: `${dragPreview.y}px`, transform: 'translate(-50%, -12px)' }"
      >
        <RepairCardContent :repair="draggedRepair" preview show-place />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Component, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock,
  Columns3,
  FileDown,
  List,
  ListChecks,
  Plus,
  SquarePen,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import RepairCreateModal from '@/components/repairs/RepairCreateModal.vue'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Mechanic, Repair, RepairFault, RepairStatus } from '@/types/repair'
import type { Vehicle } from '@/types/fleet'

type TabKey = 'base' | 'other' | 'field' | 'map'
type RepairViewMode = 'kanban' | 'list'
type RepairColumnKey = 'new' | 'progress' | 'done'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const REPAIRS_VIEW_MODE_KEY = 'routewise.repairs.viewMode'
const router = useRouter()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const repairsViewRoot = ref<HTMLElement | null>(null)
const {
  repairs,
  mechanics,
  isLoading,
  isMutating,
} = storeToRefs(repairStore)
const activeTab = ref<TabKey>('base')
const repairViewMode = ref<RepairViewMode>(readRepairViewMode())
const repairSearch = ref('')
const normalizedRepairSearch = computed(() => normalizeSearchValue(repairSearch.value))
const draggedRepairId = ref<number | null>(null)
const draggedRepair = ref<Repair | null>(null)
const dragPreview = reactive({ x: 0, y: 0 })
const dragOverColumn = ref<RepairColumnKey | null>(null)
const collapsedRepairColumnKeys = ref<Set<RepairColumnKey>>(new Set(['done']))
const collapsedRepairIds = ref<Set<number>>(new Set())
const visibleRepairLimits = reactive<Record<RepairColumnKey, number>>({
  new: 15,
  progress: 15,
  done: 15,
})
const expandedListRepairIds = ref<Set<number>>(new Set())
const listFaultStatusTarget = ref<{ repair: Repair; fault: RepairFault } | null>(null)
const expandedFieldRepairIds = ref<Set<number>>(new Set())
const selectedFieldRepairIds = ref<Set<number>>(new Set())
const isCreateModalOpen = ref(false)
const isMechanicsModalOpen = ref(false)
const isMechanicFormModalOpen = ref(false)
const mechanicToDelete = ref<Mechanic | null>(null)
const mapElement = ref<HTMLDivElement | null>(null)
const mapState = ref<'idle' | 'loading' | 'ready' | 'missing-key' | 'error'>('idle')
const mechanicForm = reactive({
  id: null as number | null,
  firstName: '',
  lastName: '',
})
let googleRef: any = null
let repairMap: any = null
let repairMarkers: any[] = []

const REPAIRS_PAGE_SIZE = 15

const repairViewTabs: Array<{ value: RepairViewMode; label: string; icon: Component }> = [
  { value: 'kanban', label: 'Kanban', icon: Columns3 },
  { value: 'list', label: 'Lista', icon: List },
]

function setRepairViewMode(value: string) {
  if (value === 'kanban' || value === 'list') {
    repairViewMode.value = value
  }
}

const canCreateRepairs = computed(() => hasPermission('repairs.create'))
const canUpdateRepairs = computed(() => hasPermission('repairs.update'))
const canChangeFaultStatus = computed(() => hasPermission('faults.change_status'))
const selectedWeekLabel = computed(() => 'Wszystkie naprawy')

const selectedWeekRepairs = computed(() => uniqueRepairs(repairs.value))

const filteredSelectedWeekRepairs = computed(() => selectedWeekRepairs.value.filter((repair) => repairMatchesSearch(repair)))

const baseWeekRepairs = computed(() => filteredSelectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && isBaseRepair(repair)
)))

const otherWeekRepairs = computed(() => filteredSelectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && !isBaseRepair(repair)
)))

const activeKanbanRepairs = computed(() => filteredSelectedWeekRepairs.value)

const sortedKanbanRepairs = computed(() => [...activeKanbanRepairs.value].sort((first, second) => {
  return repairTimestamp(first) - repairTimestamp(second)
}))

const repairColumns = computed(() => {
  const columns: Array<{ key: RepairColumnKey; label: string; icon: Component; targetStatus: RepairStatus; repairs: Repair[] }> = [
    { key: 'new', label: 'Nowe naprawy', icon: ListChecks, targetStatus: 'planned', repairs: [] },
    { key: 'progress', label: 'Gotowe do naprawy', icon: Clock, targetStatus: 'at_location', repairs: [] },
    { key: 'done', label: 'Zakończone', icon: CheckCircle2, targetStatus: 'done', repairs: [] },
  ]

  sortedKanbanRepairs.value.forEach((repair) => {
    const column = columns.find((item) => item.key === columnKeyForRepair(repair))
    column?.repairs.push(repair)
  })

  return columns
})

const fieldRepairs = computed(() => repairs.value
  .filter((repair) => normalizeRepairStatus(repair.status) === 'IN_FIELD' && repairMatchesSearch(repair)))

const selectedFieldRepairs = computed(() => fieldRepairs.value.filter((repair) => selectedFieldRepairIds.value.has(repair.id)))
const areAllFieldRepairsSelected = computed(() => (
  fieldRepairs.value.length > 0 &&
  fieldRepairs.value.every((repair) => selectedFieldRepairIds.value.has(repair.id))
))

const mapSourceRepairs = computed(() => filteredSelectedWeekRepairs.value.filter((repair) => repairMatchesSearch(repair)))

const mapFilteredRepairs = computed(() => mapSourceRepairs.value
  .filter((repair) => normalizeRepairStatus(repair.status) !== 'done'))

const mapRepairVehicles = computed(() => {
  const itemsByVehicle = new Map<string, { repair: Repair; repairs: Repair[]; vehicle: Vehicle }>()

  mapFilteredRepairs.value.forEach((repair) => {
    const vehicleId = repair.vehicle?.id ?? repair.vehicleId
    const vehicle = fleetStore.vehicles.find((item) => String(item.backendId) === String(vehicleId))

    if (!vehicle?.hasPosition) {
      return
    }

    const current = itemsByVehicle.get(vehicle.id)

    if (current) {
      current.repairs.push(repair)
      return
    }

    itemsByVehicle.set(vehicle.id, { repair, repairs: [repair], vehicle })
  })

  return Array.from(itemsByVehicle.values())
})

const RepairCardContent = defineComponent({
  props: {
    repair: {
      type: Object as PropType<Repair>,
      required: true,
    },
    preview: {
      type: Boolean,
      default: false,
    },
    showPlace: {
      type: Boolean,
      default: true,
    },
    showCountryFlag: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return () => {
      const isExpanded = props.preview || !collapsedRepairIds.value.has(props.repair.id)
      const faults = props.repair.faults || []
      const totalFaults = props.repair.totalFaults || faults.length
      const isDone = normalizeRepairStatus(props.repair.status) === 'done'
      const countryCode = repairCountryCode(props.repair)

      return h('div', { class: 'min-w-0 max-w-full overflow-hidden' }, [
        h('div', { class: 'flex min-w-0 items-start justify-between gap-2' }, [
          h('div', { class: 'flex min-w-0 items-center gap-2' }, [
            props.showCountryFlag && countryCode
              ? h('img', {
                class: 'h-4 w-4 shrink-0 rounded-full object-cover',
                src: `https://flagsapi.com/${countryCode}/flat/64.png`,
                alt: countryCode,
                loading: 'lazy',
                referrerpolicy: 'no-referrer',
              })
              : null,
            h('p', { class: 'min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50' }, repairVehicleLabel(props.repair)),
          ]),
          h('div', { class: 'flex min-w-0 shrink-0 items-center gap-1.5' }, [
            isDone ? h(CircleCheck, { class: 'h-5 w-5 text-success-600 dark:text-success-400' }) : null,
            h(AppBadge, { variant: statusVariant(props.repair.status), fixedWidth: 'lg' }, () => statusLabel(props.repair.status)),
          ]),
        ]),
        h('div', { class: 'mt-2 min-w-0 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300' }, [
          props.showPlace ? h('p', { class: 'truncate' }, `Miejsce naprawy: ${repairPlaceLabel(props.repair)}`) : null,
          h('p', { class: 'min-w-0 break-words' }, [
            h('span', { class: 'text-slate-500 dark:text-slate-400' }, 'Planowany przyjazd: '),
            h('span', { class: 'font-medium text-slate-700 dark:text-slate-200' }, formatDateTime(props.repair.plannedArrivalAt)),
          ]),
          h('p', { class: 'min-w-0 max-w-full overflow-hidden' }, [
            h('span', { class: 'min-w-0 break-words' }, [
              h('span', { class: 'text-slate-500 dark:text-slate-400' }, 'Planowany odjazd: '),
              h('span', { class: 'font-medium text-slate-700 dark:text-slate-200' }, formatDateTime(props.repair.plannedDepartureAt)),
            ]),
          ]),
        ]),
        totalFaults
          ? h('button', {
            type: 'button',
            class: 'mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50',
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              toggleRepairFaults(props.repair.id)
            },
          }, [
            h(ChevronDown, { class: ['h-3.5 w-3.5 transition', isExpanded ? 'rotate-180' : ''] }),
            `Usterki ${props.repair.doneFaults || 0}/${totalFaults}`,
          ])
          : null,
        isExpanded
          ? h('div', { class: 'mt-2 min-w-0 max-w-full space-y-1 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-app-border dark:bg-app-dark' }, faults.length
            ? faults.map((fault) => h('div', { key: fault.id, class: 'flex min-w-0 items-center gap-2 text-xs text-slate-700 dark:text-slate-200' }, [
              fault.status === 'DONE'
                ? h(CircleCheck, { class: 'h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400' })
                : h('span', { class: 'h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 dark:border-app-muted' }),
              h('span', { class: 'min-w-0 truncate' }, fault.description),
            ]))
            : [h('p', { class: 'text-xs text-slate-500 dark:text-slate-400' }, 'Brak danych o usterkach.')])
          : null,
      ])
    }
  },
})

function normalizeRepairStatus(status: string | null | undefined): RepairStatus {
  const normalized = String(status || 'new').trim()
  const lower = normalized.toLowerCase()

  if (lower === 'in_field' || lower === 'infield') {
    return 'IN_FIELD'
  }

  if (lower === 'ready_to_be_repaired') {
    return 'ready_to_be_repaired'
  }

  if (lower === 'at_location') {
    return 'at_location'
  }

  if (['new', 'planned', 'done', 'cancelled'].includes(lower)) {
    return lower as RepairStatus
  }

  return 'new'
}

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<RepairStatus, string> = {
    new: 'Nowa',
    planned: 'Zaplanowana',
    ready_to_be_repaired: 'Gotowa',
    at_location: 'W lokalizacji',
    IN_FIELD: 'W terenie',
    done: 'Zakończona',
    cancelled: 'Anulowana',
  }

  return labels[normalizeRepairStatus(status)]
}

function statusVariant(status: string | null | undefined): 'neutral' | 'success' | 'warning' | 'error' | 'info' {
  const normalized = normalizeRepairStatus(status)

  if (normalized === 'done') {
    return 'success'
  }

  if (normalized === 'cancelled') {
    return 'neutral'
  }

  if (normalized === 'IN_FIELD') {
    return 'info'
  }

  if (normalized === 'at_location' || normalized === 'ready_to_be_repaired') {
    return 'warning'
  }

  return 'neutral'
}

function columnKeyForRepair(repair: Repair): RepairColumnKey | null {
  const status = normalizeRepairStatus(repair.status)

  if (status === 'at_location' || status === 'ready_to_be_repaired') {
    return 'progress'
  }

  if (status === 'done' || status === 'cancelled') {
    return 'done'
  }

  return 'new'
}

function repairVehicleLabel(repair: Repair) {
  return repair.vehicle?.licensePlate || repair.vehicleLicensePlate || `Pojazd #${repair.vehicleId}`
}

function repairFleetVehicle(repair: Repair) {
  const vehicleId = repair.vehicle?.id ?? repair.vehicleId
  return fleetStore.vehicles.find((vehicle) => String(vehicle.backendId) === String(vehicleId)) || null
}

function repairCountryCode(repair: Repair) {
  return repairFleetVehicle(repair)?.countryCode?.toUpperCase() || null
}

function repairPlaceLabel(repair: Repair) {
  return repair.place?.name || repair.placeName || (repair.placeId ? `Miejsce #${repair.placeId}` : 'Brak miejsca')
}

function repairPlaceName(repair: Repair) {
  return repair.place?.name || repair.placeName || ''
}

function isBaseRepair(repair: Repair) {
  return repairPlaceName(repair).trim().toLocaleLowerCase('pl-PL') === 'baza'
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
}

function repairMatchesSearch(repair: Repair) {
  const query = normalizedRepairSearch.value

  if (!query) {
    return true
  }

  const createdBy = repair.createdBy as { username?: string | null } | null | undefined
  const searchText = [
    repair.id,
    repairVehicleLabel(repair),
    repairPlaceLabel(repair),
    statusLabel(repair.status),
    repair.description,
    repair.plannedArrivalAt,
    repair.plannedDepartureAt,
    createdBy?.username,
    ...(repair.faults || []).map((fault) => fault.description),
  ].join(' ')

  return normalizeSearchValue(searchText).includes(query)
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfIsoWeek(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function repairTimestamp(repair: Repair) {
  const timestamp = new Date(repair.plannedArrivalAt || '').getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function formatDate(value: string | null | undefined) {
  const date = parseDateOnly(value)
  return date ? date.toLocaleDateString('pl-PL') : '-'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function readRepairViewMode(): RepairViewMode {
  try {
    return localStorage.getItem(REPAIRS_VIEW_MODE_KEY) === 'list' ? 'list' : 'kanban'
  } catch {
    return 'kanban'
  }
}

function persistRepairViewMode() {
  try {
    localStorage.setItem(REPAIRS_VIEW_MODE_KEY, repairViewMode.value)
  } catch {
    // Local storage can be unavailable in private modes; the view still works without persistence.
  }
}

function uniqueRepairs(items: Repair[]) {
  const repairsById = new Map<number, Repair>()
  items.forEach((repair) => repairsById.set(repair.id, repair))
  return Array.from(repairsById.values()).sort((first, second) => repairTimestamp(first) - repairTimestamp(second))
}

function openCreateModal() {
  if (canCreateRepairs.value) isCreateModalOpen.value = true
}

function closeCreateModal() {
  if (!isMutating.value) isCreateModalOpen.value = false
}

function openRepairFromCreate(repair: Repair) {
  closeCreateModal()
  openRepairDetails(repair)
}

async function handleCreatedRepair() {
  await refreshAfterMutation()
}
function mechanicDisplayName(mechanic: Mechanic) {
  return mechanic.fullName || [mechanic.firstName, mechanic.lastName].filter(Boolean).join(' ') || `Mechanik #${mechanic.id}`
}

function resetMechanicForm() {
  Object.assign(mechanicForm, {
    id: null,
    firstName: '',
    lastName: '',
  })
}

function openMechanicsModal() {
  resetMechanicForm()
  isMechanicsModalOpen.value = true
  void repairStore.loadDictionaries()
}

function closeMechanicsModal() {
  if (!isMutating.value) {
    isMechanicFormModalOpen.value = false
    isMechanicsModalOpen.value = false
    mechanicToDelete.value = null
    resetMechanicForm()
  }
}

function openNewMechanicForm() {
  resetMechanicForm()
  isMechanicFormModalOpen.value = true
}

function closeMechanicForm() {
  if (isMutating.value) return
  isMechanicFormModalOpen.value = false
  resetMechanicForm()
}

function editMechanic(mechanic: Mechanic) {
  Object.assign(mechanicForm, {
    id: mechanic.id,
    firstName: mechanic.firstName || '',
    lastName: mechanic.lastName || '',
  })
  isMechanicFormModalOpen.value = true
}

async function submitMechanic() {
  const firstName = mechanicForm.firstName.trim()
  const lastName = mechanicForm.lastName.trim()

  if (!firstName || !lastName) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak danych',
      message: 'Podaj imię i nazwisko mechanika.',
    })
    return
  }

  try {
    if (mechanicForm.id) {
      await repairStore.updateMechanic(mechanicForm.id, { firstName, lastName })
      uiStore.addToast({
        type: 'success',
        title: 'Mechanik zaktualizowany',
        message: 'Zapisano dane mechanika.',
      })
    } else {
      await repairStore.createMechanic({ firstName, lastName })
      uiStore.addToast({
        type: 'success',
        title: 'Mechanik dodany',
        message: 'Dodano mechanika do listy.',
      })
    }

    closeMechanicForm()
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się zapisać mechanika',
      message: 'Sprawdź dane i spróbuj ponownie.',
    })
  }
}

async function confirmDeleteMechanic() {
  if (!mechanicToDelete.value) {
    return
  }

  try {
    await repairStore.deleteMechanic(mechanicToDelete.value.id)
    mechanicToDelete.value = null
    resetMechanicForm()
    uiStore.addToast({
      type: 'success',
      title: 'Mechanik usunięty',
      message: 'Usunięto mechanika z listy.',
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się usunąć mechanika',
      message: 'Spróbuj ponownie za chwilę.',
    })
  }
}

function captureRepairsReturnPosition() {
  const contentScrollTop = document.querySelector<HTMLElement>('[data-app-scroll-container]')?.scrollTop || 0
  const nestedScrollTops: Record<string, number> = {}

  repairsViewRoot.value?.querySelectorAll<HTMLElement>('[data-repairs-scroll-key]').forEach((element) => {
    const key = element.dataset.repairsScrollKey

    if (key) {
      nestedScrollTops[key] = element.scrollTop
    }
  })

  repairStore.setRepairsReturnPosition({ contentScrollTop, nestedScrollTops })
}

async function restoreRepairsReturnPosition() {
  const position = repairStore.consumeRepairsReturnPosition()

  if (!position) {
    return
  }

  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const contentScroller = document.querySelector<HTMLElement>('[data-app-scroll-container]')
  if (contentScroller) {
    contentScroller.scrollTop = position.contentScrollTop
  }

  repairsViewRoot.value?.querySelectorAll<HTMLElement>('[data-repairs-scroll-key]').forEach((element) => {
    const key = element.dataset.repairsScrollKey

    if (key && position.nestedScrollTops[key] !== undefined) {
      element.scrollTop = position.nestedScrollTops[key]
    }
  })
}

async function openRepairDetails(repair: Repair) {
  persistRepairViewMode()
  captureRepairsReturnPosition()
  await router.push({ name: 'repair-detail', params: { id: repair.id } })
  document.querySelector<HTMLElement>('[data-app-scroll-container]')?.scrollTo({ top: 0 })
}

function isFieldRepairSelected(repairId: number) {
  return selectedFieldRepairIds.value.has(repairId)
}

function toggleFieldRepairSelection(repairId: number) {
  const nextIds = new Set(selectedFieldRepairIds.value)

  if (nextIds.has(repairId)) {
    nextIds.delete(repairId)
  } else {
    nextIds.add(repairId)
  }

  selectedFieldRepairIds.value = nextIds
}

function toggleAllFieldRepairs(shouldSelect: boolean) {
  selectedFieldRepairIds.value = shouldSelect
    ? new Set(fieldRepairs.value.map((repair) => repair.id))
    : new Set()
}

function isFieldRepairExpanded(repairId: number) {
  return expandedFieldRepairIds.value.has(repairId)
}

function toggleFieldRepairExpansion(repairId: number) {
  const nextIds = new Set(expandedFieldRepairIds.value)

  if (nextIds.has(repairId)) {
    nextIds.delete(repairId)
  } else {
    nextIds.add(repairId)
  }

  expandedFieldRepairIds.value = nextIds
}

function repairPdfSection(repair: Repair) {
  const faults = repair.faults || []
  const createdBy = repair.createdBy?.username || repair.createdByUsername || '—'
  const faultRows = faults.length
    ? faults.map((fault, index) => `
        <tr>
          <td>${index + 1}.</td>
          <td>${escapeHtml(fault.description)}</td>
          <td>${fault.status === 'DONE' ? 'Wykonana' : 'Otwarta'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Brak usterek.</td></tr>'

  return `
    <section class="repair">
      <header>
        <div>
          <p class="eyebrow">Naprawa #${repair.id}</p>
          <h1>${escapeHtml(repairVehicleLabel(repair))}</h1>
        </div>
        <span class="status">${escapeHtml(statusLabel(repair.status))}</span>
      </header>
      <div class="details">
        <div><span>Miejsce</span><strong>${escapeHtml(repairPlaceLabel(repair))}</strong></div>
        <div><span>Planowany przyjazd</span><strong>${escapeHtml(formatDateTime(repair.plannedArrivalAt))}</strong></div>
        <div><span>Planowany odjazd</span><strong>${escapeHtml(formatDateTime(repair.plannedDepartureAt))}</strong></div>
        <div><span>Dodał</span><strong>${escapeHtml(createdBy)}</strong></div>
      </div>
      <h2>Usterki</h2>
      <table>
        <thead><tr><th>#</th><th>Opis</th><th>Status</th></tr></thead>
        <tbody>${faultRows}</tbody>
      </table>
    </section>
  `
}

function generateRepairsPdf(items: Repair[]) {
  if (!items.length) {
    return
  }

  const printWindow = window.open('', '_blank', 'width=980,height=760')

  if (!printWindow) {
    return
  }

  printWindow.opener = null
  printWindow.document.write(`
    <!doctype html>
    <html lang="pl">
      <head>
        <meta charset="utf-8">
        <title>Naprawy w terenie</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 11px; }
          .repair { break-after: page; page-break-after: always; }
          .repair:last-child { break-after: auto; page-break-after: auto; }
          header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
          h1 { margin: 2px 0 0; font-size: 23px; }
          h2 { margin: 20px 0 8px; font-size: 14px; }
          .eyebrow { margin: 0; color: #6b7280; font-size: 10px; text-transform: uppercase; }
          .status { border: 1px solid #d1d5db; border-radius: 999px; padding: 6px 10px; font-weight: 700; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-top: 16px; background: #e5e7eb; border: 1px solid #e5e7eb; }
          .details div { display: flex; flex-direction: column; gap: 4px; background: #fff; padding: 10px; }
          .details span, .notes > span { color: #6b7280; font-size: 9px; text-transform: uppercase; }
          .notes { margin-top: 12px; border: 1px solid #e5e7eb; padding: 10px; }
          .notes p { margin: 5px 0 0; white-space: pre-wrap; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; }
          th:first-child, td:first-child { width: 36px; }
          th:last-child, td:last-child { width: 90px; }
        </style>
      </head>
      <body>${items.map(repairPdfSection).join('')}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => printWindow.print(), 180)
}

function toggleRepairFaults(repairId: number) {
  const nextCollapsedIds = new Set(collapsedRepairIds.value)

  if (nextCollapsedIds.has(repairId)) {
    nextCollapsedIds.delete(repairId)
  } else {
    nextCollapsedIds.add(repairId)
  }

  collapsedRepairIds.value = nextCollapsedIds
}

function isRepairColumnCollapsed(columnKey: RepairColumnKey) {
  return collapsedRepairColumnKeys.value.has(columnKey)
}

function toggleRepairColumn(columnKey: RepairColumnKey) {
  const nextCollapsedKeys = new Set(collapsedRepairColumnKeys.value)

  if (nextCollapsedKeys.has(columnKey)) {
    nextCollapsedKeys.delete(columnKey)
  } else {
    nextCollapsedKeys.add(columnKey)
  }

  collapsedRepairColumnKeys.value = nextCollapsedKeys
}

function visibleColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return column.repairs.slice(0, visibleRepairLimits[column.key])
}

function hasMoreColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return column.repairs.length > visibleRepairLimits[column.key]
}

function remainingColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return Math.max(0, column.repairs.length - visibleRepairLimits[column.key])
}

function loadMoreColumnRepairs(columnKey: RepairColumnKey) {
  visibleRepairLimits[columnKey] += REPAIRS_PAGE_SIZE
}

function resetVisibleRepairLimits() {
  visibleRepairLimits.new = REPAIRS_PAGE_SIZE
  visibleRepairLimits.progress = REPAIRS_PAGE_SIZE
  visibleRepairLimits.done = REPAIRS_PAGE_SIZE
}

function isListRepairExpanded(repairId: number) {
  return expandedListRepairIds.value.has(repairId)
}

function toggleListRepair(repairId: number) {
  const nextExpandedIds = new Set(expandedListRepairIds.value)

  if (nextExpandedIds.has(repairId)) {
    nextExpandedIds.delete(repairId)
  } else {
    nextExpandedIds.add(repairId)
  }

  expandedListRepairIds.value = nextExpandedIds
}

function requestListFaultStatusChange(repair: Repair, fault: RepairFault) {
  if (!canChangeFaultStatus.value || isMutating.value) {
    return
  }

  listFaultStatusTarget.value = { repair, fault }
}

async function confirmListFaultStatusChange() {
  const target = listFaultStatusTarget.value

  if (!target || !canChangeFaultStatus.value) {
    return
  }

  const shouldReopen = target.fault.status === 'DONE'

  try {
    await repairStore.updateRepairFaultStatus(target.repair.id, target.fault.id, {
      status: shouldReopen ? 'open' : 'done',
    })
    listFaultStatusTarget.value = null
    uiStore.addToast({
      type: 'success',
      title: shouldReopen ? 'Usterka ponownie otwarta' : 'Usterka zakończona',
      message: shouldReopen
        ? 'Oznaczono usterkę jako niezrobioną.'
        : 'Oznaczono usterkę jako zrobioną.',
    })
  } catch {
    // Globalny interceptor API pokazuje szczegóły błędu.
  }
}

function updateRepairDragPreview(event: DragEvent) {
  if (event.clientX || event.clientY) {
    dragPreview.x = event.clientX
    dragPreview.y = event.clientY
  }
}

function startRepairDrag(repair: Repair, event: DragEvent) {
  if (!canUpdateRepairs.value) {
    event.preventDefault()
    return
  }

  draggedRepairId.value = repair.id
  draggedRepair.value = repair
  updateRepairDragPreview(event)

  const emptyDragImage = document.createElement('div')
  emptyDragImage.style.width = '1px'
  emptyDragImage.style.height = '1px'
  emptyDragImage.style.opacity = '0'
  document.body.appendChild(emptyDragImage)
  event.dataTransfer?.setDragImage(emptyDragImage, 0, 0)
  window.setTimeout(() => emptyDragImage.remove(), 0)
}

function endRepairDrag() {
  draggedRepairId.value = null
  draggedRepair.value = null
  dragOverColumn.value = null
}

function hasOpenFaults(repair: Repair) {
  if ((repair.totalFaults || 0) > (repair.doneFaults || 0)) {
    return true
  }

  return (repair.faults || []).some((fault) => fault.status !== 'DONE')
}

async function dropRepairOnColumn(column: { key: RepairColumnKey; targetStatus: RepairStatus }) {
  if (!canUpdateRepairs.value) {
    endRepairDrag()
    return
  }

  const repairId = draggedRepairId.value
  dragOverColumn.value = null
  draggedRepairId.value = null

  if (!repairId) {
    return
  }

  const repair = repairs.value.find((item) => item.id === repairId) || selectedWeekRepairs.value.find((item) => item.id === repairId)

  if (!repair || columnKeyForRepair(repair) === column.key) {
    return
  }

  if (column.targetStatus === 'done' && hasOpenFaults(repair)) {
    uiStore.addToast({
      type: 'warning',
      title: 'Nie można zakończyć',
      message: 'Najpierw oznacz wszystkie usterki jako zrobione.',
    })
    return
  }

  isMutating.value = true

  try {
    await repairStore.updateRepair(repair.id, { status: column.targetStatus })
    await refreshAfterMutation()
    uiStore.addToast({
      type: 'success',
      title: 'Status zmieniony',
      message: `Przeniesiono naprawę do sekcji „${statusLabel(column.targetStatus)}”.`,
    })
  } finally {
    isMutating.value = false
  }
}

async function loadRepairs(options?: { silent?: boolean }) {
  await repairStore.loadRepairs(options)
}

async function loadDictionaries() {
  await repairStore.loadDictionaries()
}

async function loadData() {
  await Promise.allSettled([
    repairStore.loadListData(),
    loadDictionaries(),
    fleetStore.loadFleetData({ silent: true }),
  ])
}

async function refreshAfterMutation() {
  await Promise.allSettled([
    loadRepairs({ silent: true }),
    fleetStore.loadFleetData({ silent: true }),
  ])
}

function vehicleDriverLabel(vehicle: Vehicle) {
  return vehicle.driverName || ''
}

function isPositionStale(vehicle: Vehicle) {
  if (!vehicle.positionTimestamp) {
    return true
  }

  const timestamp = new Date(vehicle.positionTimestamp).getTime()

  if (Number.isNaN(timestamp)) {
    return true
  }

  return Date.now() - timestamp >= 24 * 60 * 60 * 1000
}

function markerState(vehicle: Vehicle) {
  if (isPositionStale(vehicle)) {
    return 'power'
  }

  if (vehicle.speed > 0) {
    if (vehicle.speed <= 30) {
      return 'moving-low'
    }

    if (vehicle.speed <= 70) {
      return 'moving-medium'
    }

    return 'moving-high'
  }

  if (vehicle.alerts.length) {
    return 'alert'
  }

  return 'idle'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function markerIconSvg(vehicle: Vehicle) {
  const state = markerState(vehicle)

  if (state === 'alert') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>'
  }

  if (state === 'power') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 7v5"></path><path d="M8.5 9.5a5 5 0 1 0 7 0"></path></svg>'
  }

  if (state === 'idle') {
    if (vehicle.vehicleType === 'trailer') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle></svg>'
    }

    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="10" x2="10" y1="15" y2="9"></line><line x1="14" x2="14" y1="15" y2="9"></line></svg>'
  }

  return '<svg class="rw-map-marker-heading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m16 12-4-4-4 4"></path><path d="M12 16V8"></path></svg>'
}

function markerHtml(vehicle: Vehicle) {
  const plateNumber = escapeHtml(vehicle.plateNumber)
  const driver = vehicleDriverLabel(vehicle)
  const driverHtml = driver ? `<span class="rw-map-marker-driver">${escapeHtml(driver)}</span>` : ''

  return `
    <button type="button" class="rw-map-marker-button" title="${plateNumber}" aria-label="Pokaż pojazd ${plateNumber}">
      <span class="rw-map-marker-icon rw-map-marker-${markerState(vehicle)}" style="--rw-marker-heading: ${vehicle.heading ?? 0}deg">
        ${markerIconSvg(vehicle)}
      </span>
    </button>
    <span class="rw-map-marker-plate"><span class="rw-map-marker-plate-number">${plateNumber}</span>${driverHtml}</span>
  `
}

function createVehicleMarker(item: { repair: Repair; vehicle: Vehicle }) {
  const overlay = new window.google.maps.OverlayView()
  let element: HTMLDivElement | null = null
  let button: HTMLButtonElement | null = null

  overlay.onAdd = () => {
    element = document.createElement('div')
    element.className = `rw-map-vehicle-marker rw-map-vehicle-marker-${item.vehicle.vehicleType}`
    element.title = item.vehicle.plateNumber
    element.innerHTML = markerHtml(item.vehicle)
    button = element.querySelector<HTMLButtonElement>('.rw-map-marker-button')
    button?.addEventListener('click', (event) => {
      event.stopPropagation()
      openRepairDetails(item.repair)
    })
    overlay.getPanes()?.overlayMouseTarget.appendChild(element)
  }

  overlay.draw = () => {
    if (!element) {
      return
    }

    const projection = overlay.getProjection()
    const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(item.vehicle.latitude, item.vehicle.longitude))

    if (!point) {
      return
    }

    element.style.left = `${point.x}px`
    element.style.top = `${point.y}px`
  }

  overlay.onRemove = () => {
    button?.replaceWith(button.cloneNode(true))
    element?.remove()
    button = null
    element = null
  }

  overlay.setMap(repairMap)
  return overlay
}

function clearRepairMarkers() {
  repairMarkers.forEach((marker) => marker.setMap?.(null))
  repairMarkers = []
}

async function initializeRepairMap() {
  if (activeTab.value !== 'map') {
    return
  }

  if (!GOOGLE_MAPS_API_KEY) {
    mapState.value = 'missing-key'
    return
  }

  await nextTick()

  if (!mapElement.value) {
    return
  }

  if (repairMap && googleRef) {
    window.google?.maps?.event?.trigger(repairMap, 'resize')
    renderRepairMap()
    return
  }

  mapState.value = 'loading'

  try {
    googleRef = await loadGoogleMaps(GOOGLE_MAPS_API_KEY)
    repairMap = new googleRef.maps.Map(mapElement.value, {
      center: { lat: 52.1, lng: 19.4 },
      zoom: 6,
      gestureHandling: 'greedy',
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
    })
    mapState.value = 'ready'
    renderRepairMap()
  } catch {
    mapState.value = 'error'
  }
}

function renderRepairMap() {
  if (!repairMap || !googleRef || activeTab.value !== 'map') {
    return
  }

  clearRepairMarkers()
  window.google?.maps?.event?.trigger(repairMap, 'resize')

  const bounds = new googleRef.maps.LatLngBounds()

  mapRepairVehicles.value.forEach((item) => {
    const marker = createVehicleMarker(item)
    repairMarkers.push(marker)
    bounds.extend(new googleRef.maps.LatLng(item.vehicle.latitude, item.vehicle.longitude))
  })

  if (mapRepairVehicles.value.length) {
    repairMap.fitBounds(bounds, 56)
  }
}

watch(activeTab, (tab) => {
  if (tab === 'map') {
    void initializeRepairMap()
  }
})

watch(repairViewMode, persistRepairViewMode)
watch(normalizedRepairSearch, resetVisibleRepairLimits)

watch(fieldRepairs, (visibleRepairs) => {
  const visibleIds = new Set(visibleRepairs.map((repair) => repair.id))
  selectedFieldRepairIds.value = new Set(
    [...selectedFieldRepairIds.value].filter((repairId) => visibleIds.has(repairId)),
  )
  expandedFieldRepairIds.value = new Set(
    [...expandedFieldRepairIds.value].filter((repairId) => visibleIds.has(repairId)),
  )
})

watch(mapRepairVehicles, () => {
  if (activeTab.value === 'map') {
    renderRepairMap()
  }
})

onMounted(async () => {
  await loadData()
  await restoreRepairsReturnPosition()

  if (activeTab.value === 'map') {
    await initializeRepairMap()
  }
})

onBeforeUnmount(() => {
  clearRepairMarkers()

})
</script>

<style>
.rw-map-vehicle-marker {
  position: absolute;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: max-content;
  border: 0;
  background: transparent;
  padding: 0;
  color: rgb(var(--rw-app-text));
  cursor: default;
  pointer-events: none;
  transform: translate(-50%, -13px);
}

.rw-map-vehicle-marker-trailer {
  z-index: 30;
}

.rw-map-vehicle-marker-truck {
  z-index: 31;
}

.rw-map-marker-button {
  display: grid;
  height: 26px;
  width: 26px;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  pointer-events: auto;
}

.rw-map-marker-icon {
  display: grid;
  height: 26px;
  width: 26px;
  place-items: center;
  border-radius: 9999px;
  background: rgb(var(--rw-app-panel));
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.rw-map-marker-icon svg {
  height: 22px;
  width: 22px;
}

.rw-map-marker-heading {
  transform: rotate(var(
      --rw-marker-heading));
  transform-origin: center;
}

.rw-map-marker-idle {
  color: #6b7280;
}

.rw-map-marker-moving-low {
  color: #16a34a;
}

.rw-map-marker-moving-medium {
  color: #ca8a04;
}

.rw-map-marker-moving-high,
.rw-map-marker-power,
.rw-map-marker-alert {
  color: #dc2626;
}

.rw-map-marker-plate {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  max-width: 14rem;
  border: 1px solid rgb(var(--rw-app-border));
  border-radius: 12px;
  background: rgb(var(--rw-app-panel));
  padding: 3px 8px;
  color: rgb(var(--rw-app-text));
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}

.rw-map-marker-plate-number,
.rw-map-marker-driver {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rw-map-marker-driver {
  color: rgb(var(--rw-app-muted));
  font-size: 10px;
  font-weight: 600;
  min-width: 0;
}

.dark .rw-map-marker-icon {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
}
</style>
