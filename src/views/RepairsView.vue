<template>
  <div
    class="flex min-h-full w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden"
    :class="isKanbanTab ? 'xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:overflow-hidden' : ''"
  >
    <header class="flex w-full min-w-0 shrink-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Naprawy</h1>
      </div>

      <div class="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-end">
        <div class="flex min-w-0 max-w-full items-end gap-2">
          <button
            type="button"
            class="icon-button"
            :disabled="!canSelectPreviousWeek"
            aria-label="Poprzedni tydzień"
            @click="selectAdjacentWeek(-1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <AppSelect
            v-model="selectedWeekKey"
            class="min-w-0 flex-1 sm:w-72 sm:flex-none"
            label="Zakres tygodnia"
            :options="weekOptions"
            size="sm"
          />
          <button
            type="button"
            class="icon-button"
            :disabled="!canSelectNextWeek"
            aria-label="Następny tydzień"
            @click="selectAdjacentWeek(1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <AppButton size="sm" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          Dodaj nową naprawę
        </AppButton>
        <AppButton size="sm" variant="secondary" @click="openMechanicsModal">
          <Users class="h-4 w-4" />
          Mechanicy
        </AppButton>
      </div>
    </header>

    <AppSelect
      v-model="activeTab"
      class="md:hidden"
      label="Widok napraw"
      :options="tabOptions"
      size="sm"
    />

    <div class="hidden w-full min-w-0 shrink-0 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel md:flex">
      <button
        v-for="tab in visibleTabs"
        :key="tab.value"
        type="button"
        class="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
        :class="activeTab === tab.value ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-app-dark' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50'"
        @click="activeTab = tab.value"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>

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
        :class="dragOverColumn === column.key ? 'ring-2 ring-slate-300 dark:ring-app-muted' : ''"
        @dragenter.prevent="dragOverColumn = column.key"
        @dragover.prevent="dragOverColumn = column.key"
        @dragleave="dragOverColumn = null"
        @drop="dropRepairOnColumn(column)"
      >
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border">
          <div class="flex min-w-0 items-center gap-2">
            <component :is="column.icon" class="h-4 w-4 text-slate-400" />
            <h2 class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ column.label }}</h2>
          </div>
          <AppBadge>{{ column.repairs.length }}</AppBadge>
        </header>

        <div class="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
          <article
            v-for="repair in column.repairs"
            :key="repair.id"
            draggable="true"
            class="max-w-full min-w-0 cursor-grab overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 transition hover:bg-slate-50 active:cursor-grabbing dark:border-app-border dark:bg-app-dark dark:hover:bg-app-elevated"
            :class="draggedRepairId === repair.id ? 'opacity-20' : ''"
            @dragstart="startRepairDrag(repair, $event)"
            @drag="updateRepairDragPreview"
            @dragend="endRepairDrag"
            @click="openRepairDetails(repair)"
            >
              <RepairCardContent :repair="repair" show-place />
            </article>

          <div v-if="!column.repairs.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
            Przeciągnij tutaj naprawę, aby zmienić status.
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'field'" class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border">
        <div>
          <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Naprawy w terenie</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ selectedWeekLabel }}</p>
        </div>
        <AppBadge>{{ fieldRepairs.length }}</AppBadge>
      </header>

      <div class="grid gap-3 p-4 xl:grid-cols-3">
        <article
          v-for="repair in fieldRepairs"
          :key="repair.id"
          class="cursor-pointer rounded-2xl border border-slate-100 bg-white p-3 transition hover:bg-slate-50 dark:border-app-border dark:bg-app-dark dark:hover:bg-app-elevated"
          @click="openRepairDetails(repair)"
        >
          <RepairCardContent :repair="repair" show-place />
        </article>

        <div v-if="!fieldRepairs.length" class="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-app-border dark:text-slate-400 xl:col-span-3">
          Brak napraw w terenie.
        </div>
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

    <Teleport to="body">
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/55 p-3 sm:p-6"
        @click.self="closeCreateModal"
      >
        <form
          class="flex h-[calc(100dvh-1.5rem)] w-[min(74rem,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-2xl dark:border-app-border dark:bg-app-dark sm:h-[calc(100dvh-3rem)] sm:w-[min(74rem,calc(100vw-3rem))]"
          @submit.prevent="submitCreateRepair"
        >
          <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-app-border dark:bg-app-panel">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Dodaj nową naprawę</h2>
            </div>
            <button type="button" class="icon-button" aria-label="Zamknij modal" @click="closeCreateModal">
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto bg-slate-100/80 p-3 dark:bg-app-dark sm:p-4 xl:overflow-hidden">
            <div class="grid min-h-full gap-3 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
              <section class="self-start rounded-2xl border border-slate-300 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-panel">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Dane naprawy</h3>
                  </div>
                  <AppBadge>1</AppBadge>
                </div>

                <div class="space-y-2.5">
                  <AppSearchSelect v-model="createForm.vehicleId" label="Pojazd" placeholder="Wybierz pojazd" :options="vehicleOptions" size="sm" />
                  <AppSearchSelect v-model="createForm.placeId" label="Miejsce" placeholder="Wybierz miejsce" :options="placeOptions" size="sm" />
                  <AppSelect v-model="createForm.status" label="Status" :options="repairStatusOptions" size="sm" />
                  <AppDateTimePicker v-model="createForm.arrivalAt" label="Planowany przyjazd" default-time="08:00" size="sm" />
                  <AppDateTimePicker v-model="createForm.departureAt" label="Planowany wyjazd" default-time="16:00" size="sm" />
                  <label class="block">
                    <span class="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200">Uwagi</span>
                    <textarea
                      v-model="createForm.description"
                      class="min-h-16 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-app-border dark:bg-app-dark dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
                      placeholder="Uwagi do naprawy"
                    ></textarea>
                  </label>
                </div>
              </section>

              <section class="flex min-h-0 flex-col rounded-2xl border border-slate-300 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-panel xl:overflow-hidden">
                <div class="mb-3 flex shrink-0 items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Kolejka usterek</h3>
                  </div>
                  <AppBadge>{{ draftFaults.length }}</AppBadge>
                </div>

                <div class="max-h-[48dvh] min-h-0 space-y-2.5 overflow-y-auto pr-1 xl:max-h-none xl:flex-1">
                  <article
                    v-for="(fault, index) in draftFaults"
                    :key="fault.id"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm ring-1 ring-slate-200/70 dark:border-app-border dark:bg-app-dark dark:ring-white/5"
                  >
                    <div class="mb-2.5 flex items-center justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2">
                        <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-950 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-50">
                          {{ index + 1 }}
                        </span>
                      </div>
                      <button type="button" class="icon-button shrink-0" aria-label="Usuń usterkę" @click="removeDraftFault(fault.id)">
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                    <AppInput v-model="fault.description" label="Opis usterki" placeholder="Np. Wymiana klocków, światła, plandeka..." size="sm" />

                    <section class="mt-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-app-border dark:bg-app-panel">
                      <div class="mb-2 flex items-center justify-between gap-2">
                        <div class="flex min-w-0 items-center gap-2">
                          <ImagePlus class="h-4 w-4 shrink-0 text-slate-400" />
                          <h4 class="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">Zdjęcia</h4>
                        </div>
                        <AppBadge>{{ fault.photos.length }}</AppBadge>
                      </div>

                      <label class="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-app-border dark:bg-app-dark dark:text-slate-300 dark:hover:bg-app-elevated">
                        <input
                          type="file"
                          class="sr-only"
                          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                          multiple
                          :disabled="isMutating"
                          @change="handleDraftFaultPhotoSelection(fault.id, $event)"
                        />
                        <ImagePlus class="h-4 w-4" />
                        Dodaj zdjęcia
                      </label>

                      <p v-if="fault.photoError" class="mt-2 text-xs font-medium text-danger-600 dark:text-danger-400">
                        {{ fault.photoError }}
                      </p>

                      <div v-if="fault.photos.length" class="mt-2 grid max-h-28 grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2 overflow-y-auto pr-1">
                        <article
                          v-for="photo in fault.photos"
                          :key="photo.id"
                          class="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100 dark:border-app-border dark:bg-app-elevated"
                        >
                          <img :src="photo.objectUrl" :alt="photo.file.name" class="h-full w-full object-cover" />
                          <button
                            type="button"
                            class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950"
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
                    class="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-dark dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    @click="addDraftFault"
                  >
                    <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-app-border dark:bg-app-panel">
                      <Plus class="h-5 w-5" />
                    </span>
                    Dodaj kolejną usterkę
                  </button>
                </div>
              </section>
            </div>
          </div>

          <footer class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-app-border dark:bg-app-panel sm:flex-row sm:justify-end">
            <AppButton type="button" variant="secondary" @click="closeCreateModal">Anuluj</AppButton>
            <AppButton type="submit" :loading="isMutating">Zapisz naprawę</AppButton>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isMechanicsModalOpen"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-6"
        @click.self="closeMechanicsModal"
      >
        <section class="my-auto flex max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Mechanicy</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Zarządzanie listą osób dostępnych przy usterkach.</p>
            </div>
            <button type="button" class="icon-button" aria-label="Zamknij modal" @click="closeMechanicsModal">
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <form class="grid gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="submitMechanic">
              <AppInput v-model="mechanicForm.firstName" label="Imię" placeholder="Imię" size="sm" />
              <AppInput v-model="mechanicForm.lastName" label="Nazwisko" placeholder="Nazwisko" size="sm" />
              <div class="flex items-end gap-2">
                <AppButton type="submit" size="sm" :loading="isMutating">
                  <Check v-if="mechanicForm.id" class="h-4 w-4" />
                  <Plus v-else class="h-4 w-4" />
                  {{ mechanicForm.id ? 'Zapisz' : 'Dodaj' }}
                </AppButton>
                <AppButton v-if="mechanicForm.id" type="button" size="sm" variant="ghost" @click="resetMechanicForm">
                  Anuluj
                </AppButton>
              </div>
            </form>

            <div class="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-app-border">
              <div class="hidden grid-cols-[1fr_9rem] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 dark:border-app-border dark:bg-app-dark dark:text-slate-400 sm:grid">
                <span>Mechanik</span>
                <span class="text-right">Akcje</span>
              </div>

              <div
                v-for="mechanic in mechanics"
                :key="mechanic.id"
                class="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-app-border sm:grid-cols-[1fr_9rem] sm:items-center"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{{ mechanicDisplayName(mechanic) }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">ID: {{ mechanic.id }}</p>
                </div>
                <div class="flex flex-wrap justify-start gap-1 sm:justify-end">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    @click="editMechanic(mechanic)"
                  >
                    <SquarePen class="h-4 w-4" />
                    Edytuj
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    @click="mechanicToDelete = mechanic"
                  >
                    <Trash2 class="h-4 w-4" />
                    Usuń
                  </button>
                </div>
              </div>

              <div v-if="!mechanics.length" class="p-4 text-sm text-slate-500 dark:text-slate-400">
                Brak mechaników.
              </div>
            </div>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="mechanicToDelete"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="mechanicToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć mechanika?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz usunąć mechanika {{ mechanicDisplayName(mechanicToDelete) }}?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="mechanicToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isMutating" @click="confirmDeleteMechanic">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Columns3,
  ImagePlus,
  ListChecks,
  MapPinned,
  Percent,
  Plus,
  SquarePen,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Mechanic, Repair, RepairStatus, RepairWeek } from '@/types/repair'
import type { Vehicle } from '@/types/fleet'

type TabKey = 'repairs' | 'base' | 'other' | 'field' | 'map'
type RepairColumnKey = 'new' | 'progress' | 'done'

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
const router = useRouter()
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
const activeTab = ref<TabKey>('repairs')
const selectedWeekKey = ref('')
const draggedRepairId = ref<number | null>(null)
const draggedRepair = ref<Repair | null>(null)
const dragPreview = reactive({ x: 0, y: 0 })
const dragOverColumn = ref<RepairColumnKey | null>(null)
const collapsedRepairIds = ref<Set<number>>(new Set())
const nowTick = ref(Date.now())
const isCreateModalOpen = ref(false)
const isMechanicsModalOpen = ref(false)
const mechanicToDelete = ref<Mechanic | null>(null)
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
const draftFaults = ref<DraftFault[]>([createDraftFault()])
const mechanicForm = reactive({
  id: null as number | null,
  firstName: '',
  lastName: '',
})
let googleRef: any = null
let repairMap: any = null
let repairMarkers: any[] = []
let clockInterval: number | null = null

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024

const tabs: Array<{ value: TabKey; label: string; icon: Component }> = [
  { value: 'repairs', label: 'Naprawy', icon: Columns3 },
  { value: 'other', label: 'Pozostałe', icon: Columns3 },
  { value: 'field', label: 'W terenie', icon: Wrench },
  { value: 'map', label: 'Mapa', icon: MapPinned },
]

const visibleTabs = computed(() => tabs.filter((tab) => tab.value !== 'other'))

const tabOptions = computed<AppSelectOption[]>(() => visibleTabs.value.map((tab) => ({
  value: tab.value,
  label: tab.label,
})))

const repairStatusOptions: AppSelectOption[] = [
  { label: 'Nowa', value: 'new' },
  { label: 'Zaplanowana', value: 'planned' },
  { label: 'Gotowa do naprawy', value: 'ready_to_be_repaired' },
  { label: 'W lokalizacji', value: 'at_location' },
  { label: 'W terenie', value: 'IN_FIELD' },
  { label: 'Zakończona', value: 'done' },
  { label: 'Anulowana', value: 'cancelled' },
]

const weekOptions = computed<AppSelectOption[]>(() => weeks.value.map((week) => ({
  value: weekKey(week),
  label: `Tydzień ${week.week} (${formatDate(week.start)} - ${formatDate(week.end)})`,
})))

const selectedWeekIndex = computed(() => weeks.value.findIndex((week) => weekKey(week) === selectedWeekKey.value))
const canSelectPreviousWeek = computed(() => selectedWeekIndex.value > 0)
const canSelectNextWeek = computed(() => selectedWeekIndex.value >= 0 && selectedWeekIndex.value < weeks.value.length - 1)
const selectedWeek = computed(() => weeks.value[selectedWeekIndex.value] || weeks.value[0] || null)
const isKanbanTab = computed(() => activeTab.value === 'repairs')
const selectedWeekLabel = computed(() => selectedWeek.value
  ? `Tydzień ${selectedWeek.value.week}: ${formatDate(selectedWeek.value.start)} - ${formatDate(selectedWeek.value.end)}`
  : 'Brak danych tygodnia')

const kanbanLocationStatLabel = computed(() => activeTab.value === 'base' ? 'Na bazie' : 'Pozostałe')

const vehicleOptions = computed<AppSearchSelectOption[]>(() => fleetStore.apiVehicles.map((vehicle) => ({
  value: String(vehicle.id),
  label: vehicle.licensePlate,
  description: [vehicle.make, vehicle.vin].filter(Boolean).join(' • '),
  searchText: [vehicle.licensePlate, vehicle.make, vehicle.vin, vehicle.productionYear].filter(Boolean).join(' '),
})))

const placeOptions = computed<AppSearchSelectOption[]>(() => places.value.map((place) => ({
  value: String(place.id),
  label: place.name,
})))

const selectedWeekRepairs = computed(() => selectedWeek.value?.repairs?.length
  ? uniqueRepairs(selectedWeek.value.repairs)
  : uniqueRepairs(repairs.value.filter((repair) => selectedWeek.value ? isRepairInWeek(repair, selectedWeek.value) : true)))

const baseWeekRepairs = computed(() => selectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && isBaseRepair(repair)
)))

const otherWeekRepairs = computed(() => selectedWeekRepairs.value.filter((repair) => (
  normalizeRepairStatus(repair.status) !== 'IN_FIELD'
  && !isBaseRepair(repair)
)))

const activeKanbanRepairs = computed(() => selectedWeekRepairs.value.filter((repair) => normalizeRepairStatus(repair.status) !== 'IN_FIELD'))

const sortedKanbanRepairs = computed(() => [...activeKanbanRepairs.value].sort((first, second) => repairTimestamp(first) - repairTimestamp(second)))

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
]).filter((repair) => normalizeRepairStatus(repair.status) === 'IN_FIELD'))

const mapSourceRepairs = computed(() => uniqueRepairs([
  ...selectedWeekRepairs.value,
  ...fieldAndUnassigned.value,
]))

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
  },
  setup(props) {
    return () => {
      void nowTick.value
      const isExpanded = props.preview || !collapsedRepairIds.value.has(props.repair.id)
      const faults = props.repair.faults || []
      const totalFaults = props.repair.totalFaults || faults.length
      const isDone = normalizeRepairStatus(props.repair.status) === 'done'
      const departureCountdown = departureCountdownLabel(props.repair.plannedDepartureAt)

      return h('div', { class: 'min-w-0 max-w-full' }, [
        h('div', { class: 'flex items-start justify-between gap-2' }, [
          h('p', { class: 'min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50' }, repairVehicleLabel(props.repair)),
          h('div', { class: 'flex shrink-0 items-center gap-1.5' }, [
            isDone ? h(CircleCheck, { class: 'h-5 w-5 text-success-600 dark:text-success-400' }) : null,
            h(AppBadge, { variant: statusVariant(props.repair.status) }, () => statusLabel(props.repair.status)),
          ]),
        ]),
        h('div', { class: 'mt-2 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300' }, [
          props.showPlace ? h('p', { class: 'truncate' }, `Miejsce naprawy: ${repairPlaceLabel(props.repair)}`) : null,
          h('p', [
            h('span', { class: 'text-slate-500 dark:text-slate-400' }, 'Planowany przyjazd: '),
            h('span', { class: 'font-medium text-slate-700 dark:text-slate-200' }, formatDateTime(props.repair.plannedArrivalAt)),
          ]),
          h('p', { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1' }, [
            h('span', { class: 'min-w-0' }, [
              h('span', { class: 'text-slate-500 dark:text-slate-400' }, 'Planowany odjazd: '),
              h('span', { class: 'font-medium text-slate-700 dark:text-slate-200' }, formatDateTime(props.repair.plannedDepartureAt)),
            ]),
            h('span', { class: departureCountdown.className }, departureCountdown.label),
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
          ? h('div', { class: 'mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-app-border dark:bg-app-dark' }, faults.length
            ? faults.map((fault) => h('div', { key: fault.id, class: 'flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200' }, [
              fault.status === 'DONE'
                ? h(CircleCheck, { class: 'h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400' })
                : h('span', { class: 'h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 dark:border-app-muted' }),
              h('span', { class: 'truncate' }, fault.description),
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

function repairPlaceLabel(repair: Repair) {
  return repair.place?.name || repair.placeName || (repair.placeId ? `Miejsce #${repair.placeId}` : 'Brak miejsca')
}

function repairPlaceName(repair: Repair) {
  return repair.place?.name || repair.placeName || ''
}

function isBaseRepair(repair: Repair) {
  return repairPlaceName(repair).trim().toLocaleLowerCase('pl-PL') === 'baza'
}

function formatCompactDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }

  return `${minutes}min`
}

function departureCountdownLabel(value: string | null | undefined) {
  if (!value) {
    return {
      label: 'Brak odjazdu',
      className: 'rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-app-border dark:bg-app-elevated dark:text-slate-300',
    }
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return {
      label: '-',
      className: 'rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-app-border dark:bg-app-elevated dark:text-slate-300',
    }
  }

  const diff = timestamp - nowTick.value
  const isOverdue = diff < 0
  const label = isOverdue
    ? `${formatCompactDuration(Math.abs(diff))} po terminie`
    : `za ${formatCompactDuration(diff)}`

  return {
    label,
    className: isOverdue
      ? 'rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300'
      : 'rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-app-border dark:bg-app-elevated dark:text-slate-200',
  }
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

function handleDraftFaultPhotoSelection(faultId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const fault = draftFaults.value.find((item) => item.id === faultId)
  input.value = ''

  if (!fault) {
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
  resetCreateForm()
  isCreateModalOpen.value = true
  void repairStore.loadDictionaries()
}

function closeCreateModal() {
  if (!isMutating.value) {
    clearDraftFaultPhotoDrafts()
    isCreateModalOpen.value = false
  }
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
    isMechanicsModalOpen.value = false
    mechanicToDelete.value = null
    resetMechanicForm()
  }
}

function editMechanic(mechanic: Mechanic) {
  Object.assign(mechanicForm, {
    id: mechanic.id,
    firstName: mechanic.firstName || '',
    lastName: mechanic.lastName || '',
  })
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

    resetMechanicForm()
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
  void router.push({ name: 'repair-detail', params: { id: repair.id } })
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

function updateRepairDragPreview(event: DragEvent) {
  if (event.clientX || event.clientY) {
    dragPreview.x = event.clientX
    dragPreview.y = event.clientY
  }
}

function startRepairDrag(repair: Repair, event: DragEvent) {
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
  if (!createForm.vehicleId || !createForm.placeId) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak danych',
      message: 'Wybierz pojazd i miejsce naprawy.',
    })
    return
  }

  isMutating.value = true

  try {
    const createResult = await repairStore.createRepairWithFaults({
      vehicleId: Number(createForm.vehicleId),
      placeId: Number(createForm.placeId),
      plannedArrivalAt: toIsoDateTime(createForm.arrivalAt),
      plannedDepartureAt: toIsoDateTime(createForm.departureAt),
      status: normalizeRepairStatus(createForm.status),
      description: nullableDescription(createForm.description),
    }, draftFaults.value.map((fault) => ({
      description: fault.description,
      assignedMechanicId: null,
      photos: fault.photos.map((photo) => photo.file),
    })))

    await refreshAfterMutation()
    uiStore.addToast({
      type: createResult.photoUploadFailures ? 'warning' : 'success',
      title: 'Naprawa dodana',
      message: createResult.photoUploadFailures
        ? `Dodano naprawę dla ${repairVehicleLabel(createResult.repair)}, ale nie udało się wysłać zdjęć: ${createResult.photoUploadFailures}.`
        : `Dodano naprawę dla ${repairVehicleLabel(createResult.repair)}.`,
    })
    clearDraftFaultPhotoDrafts()
    isCreateModalOpen.value = false
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się dodać naprawy',
      message: 'Sprawdź dane naprawy i spróbuj ponownie.',
    })
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

watch([selectedWeekKey, mapRepairVehicles], () => {
  if (activeTab.value === 'map') {
    renderRepairMap()
  }
})

onMounted(async () => {
  clockInterval = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)

  await loadData()

  if (activeTab.value === 'map') {
    await initializeRepairMap()
  }
})

onBeforeUnmount(() => {
  clearRepairMarkers()
  clearDraftFaultPhotoDrafts()

  if (clockInterval) {
    window.clearInterval(clockInterval)
  }
})
</script>

<style scoped>
.icon-button {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  color: rgb(100 116 139);
  transition: background-color 150ms ease, color 150ms ease, opacity 150ms ease;
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.icon-button:hover:not(:disabled) {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

:global(.dark) .icon-button {
  border-color: #5a5a60;
  color: #b9bac2;
}

:global(.dark) .icon-button:hover:not(:disabled) {
  background: #48484d;
  color: rgb(248 250 252);
}

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
  transform: rotate(var(--rw-marker-heading));
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
