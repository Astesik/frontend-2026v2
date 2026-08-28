<template>
  <div
    class="flex min-h-full w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden"
    :class="isKanbanTab ? 'xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:overflow-hidden' : ''"
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
        <div class="flex min-w-0 max-w-full items-end gap-2">
          <AppIconButton
            label="Poprzedni tydzień"
            :disabled="!canSelectPreviousWeek"
            @click="selectAdjacentWeek(-1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </AppIconButton>
          <AppSelect
            v-model="selectedWeekKey"
            class="min-w-0 flex-1 sm:w-72 sm:flex-none"
            label="Zakres tygodnia"
            :options="weekOptions"
            size="sm"
          />
          <AppIconButton
            label="Następny tydzień"
            :disabled="!canSelectNextWeek"
            @click="selectAdjacentWeek(1)"
          >
            <ChevronRight class="h-4 w-4" />
          </AppIconButton>
        </div>
        <AppButton
          size="sm"
          :disabled="!canCreateRepairs"
          :title="!canCreateRepairs ? 'Brak uprawnienia: repairs.create' : undefined"
          @click="openCreateModal"
        >
          <Plus class="h-4 w-4" />
          Dodaj nową naprawę
        </AppButton>
        <AppButton size="sm" variant="secondary" @click="openMechanicsModal">
          <Users class="h-4 w-4" />
          Mechanicy
        </AppButton>
      </div>

      <div class="w-full shrink-0 md:flex md:justify-end xl:w-auto">
        <AppSelect
          v-model="activeTab"
          class="w-full md:hidden"
          label="Widok napraw"
          :options="tabOptions"
          size="sm"
        />

        <AppTabs
          class="hidden w-fit shrink-0 md:inline-flex"
          :model-value="activeTab"
          :items="visibleTabs"
          size="sm"
          aria-label="Widok napraw"
          @update:model-value="setActiveTab"
        />
      </div>
    </header>

    <section v-if="!isLoading && isKanbanTab" class="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      <article class="repair-stat-tile">
        <div class="repair-stat-icon">
          <ListChecks class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <p class="repair-stat-label">Wszystkie</p>
          <p class="repair-stat-value">{{ weeklyStats.total }}</p>
        </div>
      </article>

      <article class="repair-stat-tile">
        <div class="repair-stat-icon">
          <Building2 class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <p class="repair-stat-label">Aktywne</p>
          <p class="repair-stat-value">{{ weeklyStats.location }}</p>
        </div>
      </article>

      <article class="repair-stat-tile">
        <div class="repair-stat-icon text-success-600 dark:text-success-400">
          <CircleCheck class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <p class="repair-stat-label">Ukończone</p>
          <p class="repair-stat-value">{{ weeklyStats.completed }}</p>
        </div>
      </article>

      <article class="repair-stat-tile">
        <div class="repair-stat-icon">
          <Percent class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <p class="repair-stat-label">Ukończenie</p>
          <p class="repair-stat-value">{{ weeklyStats.completionPercent }}%</p>
        </div>
      </article>
    </section>

    <div v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie napraw...
    </div>

    <section v-else-if="isKanbanTab" class="grid w-full min-w-0 max-w-full min-h-[calc(100vh-220px)] gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
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
          class="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <article
            v-for="repair in column.repairs"
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
                :show-country-flag="activeTab === 'base'"
              />
            </article>

          <div v-if="!column.repairs.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
            Przeciągnij tutaj naprawę, aby zmienić status.
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'field'" class="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
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

      <div class="min-h-0 min-w-0 flex-1 overflow-auto">
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

    <AppModal
      :open="isCreateModalOpen"
      title="Dodaj nową naprawę"
      size="xl"
      :busy="isMutating"
      :close-on-backdrop="false"
      :close-on-escape="false"
      panel-class="h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-3rem)] sm:max-h-[46rem]"
      body-class="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !bg-ui-surface !p-4 sm:!p-5"
      @close="closeCreateModal"
    >
      <div v-if="!createResult" class="flex shrink-0 justify-center border-b border-ui-divider pb-4">
        <AppStepIndicator
          :steps="createWizardSteps"
          :current-step="createWizardStep"
          :max-reachable-step="createMaxReachableStep"
          @select="selectCreateWizardStep"
        />
      </div>

      <form
        v-if="!createResult"
        id="create-repair-form"
        class="min-h-0 flex-1 overflow-hidden pt-4"
        @submit.prevent="createWizardStep === 0 ? goToCreateFaultsStep() : submitCreateRepair()"
      >
          <section v-if="createWizardStep === 0" class="mx-auto h-full max-w-4xl overflow-y-auto px-1 pb-1">
            <div class="grid gap-4 sm:grid-cols-2">
              <AppSearchSelect
                v-model="createForm.vehicleId"
                label="Pojazd"
                placeholder="Wybierz pojazd"
                :options="vehicleOptions"
                :error="createDetailsError && !createForm.vehicleId ? 'Wybierz pojazd.' : undefined"
              />
              <AppSearchSelect
                v-model="createForm.placeId"
                label="Miejsce"
                placeholder="Wybierz miejsce"
                :options="placeOptions"
                :error="createDetailsError && !createForm.placeId ? 'Wybierz miejsce naprawy.' : undefined"
              />
              <div
                v-if="existingWeekRepairForCreateVehicle"
                class="flex flex-col gap-3 rounded-[var(--rw-radius-control)] border border-warning-100 bg-warning-50 px-4 py-3 text-warning-600 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400"
              >
                <div class="flex min-w-0 items-start gap-3">
                  <CalendarClock class="mt-0.5 h-5 w-5 shrink-0 text-ui-icon" />
                  <p class="min-w-0 text-sm font-semibold">Dla tego pojazdu istnieje już naprawa w tym tygodniu.</p>
                </div>
                <AppButton type="button" size="sm" variant="secondary" class="shrink-0" @click="openRepairFromCreate(existingWeekRepairForCreateVehicle)">
                  Przejdź do naprawy
                </AppButton>
              </div>
              <div
                v-else-if="existingOpenRepairForCreateVehicle"
                class="flex flex-col gap-3 rounded-[var(--rw-radius-control)] border border-warning-100 bg-warning-50 px-4 py-3 text-warning-600 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400"
              >
                <div class="flex min-w-0 items-start gap-3">
                  <TriangleAlert class="mt-0.5 h-5 w-5 shrink-0" />
                  <p class="min-w-0 text-sm font-semibold">Dla tego pojazdu istnieje już niezamknięta naprawa.</p>
                </div>
                <AppButton type="button" size="sm" variant="secondary" class="shrink-0" @click="openRepairFromCreate(existingOpenRepairForCreateVehicle)">
                  Przejdź do naprawy
                </AppButton>
              </div>
              <AppSelect v-model="createForm.status" label="Status" :options="repairStatusOptions" />
              <AppDateTimePicker v-model="createForm.arrivalAt" label="Planowany przyjazd" default-time="08:00" />
              <AppDateTimePicker v-model="createForm.departureAt" label="Planowany wyjazd" default-time="16:00" />
              <AppTextarea v-model="createForm.description" class="sm:col-span-2" label="Uwagi" placeholder="Uwagi do naprawy" :rows="4" />
            </div>
          </section>

          <section v-else class="flex h-full min-h-0 flex-col">
            <div class="mb-4 flex shrink-0 items-center justify-between gap-3">
              <h3 class="ui-section-title">Usterki</h3>
              <AppBadge>{{ draftFaults.length }}</AppBadge>
            </div>

            <div class="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <article
                v-for="(fault, index) in draftFaults"
                :key="fault.id"
                class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted p-3.5"
              >
                <div class="mb-2 flex items-center justify-between gap-3">
                  <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--rw-radius-item)] border border-ui-border bg-ui-surface text-sm font-semibold text-ui-text shadow-soft">
                    {{ index + 1 }}
                  </span>
                  <AppIconButton label="Usuń usterkę" size="sm" variant="ghost" @click="removeDraftFault(fault.id)">
                    <Trash2 class="h-4 w-4" />
                  </AppIconButton>
                </div>

                <AppInput
                  v-model="fault.description"
                  label="Opis usterki"
                  placeholder="Np. wymiana klocków, światła, plandeka..."
                  :disabled="!canCreateFaults"
                />

                <section class="mt-3 rounded-[var(--rw-radius-control)] border border-ui-divider bg-ui-surface p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <ImagePlus class="h-4 w-4 shrink-0 text-ui-icon" />
                      <h4 class="truncate ui-label text-ui-text">Zdjęcia</h4>
                    </div>
                    <AppBadge>{{ fault.photos.length }}</AppBadge>
                  </div>

                  <button
                    type="button"
                    class="flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-[var(--rw-radius-control)] border border-dashed border-ui-border bg-ui-input px-3 py-3 text-center text-sm font-medium text-ui-text-secondary transition hover:border-ui-border-strong hover:bg-ui-hover hover:text-ui-text disabled:cursor-not-allowed disabled:bg-ui-disabled disabled:text-ui-disabled-text"
                    :disabled="isMutating || !canAddFaultPhotos"
                    @click="openDraftFaultPhotoAdd(fault.id)"
                  >
                    <ImagePlus class="h-4 w-4" />
                    Dodaj zdjęcia
                  </button>

                  <p v-if="fault.photoError" class="mt-2 ui-error">{{ fault.photoError }}</p>

                  <div v-if="fault.photos.length" class="mt-2 grid max-h-28 grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2 overflow-y-auto pr-1">
                    <article
                      v-for="photo in fault.photos"
                      :key="photo.id"
                      class="group relative aspect-square overflow-hidden rounded-[var(--rw-radius-item)] border border-ui-border bg-ui-muted"
                    >
                      <img :src="photo.objectUrl" :alt="photo.file.name" class="h-full w-full object-cover" />
                      <button
                        type="button"
                        class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ui-overlay/75 text-white transition hover:bg-ui-overlay"
                        aria-label="Usuń zdjęcie z dodawanej usterki"
                        @click="removeDraftFaultPhoto(fault.id, photo.id)"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </article>
                  </div>
                </section>
              </article>

              <button
                type="button"
                class="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-[var(--rw-radius-panel)] border border-dashed border-ui-border bg-ui-surface px-4 py-4 text-center text-sm font-medium text-ui-text-secondary transition hover:border-ui-border-strong hover:bg-ui-hover hover:text-ui-text disabled:cursor-not-allowed disabled:bg-ui-disabled disabled:text-ui-disabled-text"
                :disabled="!canCreateFaults"
                @click="addDraftFault"
              >
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-muted">
                  <Plus class="h-4 w-4" />
                </span>
                Dodaj kolejną usterkę
              </button>
            </div>
          </section>
      </form>

      <section v-else class="mx-auto flex min-h-0 max-w-xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div
          class="grid h-16 w-16 place-items-center rounded-full"
          :class="createResult === 'success' ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' : 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400'"
        >
          <CircleCheck v-if="createResult === 'success'" class="h-9 w-9" />
          <CircleX v-else class="h-9 w-9" />
        </div>
        <h3 class="mt-4 text-xl font-semibold text-ui-text">
          {{ createResult === 'success' ? 'Naprawa dodana!' : 'Napotkano problem' }}
        </h3>
        <p class="mt-2 max-w-md ui-body-sm text-ui-mutedText">{{ createResultMessage }}</p>
      </section>

      <template #footer>
        <template v-if="createResult === 'success'">
          <AppButton type="button" variant="secondary" @click="closeCreateModal">Zamknij</AppButton>
          <AppButton type="button" @click="openCreatedRepair">Przejdź do naprawy</AppButton>
        </template>
        <template v-else-if="createResult === 'error'">
          <AppButton type="button" variant="secondary" @click="returnToCreateFaults">Wróć do usterek</AppButton>
          <AppButton type="button" :loading="isMutating" @click="submitCreateRepair">Spróbuj ponownie</AppButton>
        </template>
        <template v-else-if="createWizardStep === 0">
          <AppButton type="button" variant="secondary" @click="closeCreateModal">Anuluj</AppButton>
          <AppButton form="create-repair-form" type="submit">Dalej</AppButton>
        </template>
        <template v-else>
          <AppButton type="button" variant="secondary" @click="selectCreateWizardStep(0)">Wstecz</AppButton>
          <AppButton form="create-repair-form" type="submit" :loading="isMutating" :disabled="!canCreateRepairs">
            Zapisz naprawę
          </AppButton>
        </template>
      </template>
    </AppModal>

    <input
      ref="draftFaultPhotoInput"
      type="file"
      class="fixed left-[-9999px] top-0 h-px w-px opacity-0"
      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
      multiple
      @change="handleDraftFaultPhotoInputSelection"
    />

    <input
      ref="draftFaultCameraInput"
      type="file"
      class="fixed left-[-9999px] top-0 h-px w-px opacity-0"
      accept="image/*"
      capture="environment"
      @change="handleDraftFaultPhotoInputSelection"
    />

    <Teleport to="body">
      <div
        v-if="draftPhotoPickerFaultId"
        class="fixed inset-0 z-[360] flex items-end justify-center bg-transparent p-3 md:hidden"
        @click.self="closeDraftPhotoPickerMenu"
      >
        <section class="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-app-border dark:bg-app-panel">
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border">
            <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">Dodaj zdjęcie</p>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
              aria-label="Zamknij wybór zdjęcia"
              @click="closeDraftPhotoPickerMenu"
            >
              <X class="h-4 w-4" />
            </button>
          </header>
          <div class="grid gap-2 p-3">
            <button
              type="button"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-app-border dark:bg-app-dark dark:text-slate-100 dark:hover:bg-app-elevated"
              @click="chooseDraftPhotoSource('gallery')"
            >
              <ImagePlus class="h-5 w-5 text-slate-400" />
              Wybierz z galerii
            </button>
            <button
              type="button"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-app-border dark:bg-app-dark dark:text-slate-100 dark:hover:bg-app-elevated"
              @click="chooseDraftPhotoSource('camera')"
            >
              <Camera class="h-5 w-5 text-slate-400" />
              Zrób zdjęcie
            </button>
          </div>
        </section>
      </div>
    </Teleport>

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
  Building2,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Columns3,
  FileDown,
  ImagePlus,
  ListChecks,
  Percent,
  Plus,
  SquarePen,
  TriangleAlert,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppStepIndicator from '@/components/ui/AppStepIndicator.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { getApiErrorMessage } from '@/services/api'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Mechanic, Repair, RepairStatus, RepairWeek } from '@/types/repair'
import type { Vehicle } from '@/types/fleet'

type TabKey = 'base' | 'other' | 'field' | 'map'
type RepairColumnKey = 'new' | 'progress' | 'done'

interface RepairsViewState {
  activeTab?: TabKey
  selectedWeekKey?: string
}

interface DraftFault {
  id: string
  description: string
  photos: DraftFaultPhotoDraft[]
  photoError: string
}

interface DraftFaultPhotoDraft {
  id: string
  file: File
  objectUrl: string
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const REPAIRS_VIEW_STATE_KEY = 'routewise.repairs.viewState'
const router = useRouter()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const {
  repairs,
  weeks,
  fieldAndUnassigned,
  mechanics,
  places,
  isLoading,
  isMutating,
} = storeToRefs(repairStore)
const savedViewState = readRepairsViewState()
const activeTab = ref<TabKey>(savedViewState.activeTab || 'base')
const selectedWeekKey = ref(savedViewState.selectedWeekKey || '')
const repairSearch = ref('')
const normalizedRepairSearch = computed(() => normalizeSearchValue(repairSearch.value))
const draggedRepairId = ref<number | null>(null)
const draggedRepair = ref<Repair | null>(null)
const dragPreview = reactive({ x: 0, y: 0 })
const dragOverColumn = ref<RepairColumnKey | null>(null)
const collapsedRepairColumnKeys = ref<Set<RepairColumnKey>>(new Set())
const collapsedRepairIds = ref<Set<number>>(new Set())
const expandedFieldRepairIds = ref<Set<number>>(new Set())
const selectedFieldRepairIds = ref<Set<number>>(new Set())
const isCreateModalOpen = ref(false)
const isMechanicsModalOpen = ref(false)
const isMechanicFormModalOpen = ref(false)
const mechanicToDelete = ref<Mechanic | null>(null)
const draftFaultPhotoInput = ref<HTMLInputElement | null>(null)
const draftFaultCameraInput = ref<HTMLInputElement | null>(null)
const selectedDraftFaultPhotoInputId = ref<string | null>(null)
const draftPhotoPickerFaultId = ref<string | null>(null)
const mapElement = ref<HTMLDivElement | null>(null)
const mapState = ref<'idle' | 'loading' | 'ready' | 'missing-key' | 'error'>('idle')
const createForm = reactive({
  vehicleId: '',
  placeId: '',
  status: 'planned' as RepairStatus,
  arrivalAt: '',
  departureAt: '',
  description: '',
})
const createWizardSteps = [
  { label: 'Dane naprawy' },
  { label: 'Usterki' },
]
const createWizardStep = ref(0)
const createMaxReachableStep = ref(0)
const createDetailsError = ref(false)
const createResult = ref<'success' | 'error' | null>(null)
const createResultMessage = ref('')
const createdRepair = ref<Repair | null>(null)
const draftFaults = ref<DraftFault[]>([createDraftFault()])
const mechanicForm = reactive({
  id: null as number | null,
  firstName: '',
  lastName: '',
})
let googleRef: any = null
let repairMap: any = null
let repairMarkers: any[] = []

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024

const tabs: Array<{ value: TabKey; label: string; icon: Component }> = [
  { value: 'base', label: 'Naprawy na bazie', icon: Columns3 },
  { value: 'other', label: 'Pozostałe', icon: Columns3 },
  { value: 'field', label: 'W terenie', icon: Wrench },
]

const visibleTabs = computed(() => tabs)

const tabOptions = computed<AppSelectOption[]>(() => visibleTabs.value.map((tab) => ({
  value: tab.value,
  label: tab.label,
})))

function setActiveTab(value: string) {
  if (isVisibleTabKey(value)) activeTab.value = value
}

const repairStatusOptions: AppSelectOption[] = [
  { label: 'Nowa', value: 'new' },
  { label: 'Zaplanowana', value: 'planned' },
  { label: 'Gotowa do naprawy', value: 'ready_to_be_repaired' },
  { label: 'W lokalizacji', value: 'at_location' },
  { label: 'W terenie', value: 'IN_FIELD' },
  { label: 'Zakończona', value: 'done' },
  { label: 'Anulowana', value: 'cancelled' },
]

const weekOptions = computed<AppSelectOption[]>(() => [...weeks.value]
  .sort((first, second) => second.start.localeCompare(first.start))
  .map((week) => ({
  value: weekKey(week),
  label: `Tydzień ${week.week} (${formatDate(week.start)} - ${formatDate(week.end)})`,
})))

const selectedWeekIndex = computed(() => weeks.value.findIndex((week) => weekKey(week) === selectedWeekKey.value))
const canSelectPreviousWeek = computed(() => selectedWeekIndex.value > 0)
const canSelectNextWeek = computed(() => selectedWeekIndex.value >= 0 && selectedWeekIndex.value < weeks.value.length - 1)
const canCreateRepairs = computed(() => hasPermission('repairs.create'))
const canUpdateRepairs = computed(() => hasPermission('repairs.update'))
const canCreateFaults = computed(() => hasPermission('faults.create'))
const canAddFaultPhotos = computed(() => hasPermission('fault_photos.add'))
const selectedWeek = computed(() => weeks.value[selectedWeekIndex.value] || weeks.value[0] || null)
const isKanbanTab = computed(() => activeTab.value === 'base' || activeTab.value === 'other')
const selectedWeekLabel = computed(() => selectedWeek.value
  ? `Tydzień ${selectedWeek.value.week}: ${formatDate(selectedWeek.value.start)} - ${formatDate(selectedWeek.value.end)}`
  : 'Brak danych tygodnia')

const vehicleOptions = computed<AppSearchSelectOption[]>(() => fleetStore.apiVehicles.map((vehicle) => ({
  value: String(vehicle.id),
  label: vehicle.licensePlate,
  searchText: vehicle.licensePlate,
})))

const placeOptions = computed<AppSearchSelectOption[]>(() => places.value.map((place) => ({
  value: String(place.id),
  label: place.name,
})))

const selectedWeekRepairs = computed(() => selectedWeek.value?.repairs?.length
  ? uniqueRepairs(selectedWeek.value.repairs)
  : uniqueRepairs(repairs.value.filter((repair) => selectedWeek.value ? isRepairInWeek(repair, selectedWeek.value) : true)))

function repairMatchesCreateVehicle(repair: Repair) {
  return String(repair.vehicle?.id ?? repair.vehicleId) === String(createForm.vehicleId)
}

const existingOpenRepairForCreateVehicle = computed(() => {
  if (!createForm.vehicleId) return null

  const availableRepairs = uniqueRepairs([
    ...repairs.value,
    ...weeks.value.flatMap((week) => week.repairs || []),
    ...fieldAndUnassigned.value,
  ])

  return availableRepairs.find((repair) => {
    const status = normalizeRepairStatus(repair.status)
    return repairMatchesCreateVehicle(repair)
      && status !== 'done'
      && status !== 'cancelled'
  }) || null
})

const existingWeekRepairForCreateVehicle = computed(() => {
  if (!createForm.vehicleId) return null
  return selectedWeekRepairs.value.find(repairMatchesCreateVehicle) || null
})

const filteredSelectedWeekRepairs = computed(() => selectedWeekRepairs.value.filter((repair) => repairMatchesSearch(repair)))

const baseWeekRepairs = computed(() => filteredSelectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && isBaseRepair(repair)
)))

const otherWeekRepairs = computed(() => filteredSelectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && !isBaseRepair(repair)
)))

const activeKanbanRepairs = computed(() => activeTab.value === 'other' ? otherWeekRepairs.value : baseWeekRepairs.value)

const sortedKanbanRepairs = computed(() => [...activeKanbanRepairs.value].sort((first, second) => {
  if (activeTab.value === 'base') {
    const firstIsInPoland = repairCountryCode(first) === 'PL'
    const secondIsInPoland = repairCountryCode(second) === 'PL'

    if (firstIsInPoland !== secondIsInPoland) {
      return firstIsInPoland ? -1 : 1
    }
  }

  return repairTimestamp(first) - repairTimestamp(second)
}))

const weeklyStats = computed(() => {
  const total = activeKanbanRepairs.value.length
  const completed = activeKanbanRepairs.value.filter((repair) => normalizeRepairStatus(repair.status) === 'done').length
  const location = activeKanbanRepairs.value.filter((repair) => {
    const status = normalizeRepairStatus(repair.status)
    return status !== 'IN_FIELD' && status !== 'done' && status !== 'cancelled'
  }).length

  return {
    total,
    location,
    completed,
    completionPercent: total ? Math.round((completed / total) * 100) : 0,
  }
})

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

const fieldRepairs = computed(() => uniqueRepairs([
  ...repairs.value,
  ...fieldAndUnassigned.value,
]).filter((repair) => normalizeRepairStatus(repair.status) === 'IN_FIELD' && repairMatchesSearch(repair)))

const selectedFieldRepairs = computed(() => fieldRepairs.value.filter((repair) => selectedFieldRepairIds.value.has(repair.id)))
const areAllFieldRepairsSelected = computed(() => (
  fieldRepairs.value.length > 0 &&
  fieldRepairs.value.every((repair) => selectedFieldRepairIds.value.has(repair.id))
))

const mapSourceRepairs = computed(() => uniqueRepairs([
  ...filteredSelectedWeekRepairs.value,
  ...fieldAndUnassigned.value,
]).filter((repair) => repairMatchesSearch(repair)))

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

  if (status === 'IN_FIELD') {
    return null
  }

  if (status === 'at_location') {
    return 'progress'
  }

  if (status === 'done') {
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

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function repairTimestamp(repair: Repair) {
  const timestamp = new Date(repair.plannedArrivalAt || '').getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function repairDateValue(repair: Repair) {
  const date = parseDateOnly(repair.plannedArrivalAt)
  return date ? dateValue(date) : ''
}

function isRepairInWeek(repair: Repair, week: RepairWeek) {
  const value = repairDateValue(repair)

  if (!value) {
    return true
  }

  return value >= week.start && value <= week.end
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

function isVisibleTabKey(value: unknown): value is TabKey {
  return value === 'base' || value === 'other' || value === 'field'
}

function readRepairsViewState(): RepairsViewState {
  try {
    const storedState = sessionStorage.getItem(REPAIRS_VIEW_STATE_KEY)

    if (!storedState) {
      return {}
    }

    const parsedState = JSON.parse(storedState) as RepairsViewState

    return {
      activeTab: isVisibleTabKey(parsedState.activeTab) ? parsedState.activeTab : undefined,
      selectedWeekKey: typeof parsedState.selectedWeekKey === 'string' ? parsedState.selectedWeekKey : undefined,
    }
  } catch {
    sessionStorage.removeItem(REPAIRS_VIEW_STATE_KEY)
    return {}
  }
}

function persistRepairsViewState() {
  try {
    sessionStorage.setItem(REPAIRS_VIEW_STATE_KEY, JSON.stringify({
      activeTab: activeTab.value,
      selectedWeekKey: selectedWeekKey.value,
    }))
  } catch {
    // Session storage can be unavailable in private modes; the view still works without persistence.
  }
}

function weekKey(week: RepairWeek) {
  return `${week.year}-${week.week}`
}

function selectDefaultWeek() {
  if (!weeks.value.length) {
    selectedWeekKey.value = ''
    return
  }

  const today = dateValue(new Date())
  const currentWeek = weeks.value.find((week) => week.start <= today && week.end >= today)
  const upcomingWeek = weeks.value.find((week) => week.start >= today)
  selectedWeekKey.value = weekKey(currentWeek || upcomingWeek || weeks.value[0])
}

function selectAdjacentWeek(offset: number) {
  const nextIndex = selectedWeekIndex.value + offset

  if (nextIndex < 0 || nextIndex >= weeks.value.length) {
    return
  }

  selectedWeekKey.value = weekKey(weeks.value[nextIndex])
}

function uniqueRepairs(items: Repair[]) {
  const repairsById = new Map<number, Repair>()
  items.forEach((repair) => repairsById.set(repair.id, repair))
  return Array.from(repairsById.values()).sort((first, second) => repairTimestamp(first) - repairTimestamp(second))
}

function createDraftFault(): DraftFault {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
    photos: [],
    photoError: '',
  }
}

function clearDraftFaultPhotoDrafts(faults = draftFaults.value) {
  faults.forEach((fault) => {
    fault.photos.forEach((photo) => URL.revokeObjectURL(photo.objectUrl))
  })
}

function resetCreateForm() {
  clearDraftFaultPhotoDrafts()
  Object.assign(createForm, {
    vehicleId: '',
    placeId: '',
    status: 'planned' as RepairStatus,
    arrivalAt: `${dateValue(new Date())}T08:00`,
    departureAt: '',
    description: '',
  })
  draftFaults.value = [createDraftFault()]
  createWizardStep.value = 0
  createMaxReachableStep.value = 0
  createDetailsError.value = false
  createResult.value = null
  createResultMessage.value = ''
  createdRepair.value = null
}

function validateCreateDetails() {
  const isValid = Boolean(createForm.vehicleId && createForm.placeId)
  createDetailsError.value = !isValid
  return isValid
}

function goToCreateFaultsStep() {
  if (!validateCreateDetails()) return
  createWizardStep.value = 1
  createMaxReachableStep.value = 1
}

function selectCreateWizardStep(step: number) {
  if (createResult.value || step < 0 || step > createMaxReachableStep.value) return
  if (step === 1 && !validateCreateDetails()) return
  createWizardStep.value = step
}

function returnToCreateFaults() {
  createResult.value = null
  createResultMessage.value = ''
  createWizardStep.value = 1
  createMaxReachableStep.value = 1
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function nullableDescription(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function addDraftFault() {
  if (!canCreateFaults.value) {
    return
  }

  draftFaults.value = [...draftFaults.value, createDraftFault()]
}

function removeDraftFault(id: string) {
  const removedFault = draftFaults.value.find((fault) => fault.id === id)
  if (removedFault) {
    clearDraftFaultPhotoDrafts([removedFault])
  }

  draftFaults.value = draftFaults.value.filter((fault) => fault.id !== id)

  if (!draftFaults.value.length) {
    draftFaults.value = [createDraftFault()]
  }
}

function validateRepairPhoto(file: File) {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return 'Dozwolone formaty: JPG, PNG, GIF i WEBP.'
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return 'Zdjęcie może mieć maksymalnie 20 MB.'
  }

  return null
}

function blurFileInput(input: HTMLInputElement) {
  window.requestAnimationFrame(() => {
    if (document.activeElement === input) {
      input.blur()
    }
  })
}

function shouldShowMobilePhotoMenu() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function closeDraftPhotoPickerMenu() {
  draftPhotoPickerFaultId.value = null
}

function openDraftFaultPhotoAdd(faultId: string) {
  if (isMutating.value || !canAddFaultPhotos.value) {
    return
  }

  if (shouldShowMobilePhotoMenu()) {
    draftPhotoPickerFaultId.value = faultId
    return
  }

  openDraftFaultGalleryPicker(faultId)
}

function chooseDraftPhotoSource(source: 'gallery' | 'camera') {
  const faultId = draftPhotoPickerFaultId.value

  if (!faultId) {
    return
  }

  if (source === 'camera') {
    openDraftFaultCameraPicker(faultId)
  } else {
    openDraftFaultGalleryPicker(faultId)
  }

  draftPhotoPickerFaultId.value = null
}

function openDraftFaultGalleryPicker(faultId: string) {
  if (isMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = draftFaultPhotoInput.value

  if (!input) {
    return
  }

  selectedDraftFaultPhotoInputId.value = faultId
  input.value = ''
  input.click()
  blurFileInput(input)
}

function openDraftFaultCameraPicker(faultId: string) {
  if (isMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = draftFaultCameraInput.value

  if (!input) {
    return
  }

  selectedDraftFaultPhotoInputId.value = faultId
  input.value = ''
  input.click()
  blurFileInput(input)
}

function handleDraftFaultPhotoInputSelection(event: Event) {
  const faultId = selectedDraftFaultPhotoInputId.value
  selectedDraftFaultPhotoInputId.value = null

  if (!faultId) {
    const input = event.target as HTMLInputElement
    input.value = ''
    return
  }

  handleDraftFaultPhotoSelection(faultId, event)
}

function handleDraftFaultPhotoSelection(faultId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const fault = draftFaults.value.find((item) => item.id === faultId)
  input.value = ''

  if (!fault) {
    return
  }

  if (!canAddFaultPhotos.value) {
    fault.photoError = 'Brak uprawnienia do dodawania zdjęć.'
    return
  }

  fault.photoError = ''

  files.forEach((file) => {
    const validationError = validateRepairPhoto(file)

    if (validationError) {
      fault.photoError = validationError
      return
    }

    fault.photos = [
      ...fault.photos,
      {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        objectUrl: URL.createObjectURL(file),
      },
    ]
  })
}

function removeDraftFaultPhoto(faultId: string, photoId: string) {
  const fault = draftFaults.value.find((item) => item.id === faultId)

  if (!fault) {
    return
  }

  const removedPhoto = fault.photos.find((photo) => photo.id === photoId)

  if (removedPhoto) {
    URL.revokeObjectURL(removedPhoto.objectUrl)
  }

  fault.photos = fault.photos.filter((photo) => photo.id !== photoId)
}

function openCreateModal() {
  if (!canCreateRepairs.value) {
    return
  }

  resetCreateForm()
  isCreateModalOpen.value = true
  void repairStore.loadDictionaries()
}

function closeCreateModal() {
  if (!isMutating.value) {
    clearDraftFaultPhotoDrafts()
    closeDraftPhotoPickerMenu()
    selectedDraftFaultPhotoInputId.value = null
    isCreateModalOpen.value = false
    createResult.value = null
    createResultMessage.value = ''
    createdRepair.value = null
  }
}

function openCreatedRepair() {
  const repair = createdRepair.value
  if (!repair) return
  closeCreateModal()
  openRepairDetails(repair)
}

function openRepairFromCreate(repair: Repair | null) {
  if (!repair) return
  closeCreateModal()
  openRepairDetails(repair)
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

function openRepairDetails(repair: Repair) {
  persistRepairsViewState()
  void router.push({ name: 'repair-detail', params: { id: repair.id } })
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
      <div class="notes">
        <span>Uwagi</span>
        <p>${escapeHtml(repair.description || 'Brak uwag.')}</p>
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

  if (!selectedWeekKey.value || !weeks.value.some((week) => weekKey(week) === selectedWeekKey.value)) {
    selectDefaultWeek()
  }
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

  if (!selectedWeekKey.value || !weeks.value.some((week) => weekKey(week) === selectedWeekKey.value)) {
    selectDefaultWeek()
  }
}

async function refreshAfterMutation() {
  await Promise.allSettled([
    loadRepairs({ silent: true }),
    fleetStore.loadFleetData({ silent: true }),
  ])
}

async function submitCreateRepair() {
  if (!canCreateRepairs.value) {
    return
  }

  if (!validateCreateDetails()) {
    createResult.value = null
    createWizardStep.value = 0
    return
  }

  createResult.value = null
  createResultMessage.value = ''
  isMutating.value = true

  try {
    const result = await repairStore.createRepairWithFaults({
      vehicleId: Number(createForm.vehicleId),
      placeId: Number(createForm.placeId),
      plannedArrivalAt: toIsoDateTime(createForm.arrivalAt),
      plannedDepartureAt: toIsoDateTime(createForm.departureAt),
      status: normalizeRepairStatus(createForm.status),
      description: nullableDescription(createForm.description),
    }, canCreateFaults.value
      ? draftFaults.value.map((fault) => ({
          description: fault.description,
          assignedMechanicId: null,
          photos: canAddFaultPhotos.value ? fault.photos.map((photo) => photo.file) : [],
        }))
      : [], { silent: true })

    await refreshAfterMutation()
    createdRepair.value = result.repair
    createResultMessage.value = result.photoUploadFailures
      ? `Naprawa została utworzona, ale nie udało się wysłać części zdjęć (${result.photoUploadFailures}).`
      : `Naprawa dla pojazdu ${repairVehicleLabel(result.repair)} została zapisana.`
    createResult.value = 'success'
    clearDraftFaultPhotoDrafts()
  } catch (error) {
    createResultMessage.value = getApiErrorMessage(error)
    createResult.value = 'error'
  } finally {
    isMutating.value = false
  }
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

watch([activeTab, selectedWeekKey], () => {
  persistRepairsViewState()
})

watch(fieldRepairs, (visibleRepairs) => {
  const visibleIds = new Set(visibleRepairs.map((repair) => repair.id))
  selectedFieldRepairIds.value = new Set(
    [...selectedFieldRepairIds.value].filter((repairId) => visibleIds.has(repairId)),
  )
  expandedFieldRepairIds.value = new Set(
    [...expandedFieldRepairIds.value].filter((repairId) => visibleIds.has(repairId)),
  )
})

watch([selectedWeekKey, mapRepairVehicles], () => {
  if (activeTab.value === 'map') {
    renderRepairMap()
  }
})

onMounted(async () => {
  await loadData()

  if (activeTab.value === 'map') {
    await initializeRepairMap()
  }
})

onBeforeUnmount(() => {
  clearRepairMarkers()
  clearDraftFaultPhotoDrafts()

})
</script>

<style scoped>
.repair-stat-tile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(var(--rw-app-border));
  border-radius: 1rem;
  background: rgb(var(--rw-app-panel));
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.repair-stat-icon {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(var(--rw-app-elevated));
  color: rgb(var(--rw-app-muted));
}

.repair-stat-label {
  overflow: hidden;
  color: rgb(var(--rw-app-muted));
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repair-stat-value {
  color: rgb(var(--rw-app-text));
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.5rem;
}
</style>

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
