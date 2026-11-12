<template>
  <div class="min-w-0 space-y-5 md:min-h-full">
    <header class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <AppIconLink
          class="md:hidden"
          :to="{ name: 'repairs' }"
          label="Wróć do napraw"
        >
          <ArrowLeft class="h-4 w-4" />
        </AppIconLink>
        <h1 class="ui-page-title">Szczegóły naprawy</h1>
      </div>

      <div v-if="repair && !isLoading" class="flex flex-wrap items-center gap-2">
        <template v-if="infoEditMode">
          <AppButton size="sm" variant="ghost" :disabled="isMutating" @click="cancelInfoEdit">
            Anuluj
          </AppButton>
          <AppButton size="sm" :loading="isMutating" :disabled="!canUpdateRepairs" @click="updateRepairDetails">
            <Check class="h-4 w-4" />
            Zapisz
          </AppButton>
        </template>
        <template v-else>
          <AppButton size="sm" variant="secondary" :disabled="!canUpdateRepairs || isMutating" @click="openInfoEdit">
            <SquarePen class="h-4 w-4" />
            Edytuj
          </AppButton>
          <AppButton
            size="sm"
            variant="secondary"
            :loading="isMutating"
            :disabled="!canUpdateRepairs"
            :title="!canUpdateRepairs ? 'Brak uprawnienia: repairs.update' : undefined"
            @click="requestRepairStatusChange"
          >
            <CircleCheck class="h-4 w-4" />
            {{ normalizeRepairStatus(repair.status) === 'done' ? 'Otwórz naprawę' : 'Zamknij naprawę' }}
          </AppButton>
          <span ref="informationMenuAnchor" class="inline-flex">
            <AppIconButton label="Opcje naprawy" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isInformationMenuOpen" @click="isInformationMenuOpen = !isInformationMenuOpen">
              <Ellipsis class="h-4 w-4" />
            </AppIconButton>
          </span>
          <AppDropdown :open="isInformationMenuOpen" :anchor="informationMenuAnchor" role="menu" :match-width="false" content-class="min-w-40 p-1" @close="isInformationMenuOpen = false">
            <AppDropdownItem role="menuitem" class="text-danger-600 dark:text-danger-400" :disabled="!canDeleteRepairs || isMutating" @click="isInformationMenuOpen = false; repairToDelete = repair">
              <Trash2 class="h-4 w-4" />
              Usuń naprawę
            </AppDropdownItem>
          </AppDropdown>
        </template>
      </div>
    </header>

    <div v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie szczegółów naprawy...
    </div>

    <div v-else-if="!repair" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono naprawy.
    </div>

    <div v-else class="min-w-0 space-y-7 pb-5">
      <section class="repair-overview" aria-label="Informacje o naprawie">
        <dl class="repair-overview-grid grid gap-3" :class="infoEditMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'">
          <RepairInfoTile :icon="Hash" label="ID naprawy">
            <span class="tabular-nums">#{{ repair.id }}</span>
          </RepairInfoTile>
          <RepairInfoTile :icon="Truck" label="Pojazd">
            {{ repairVehicleLabel(repair) }}
          </RepairInfoTile>
          <RepairInfoTile :icon="ListDetails" label="Status">
            <AppSelect v-if="infoEditMode" v-model="editForm.status" aria-label="Status" :options="repairStatusOptions" size="sm" />
            <AppBadge v-else :variant="repairStatusVariant(repair.status)" class="max-w-full !whitespace-normal break-words">{{ repairStatusBadgeLabel(repair) }}</AppBadge>
          </RepairInfoTile>
          <RepairInfoTile :icon="Flag" label="Priorytet">
            <AppSwitch v-if="infoEditMode" v-model="editForm.urgent" label="Pilne" />
            <AppBadge v-else-if="repair.urgent" variant="error">Pilne</AppBadge>
            <AppBadge v-else variant="neutral">Niepilne</AppBadge>
          </RepairInfoTile>
          <RepairInfoTile :icon="UserRound" label="Utworzył">
            {{ repairCreatorName(repair) }}
          </RepairInfoTile>
          <RepairInfoTile :icon="CalendarPlus" label="Data utworzenia">
            {{ formatDateTime(repair.createdAt) }}
          </RepairInfoTile>
          <RepairInfoTile :icon="CalendarClock" label="Planowany przyjazd">
            <AppDateTimePicker v-if="infoEditMode" v-model="editForm.arrivalAt" aria-label="Planowany przyjazd" size="sm" default-time="08:00" />
            <span v-else class="tabular-nums">{{ formatDateTime(repair.plannedArrivalAt) }}</span>
          </RepairInfoTile>
          <RepairInfoTile :icon="CalendarDue" label="Planowany odjazd">
            <AppDateTimePicker v-if="infoEditMode" v-model="editForm.departureAt" aria-label="Planowany odjazd" size="sm" default-time="16:00" />
            <span v-else class="tabular-nums">{{ formatDateTime(repair.plannedDepartureAt) }}</span>
          </RepairInfoTile>
        </dl>
      </section>

        <template v-if="false">
        <AppCard title="Zdjęcia usterek" compact>
          <input
            ref="photoInput"
            type="file"
            class="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
            @change="handlePhotoSelection"
          />

          <p v-if="photoValidationError" class="mb-3 rounded-2xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-400 dark:bg-app-elevated dark:text-danger-400">
            {{ photoValidationError }}
          </p>

          <div class="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              class="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-app-border dark:bg-app-dark dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
              :disabled="isPhotoMutating"
              @click="openPhotoPicker"
            >
              <span class="flex items-center gap-2 text-sm font-medium">
                <LoaderCircle v-if="isPhotoMutating" class="h-4 w-4 animate-spin" />
                <ImagePlus v-else class="h-4 w-4" />
                {{ isPhotoMutating ? 'Przesyłanie...' : 'Dodaj zdjęcie' }}
              </span>
            </button>

            <article
              v-for="photo in repair?.photos || []"
              :key="photo.id"
              class="group overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-app-border dark:bg-app-dark"
            >
              <div class="relative h-28 bg-slate-100 dark:bg-app-elevated">
                <button
                  v-if="photoObjectUrls[photo.id]"
                  type="button"
                  class="block h-full w-full cursor-zoom-in overflow-hidden"
                  :aria-label="`Powiększ zdjęcie ${photo.originalFilename}`"
                  @click="photoPreview = photo"
                >
                  <img
                    :src="photoObjectUrls[photo.id]"
                    :alt="photo.originalFilename"
                    class="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                </button>
                <div v-else class="flex h-full items-center justify-center text-slate-400 dark:text-app-muted">
                  <ImageOff v-if="photoLoadFailures[photo.id]" class="h-5 w-5" />
                  <LoaderCircle v-else class="h-5 w-5 animate-spin" />
                </div>
                <button
                  type="button"
                  class="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-slate-950/65 text-white opacity-100 shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                  :disabled="isPhotoMutating"
                  aria-label="Usuń zdjęcie"
                  @click="photoToDelete = photo"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
              <div class="px-3 py-2">
                <p class="truncate text-xs font-semibold text-slate-950 dark:text-slate-50" :title="photo.originalFilename">
                  {{ photo.originalFilename }}
                </p>
                <p class="mt-0.5 text-[11px] text-slate-500 dark:text-app-muted">
                  {{ formatFileSize(photo.sizeBytes) }} · {{ photoUploaderName(photo) }}
                </p>
              </div>
            </article>
          </div>

          <p v-if="!repair?.photos.length" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Brak zdjęć dla tej naprawy.
          </p>
        </AppCard>
        </template>
      <section class="min-w-0" aria-label="Usterki">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <Wrench class="h-5 w-5 text-ui-icon" aria-hidden="true" />
            <h2 class="ui-section-title">Usterki</h2>
            <AppBadge v-if="canReadFaults">{{ repair.faults.length }}</AppBadge>
          </div>
          <AppButton
            v-if="canReadFaults"
            size="sm"
            variant="secondary"
            :disabled="!canCreateFaults"
            :title="!canCreateFaults ? 'Brak uprawnienia: faults.create' : undefined"
            @click="openAddFaultModal"
          >
            <Plus class="h-4 w-4" />
            Dodaj usterkę
          </AppButton>
        </div>

        <div v-if="!canReadFaults" class="ui-empty-state">
          Brak uprawnień do wyświetlania usterek.
        </div>
        <div v-else-if="!repair.faults.length" class="ui-empty-state">
          Brak usterek.
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="fault in repair.faults"
            :key="fault.id"
            class="min-w-0 overflow-hidden rounded-xl border border-l-4 border-ui-border bg-ui-surface shadow-soft"
            :class="[
              fault.status === 'DONE' ? 'border-l-success-500' : 'border-l-warning-400',
              { 'cursor-pointer': !isFaultEditing(fault.id) },
            ]"
            @click="!isFaultEditing(fault.id) && toggleFaultDetails(fault.id)"
          >
            <header
              class="grid min-w-0 items-start gap-x-2 gap-y-3 px-3 py-3 sm:gap-x-4 sm:px-4 sm:py-4"
              :class="isFaultEditing(fault.id) ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'"
            >
              <div v-if="isFaultEditing(fault.id)" class="grid min-w-0 gap-3 xl:grid-cols-2">
                <AppInput v-model="faultEditRows[fault.id].description" label="Opis usterki" size="sm" />
                <AppSearchSelect v-model="faultEditRows[fault.id].placeId" label="Planowane miejsce" placeholder="Do ustalenia" :options="placeOptions" size="sm" />
              </div>
              <div v-else class="flex min-w-0 items-start gap-1.5 self-center sm:gap-2">
                <button
                  type="button"
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-60"
                  :class="fault.status === 'DONE' ? 'text-success-600 dark:text-success-400' : 'text-ui-icon'"
                  :aria-label="fault.status === 'DONE' ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'"
                  :title="!canChangeFaultStatus ? 'Brak uprawnienia: faults.change_status' : (fault.status === 'DONE' ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione')"
                  :disabled="isMutating || !canChangeFaultStatus"
                  @click.stop="toggleFaultDone(fault)"
                >
                  <CircleCheck v-if="fault.status === 'DONE'" class="h-5 w-5" aria-hidden="true" />
                  <Circle v-else class="h-5 w-5" aria-hidden="true" />
                </button>
                <h3 class="min-w-0 self-center text-sm font-semibold leading-5 text-ui-text sm:text-base sm:leading-6">
                  <button
                    type="button"
                    class="max-w-full whitespace-pre-wrap break-words text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                    :aria-expanded="isFaultExpanded(fault.id)"
                    :aria-controls="isFaultExpanded(fault.id) ? 'repair-fault-photos-' + fault.id : undefined"
                    @click.stop="toggleFaultDetails(fault.id)"
                  >{{ fault.description }}</button>
                </h3>
              </div>

              <div
                class="flex items-center justify-end gap-1 self-start sm:gap-2"
                :class="{ 'max-[419px]:grid max-[419px]:grid-cols-[auto_auto] max-[419px]:gap-y-0': !isFaultEditing(fault.id) }"
              >
                <template v-if="!isFaultEditing(fault.id)">
                  <div class="flex h-8 items-center max-[419px]:col-span-2 max-[419px]:justify-end">
                    <AppBadge :variant="fault.status === 'DONE' ? 'success' : 'warning'" class="!px-1.5 sm:!px-2">
                      {{ fault.status === 'DONE' ? 'Wykonana' : 'Otwarta' }}
                    </AppBadge>
                  </div>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    class="!h-8 !gap-1 !px-1.5 sm:!px-2"
                    :aria-label="'Zdjęcia (' + (fault.photos?.length || 0) + ')'"
                    :aria-expanded="isFaultExpanded(fault.id)"
                    :aria-controls="isFaultExpanded(fault.id) ? 'repair-fault-photos-' + fault.id : undefined"
                    @click.stop="toggleFaultDetails(fault.id)"
                  >
                    <Photo class="h-4 w-4 shrink-0" />
                    <span class="hidden lg:inline">Zdjęcia</span>
                    <span class="text-xs tabular-nums">{{ fault.photos?.length || 0 }}</span>
                    <ChevronDown class="hidden h-3.5 w-3.5 transition-transform lg:block" :class="{ 'rotate-180': isFaultExpanded(fault.id) }" />
                  </AppButton>
                  <AppIconButton label="Opcje usterki" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="faultMenuId === fault.id" @click.stop="toggleFaultMenu(fault.id, $event)">
                    <Ellipsis class="h-4 w-4" />
                  </AppIconButton>
                  <AppDropdown :open="faultMenuId === fault.id" :anchor="faultMenuAnchor" role="menu" :match-width="false" content-class="min-w-40 p-1" @close="faultMenuId = null">
                    <AppDropdownItem role="menuitem" :disabled="isMutating || !canEditFaults" @click="faultMenuId = null; startFaultEdit(fault)">
                      <SquarePen class="h-4 w-4" />
                      Edytuj
                    </AppDropdownItem>
                    <AppDropdownItem role="menuitem" class="text-danger-600 dark:text-danger-400" :disabled="isMutating || !canDeleteFault(fault)" @click="faultMenuId = null; faultToDelete = fault">
                      <Trash2 class="h-4 w-4" />
                      Usuń
                    </AppDropdownItem>
                  </AppDropdown>
                </template>
                <template v-else>
                  <AppButton size="sm" variant="ghost" :disabled="isMutating" @click.stop="cancelFaultEdit">Anuluj</AppButton>
                  <AppButton size="sm" variant="secondary" :loading="isMutating" :disabled="!canEditFaults" @click.stop="saveFaultRow(fault)">
                    <Check class="h-4 w-4" />
                    Zapisz
                  </AppButton>
                  <AppIconButton label="Usuń usterkę" size="sm" variant="ghost" :disabled="isMutating || !canDeleteFault(fault)" @click.stop="faultToDelete = fault">
                    <Trash2 class="h-4 w-4 text-danger-600 dark:text-danger-400" />
                  </AppIconButton>
                </template>
              </div>
            </header>

            <div v-if="!isFaultEditing(fault.id)" class="flex flex-wrap gap-x-6 gap-y-1 border-t border-ui-divider bg-ui-muted/40 px-4 py-2.5 text-xs leading-5 text-ui-mutedText">
              <p class="min-w-0 break-words">
                Planowane miejsce: <span class="font-medium text-ui-text-secondary">{{ fault.placeName || 'Do ustalenia' }}</span>
              </p>
              <p class="min-w-0 break-words">
                Dodano: {{ fault.createdBy?.username || 'brak danych' }}
                <template v-if="fault.createdAt">
                  · <time :datetime="fault.createdAt">{{ formatDateTime(fault.createdAt) }}</time>
                </template>
              </p>
              <p v-if="fault.status === 'DONE'" class="min-w-0 break-words">
                Wykonano: {{ fault.repairedBy?.username || 'brak danych' }}
                <template v-if="fault.repairedAt">
                  · <time :datetime="fault.repairedAt">{{ formatDateTime(fault.repairedAt) }}</time>
                </template>
              </p>
            </div>

            <section v-if="isFaultExpanded(fault.id)" :id="'repair-fault-photos-' + fault.id" aria-label="Zdjęcia usterki" class="border-t border-ui-divider px-4 py-4">
              <div class="grid max-h-56 grid-cols-[repeat(auto-fill,minmax(6rem,8rem))] gap-2 overflow-y-auto">
                <button
                  type="button"
                  class="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-ui-border-strong bg-ui-muted p-2 text-center text-xs font-medium text-ui-mutedText transition hover:bg-ui-hover hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="isPhotoMutating || !canAddFaultPhotos"
                  :title="!canAddFaultPhotos ? 'Brak uprawnienia: fault_photos.add' : undefined"
                  @click.stop="openFaultPhotoAdd(fault.id)"
                >
                  <LoaderCircle v-if="isPhotoMutating" class="h-5 w-5 animate-spin" />
                  <ImagePlus v-else class="h-5 w-5" />
                  {{ isPhotoMutating ? 'Wysyłanie' : 'Dodaj zdjęcie' }}
                </button>
                <div
                  v-for="photo in fault.photos || []"
                  :key="photo.id"
                  class="relative aspect-square overflow-hidden rounded-lg border border-ui-border bg-ui-muted"
                >
                  <button
                    v-if="photoObjectUrls[photo.id]"
                    type="button"
                    class="block h-full w-full cursor-zoom-in"
                    :aria-label="'Powiększ zdjęcie ' + photo.originalFilename"
                    @click.stop="photoPreview = { ...photo, faultId: fault.id }"
                  >
                    <img :src="photoObjectUrls[photo.id]" :alt="photo.originalFilename" class="h-full w-full object-cover" />
                  </button>
                  <div v-else class="grid h-full place-items-center text-ui-mutedText">
                    <ImageOff v-if="photoLoadFailures[photo.id]" class="h-4 w-4" />
                    <LoaderCircle v-else class="h-4 w-4 animate-spin" />
                  </div>
                  <button
                    v-if="canDeleteFaultPhoto(photo)"
                    type="button"
                    class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950"
                    :disabled="isPhotoMutating"
                    aria-label="Usuń zdjęcie"
                    @click.stop="photoToDelete = { ...photo, faultId: fault.id }"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p v-if="!fault.photos?.length" class="mt-2 text-xs text-ui-mutedText">Brak zdjęć.</p>
              <p v-if="faultPhotoErrors[fault.id]" class="mt-2 text-xs font-medium text-danger-600 dark:text-danger-400">{{ faultPhotoErrors[fault.id] }}</p>
            </section>
          </article>
        </div>
      </section>
    </div>

    <AppModal
      :open="isAddFaultModalOpen"
      title="Dodaj usterkę"
      :description="`Usterka zostanie dopisana do naprawy #${repairId}.`"
      size="md"
      :busy="isMutating || isPhotoMutating"
      @close="closeAddFaultModal"
    >
          <div class="space-y-4">
            <AppInput v-model="newDetailFault.description" label="Usterka" placeholder="Opis usterki" />
            <AppSearchSelect v-model="newDetailFault.placeId" label="Planowane miejsce" placeholder="Do ustalenia" :options="placeOptions" />

            <section class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted p-3">
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <ImagePlus class="h-4 w-4 shrink-0 text-ui-icon" />
                  <h3 class="truncate ui-card-title">Zdjęcia do usterki</h3>
                </div>
                <AppBadge>{{ newFaultPhotoDrafts.length }}</AppBadge>
              </div>

              <button
                type="button"
                class="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--rw-radius-control)] border border-dashed border-ui-border-strong bg-ui-surface px-3 py-4 text-center text-sm font-medium text-ui-text-secondary transition hover:bg-ui-hover disabled:cursor-not-allowed disabled:bg-ui-disabled disabled:text-ui-disabled-text"
                :disabled="isMutating || isPhotoMutating || !canAddFaultPhotos"
                :title="!canAddFaultPhotos ? 'Brak uprawnienia: fault_photos.add' : undefined"
                @click="openNewFaultPhotoAdd"
              >
                <ImagePlus class="h-5 w-5" />
                Dodaj zdjęcia
              </button>

              <p v-if="newFaultPhotoError" class="mt-2 ui-error">
                {{ newFaultPhotoError }}
              </p>

              <div v-if="newFaultPhotoDrafts.length" class="mt-3 grid max-h-36 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2 overflow-y-auto pr-1">
                <article
                  v-for="draft in newFaultPhotoDrafts"
                  :key="draft.id"
                  class="group relative aspect-square overflow-hidden rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface"
                >
                  <img :src="draft.objectUrl" :alt="draft.file.name" class="h-full w-full object-cover" />
                  <button
                    type="button"
                    class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950"
                    aria-label="Usuń zdjęcie z dodawanej usterki"
                    @click="removeNewFaultPhotoDraft(draft.id)"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </article>
              </div>
            </section>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="isMutating || isPhotoMutating" @click="closeAddFaultModal">Anuluj</AppButton>
        <AppButton
          :loading="isMutating || isPhotoMutating"
          :disabled="!canCreateFaults"
          :title="!canCreateFaults ? 'Brak uprawnienia: faults.create' : undefined"
          @click="addFaultToDetail"
        >
          <Plus class="h-4 w-4" />
          Dodaj usterkę
        </AppButton>
      </template>
    </AppModal>

    <input
      ref="faultPhotoInput"
      type="file"
      class="repair-hidden-file-input"
      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
      multiple
      @change="handleFaultPhotoInputSelection"
    />

    <input
      ref="faultCameraInput"
      type="file"
      class="repair-hidden-file-input"
      accept="image/*"
      capture="environment"
      @change="handleFaultPhotoInputSelection"
    />

    <input
      ref="newFaultPhotoInput"
      type="file"
      class="repair-hidden-file-input"
      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
      multiple
      @change="handleNewFaultPhotoSelection"
    />

    <input
      ref="newFaultCameraInput"
      type="file"
      class="repair-hidden-file-input"
      accept="image/*"
      capture="environment"
      @change="handleNewFaultPhotoSelection"
    />

  <Teleport :to="workspacePortal">
      <div
        v-if="photoPickerMenu"
        class="fixed inset-0 z-[360] flex items-end justify-center bg-transparent p-3 md:hidden"
        @click.self="closePhotoPickerMenu"
      >
        <section class="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-app-border dark:bg-app-panel">
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border">
            <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">Dodaj zdjecie</p>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
              aria-label="Zamknij wybĂłr zdjÄ™cia"
              @click="closePhotoPickerMenu"
            >
              <X class="h-4 w-4" />
            </button>
          </header>
          <div class="grid gap-2 p-3">
            <button
              type="button"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-app-border dark:bg-app-dark dark:text-slate-100 dark:hover:bg-app-elevated"
              @click="choosePhotoSource('gallery')"
            >
              <ImagePlus class="h-5 w-5 text-slate-400" />
              Wybierz z galerii
            </button>
            <button
              type="button"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-app-border dark:bg-app-dark dark:text-slate-100 dark:hover:bg-app-elevated"
              @click="choosePhotoSource('camera')"
            >
              <Camera class="h-5 w-5 text-slate-400" />
              Zrob zdjecie
            </button>
          </div>
        </section>
      </div>
    </Teleport>

  <Teleport :to="workspacePortal">
      <div
        v-if="photoPreview && photoObjectUrls[photoPreview.id]"
        class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
        @click.self="photoPreview = null"
      >
        <section class="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-app-panel shadow-2xl">
          <header class="flex shrink-0 items-center justify-between gap-3 border-b border-app-border px-3 py-2.5 sm:px-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-50">{{ photoPreview.originalFilename }}</p>
              <p class="mt-0.5 text-xs text-app-muted">
                {{ formatFileSize(photoPreview.sizeBytes) }} · {{ photoUploaderName(photoPreview) }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-app-elevated hover:text-white"
              aria-label="Zamknij podgląd zdjęcia"
              @click="photoPreview = null"
            >
              <X class="h-5 w-5" />
            </button>
          </header>
          <div class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
            <img
              :src="photoObjectUrls[photoPreview.id]"
              :alt="photoPreview.originalFilename"
              class="max-h-[calc(100vh-8rem)] max-w-full object-contain"
            />
          </div>
        </section>
      </div>
    </Teleport>

    <AppConfirmModal
      :open="Boolean(photoToDelete)"
      title="Usunąć zdjęcie?"
      :description="photoToDelete ? `Czy na pewno chcesz usunąć ${photoToDelete.originalFilename}?` : undefined"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="isPhotoMutating"
      :confirm-disabled="Boolean(photoToDelete && !canDeleteFaultPhoto(photoToDelete))"
      @close="photoToDelete = null"
      @confirm="confirmDeletePhoto"
    />


    <AppConfirmModal
      :open="Boolean(repairStatusAction && repair)"
      :title="repairStatusAction === 'close' ? 'Zamknąć naprawę?' : 'Otworzyć naprawę?'"
      :description="repairStatusAction === 'close' ? 'Czy chcesz zamknąć naprawę?' : 'Czy chcesz ponownie otworzyć naprawę i ustawić status W trakcie?'"
      :confirm-label="repairStatusAction === 'close' ? 'Zamknij naprawę' : 'Otwórz naprawę'"
      :busy="isMutating"
      @close="repairStatusAction = null"
      @confirm="confirmRepairStatusChange"
    />

    <AppConfirmModal
      :open="Boolean(faultToComplete)"
      title="Zamknąć usterkę?"
      description="Czy chcesz oznaczyć tę usterkę jako wykonaną?"
      confirm-label="Zamknij usterkę"
      :busy="isMutating"
      :confirm-disabled="!canChangeFaultStatus"
      @close="faultToComplete = null"
      @confirm="confirmCompleteFault"
    />

    <AppConfirmModal
      :open="Boolean(faultToReopen)"
      title="Cofnąć wykonanie usterki?"
      description="Czy na pewno chcesz cofnąć wykonanie tej usterki?"
      confirm-label="Cofnij wykonanie"
      :busy="isMutating"
      :confirm-disabled="!canChangeFaultStatus"
      @close="faultToReopen = null"
      @confirm="confirmReopenFault"
    />

    <AppConfirmModal
      :open="Boolean(faultToDelete)"
      title="Usunąć usterkę?"
      description="Czy na pewno chcesz usunąć tę usterkę?"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="isMutating"
      :confirm-disabled="Boolean(faultToDelete && !canDeleteFault(faultToDelete))"
      @close="faultToDelete = null"
      @confirm="confirmDeleteFault"
    />

    <AppConfirmModal
      :open="Boolean(repairToDelete)"
      title="Usunąć naprawę?"
      :description="repairToDelete ? `Ta operacja usunie naprawę dla pojazdu ${repairVehicleLabel(repairToDelete)}.` : undefined"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="isMutating"
      :confirm-disabled="!canDeleteRepairs"
      @close="repairToDelete = null"
      @confirm="confirmDeleteRepair"
    />
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceActive, useWorkspaceDirty, useWorkspacePolling, useWorkspaceTitle } from '@/composables/useWorkspace'
const workspaceActive = useWorkspaceActive()
import { useWorkspacePortal } from '@/composables/useWorkspace'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft as ArrowLeft,
  IconCalendarDue as CalendarDue,
  IconCalendarPlus as CalendarPlus,
  IconCalendarTime as CalendarClock,
  IconCamera as Camera,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
  IconDots as Ellipsis,
  IconCircle as Circle,
  IconCircleCheck as CircleCheck,
  IconFileText as FileText,
  IconPhoto as Photo,
  IconPhotoOff as ImageOff,
  IconPhotoPlus as ImagePlus,
  IconFlag as Flag,
  IconHash as Hash,
  IconListDetails as ListDetails,
  IconLoader2 as LoaderCircle,
  IconPlus as Plus,
  IconEdit as SquarePen,
  IconTrash as Trash2,
  IconTruck as Truck,
  IconUser as UserRound,
  IconTool as Wrench,
  IconX as X,
} from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import RepairInfoTile from '@/components/repairs/RepairInfoTile.vue'
import { normalizeRepairStatus, repairStatusBadgeLabel, repairStatusOptions, repairStatusVariant } from '@/utils/repairPresentation'
import { repairService } from '@/services/repairService'
import { useAuthStore } from '@/stores/authStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceTabsStore } from '@/stores/workspaceTabsStore'
import type { Repair, RepairFault, RepairFaultPhoto, RepairPhoto, RepairStatus } from '@/types/repair'

interface NewFaultPhotoDraft {
  id: string
  file: File
  objectUrl: string
}

type PhotoPickerMenu =
  | { target: 'fault'; faultId: number }
  | { target: 'new' }

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const repairStore = useRepairStore()
const workspace = useWorkspaceTabsStore()
const {
  repairDetailsById,
  places,
  isMutating,
  isPhotoMutating,
} = storeToRefs(repairStore)
const repairToDelete = ref<Repair | null>(null)
const isLoading = ref(false)
const repairStatusAction = ref<'close' | 'open' | null>(null)
const faultToComplete = ref<RepairFault | null>(null)
const faultToReopen = ref<RepairFault | null>(null)
const faultToDelete = ref<RepairFault | null>(null)
const faultsEditMode = ref(false)
const editingFaultId = ref<number | null>(null)

const isAddFaultModalOpen = ref(false)
const infoEditMode = ref(false)
const informationMenuAnchor = ref<HTMLElement | null>(null)
const isInformationMenuOpen = ref(false)
const faultMenuAnchor = ref<HTMLElement | null>(null)
const faultMenuId = ref<number | null>(null)
function toggleFaultMenu(faultId: number, event: MouseEvent) {
  faultMenuAnchor.value = event.currentTarget as HTMLElement
  faultMenuId.value = faultMenuId.value === faultId ? null : faultId
}
const photoInput = ref<HTMLInputElement | null>(null)
const faultPhotoInput = ref<HTMLInputElement | null>(null)
const faultCameraInput = ref<HTMLInputElement | null>(null)
const newFaultPhotoInput = ref<HTMLInputElement | null>(null)
const newFaultCameraInput = ref<HTMLInputElement | null>(null)
const selectedFaultPhotoInputId = ref<number | null>(null)
const photoPickerMenu = ref<PhotoPickerMenu | null>(null)
const photoToDelete = ref<RepairFaultPhoto | null>(null)
const photoPreview = ref<RepairFaultPhoto | null>(null)

const photoValidationError = ref('')
const photoObjectUrls = reactive<Record<number, string>>({})
const photoLoadFailures = reactive<Record<number, boolean>>({})
const pendingPhotoLoads = new Map<number, symbol>()
let photoLoadErrorShown = false
const newDetailFault = reactive({ description: '', placeId: '' })
const newFaultPhotoDrafts = ref<NewFaultPhotoDraft[]>([])
const newFaultPhotoError = ref('')
const faultEditRows = reactive<Record<number, { description: string; placeId: string }>>({})

const expandedFaultIds = ref<Set<number>>(new Set())

const faultPhotoErrors = reactive<Record<number, string>>({})
const editForm = reactive({
  status: 'new' as RepairStatus,
  initialStatus: 'new' as RepairStatus,
  urgent: false,
  arrivalAt: '',
  departureAt: '',
})
const repairId = computed(() => String(route.params.id || ''))
const repair = computed(() => repairDetailsById.value[repairId.value] || null)
useWorkspaceTitle(computed(() => {
  const plate = repair.value?.vehicle?.licensePlate || repair.value?.vehicleLicensePlate
  return plate ? `Naprawa - ${plate}` : null
}))
const allFaultPhotos = computed(() => (repair.value?.faults || []).flatMap((fault) => fault.photos || []))
const currentUserId = computed(() => Number(authStore.user?.id ?? authStore.user?.userId ?? authStore.user?.uid))
const canUpdateRepairs = computed(() => hasPermission('repairs.update'))
const canDeleteRepairs = computed(() => hasPermission('repairs.delete'))
const canReadFaults = computed(() => hasPermission('faults.read'))
const canCreateFaults = computed(() => hasPermission('faults.create'))
const canEditFaults = computed(() => hasPermission('faults.edit_any'))
const canChangeFaultStatus = computed(() => hasPermission('faults.change_status'))
const canDeleteAnyFaults = computed(() => hasPermission('faults.delete_any'))


const canAddFaultPhotos = computed(() => hasPermission('fault_photos.add'))
const canDeleteAnyFaultPhotos = computed(() => hasPermission('fault_photos.delete_any'))

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024


const placeOptions = computed<AppSearchSelectOption[]>(() => [{ value: '', label: 'Do ustalenia' }, ...places.value.map((place) => ({
  value: String(place.id),
  label: place.name,
}))])


function repairVehicleLabel(value: Repair) {
  return value.vehicle?.licensePlate || value.vehicleLicensePlate || 'Pojazd #' + value.vehicleId
}

function repairCreatorName(value: Repair) {
  return value.createdBy?.username || value.createdByUsername || (value.createdBy?.id ? `Użytkownik #${value.createdBy.id}` : '-')
}

function photoUploaderName(photo: RepairPhoto) {
  return photo.uploadedBy?.username || (photo.uploadedBy?.id ? `Użytkownik #${photo.uploadedBy.id}` : 'Użytkownik')
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`
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

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function isCurrentUser(ownerId: number | string | null | undefined) {
  const normalizedOwnerId = Number(ownerId)
  return Number.isFinite(currentUserId.value) && Number.isFinite(normalizedOwnerId) && currentUserId.value === normalizedOwnerId
}

function canDeleteFault(fault: RepairFault | null | undefined) {
  return Boolean(fault) && (canDeleteAnyFaults.value || isCurrentUser(fault?.createdBy?.id))
}



function canDeleteFaultPhoto(photo: RepairFaultPhoto | null | undefined) {
  return Boolean(photo) && (canDeleteAnyFaultPhotos.value || isCurrentUser(photo?.uploadedBy?.id))
}

function openPhotoPicker() {
  photoValidationError.value = ''
  photoInput.value?.click()
}

async function handlePhotoSelection(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !repair.value) {
    return
  }

  const validationError = validateRepairPhoto(file)

  if (validationError) {
    photoValidationError.value = validationError
    return
  }

  photoValidationError.value = ''

  try {
    const photo = await repairStore.uploadRepairPhoto(repair.value.id, file)
    await loadPhotoObjectUrl(photo)
    uiStore.addToast({
      type: 'success',
      title: 'Zdjęcie dodane',
      message: 'Zdjęcie zostało dodane do naprawy.',
    })
  } catch {
    // Global API interceptor shows the backend error, including HTTP 413.
  }
}

function revokePhotoObjectUrl(photoId: number) {
  pendingPhotoLoads.delete(photoId)

  if (photoPreview.value?.id === photoId) {
    photoPreview.value = null
  }

  if (photoObjectUrls[photoId]) {
    URL.revokeObjectURL(photoObjectUrls[photoId])
    delete photoObjectUrls[photoId]
  }

  delete photoLoadFailures[photoId]
}

function revokeAllPhotoObjectUrls() {
  pendingPhotoLoads.clear()
  Object.keys(photoObjectUrls).forEach((photoId) => revokePhotoObjectUrl(Number(photoId)))
  Object.keys(photoLoadFailures).forEach((photoId) => delete photoLoadFailures[Number(photoId)])
}

async function loadPhotoObjectUrl(photo: RepairPhoto) {
  if (photoObjectUrls[photo.id] || pendingPhotoLoads.has(photo.id)) {
    return
  }

  const requestToken = Symbol(`repair-photo-${photo.id}`)
  pendingPhotoLoads.set(photo.id, requestToken)
  delete photoLoadFailures[photo.id]

  try {
    const objectUrl = await repairService.loadRepairFaultPhoto(photo, { silent: true })
    const isCurrentRequest = pendingPhotoLoads.get(photo.id) === requestToken
    const photoStillExists = allFaultPhotos.value.some((item) => item.id === photo.id)

    if (!isCurrentRequest || !photoStillExists) {
      URL.revokeObjectURL(objectUrl)
      return
    }

    photoObjectUrls[photo.id] = objectUrl
  } catch {
    if (pendingPhotoLoads.get(photo.id) === requestToken) {
      photoLoadFailures[photo.id] = true

      if (!photoLoadErrorShown) {
        photoLoadErrorShown = true
        uiStore.addToast({
          type: 'error',
          title: 'Nie udało się wczytać zdjęcia',
          message: 'Odśwież widok i spróbuj ponownie.',
        })
      }
    }
  } finally {
    if (pendingPhotoLoads.get(photo.id) === requestToken) {
      pendingPhotoLoads.delete(photo.id)
    }
  }
}

function syncPhotoObjectUrls(photos: RepairPhoto[]) {
  const photoIds = new Set(photos.map((photo) => photo.id))

  Object.keys(photoObjectUrls).forEach((photoId) => {
    const id = Number(photoId)

    if (!photoIds.has(id)) {
      revokePhotoObjectUrl(id)
    }
  })

  pendingPhotoLoads.forEach((_token, photoId) => {
    if (!photoIds.has(photoId)) {
      pendingPhotoLoads.delete(photoId)
    }
  })

  photos.forEach((photo) => void loadPhotoObjectUrl(photo))
}

async function confirmDeletePhoto() {
  if (!repair.value || !photoToDelete.value) {
    return
  }

  const photo = photoToDelete.value

  if (!canDeleteFaultPhoto(photo)) {
    return
  }

  try {
    if (!photo.faultId) {
      return
    }

    await repairStore.deleteRepairFaultPhoto(repair.value.id, photo.faultId, photo.id)
    revokePhotoObjectUrl(photo.id)
    photoToDelete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Zdjęcie usunięte',
      message: 'Zdjęcie zostało usunięte z naprawy.',
    })
  } catch {
    // Keep the photo and confirmation open; the API interceptor reports the error.
  }
}

function handlePreviewKeydown(event: KeyboardEvent) {
  if (!workspaceActive.value) return
  if (event.key === 'Escape' && photoPreview.value) {
    photoPreview.value = null
  }
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

function dateTimeInputValue(value: string | null | undefined, fallbackTime: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|\s)(\d{2}:\d{2})/)
    return match ? `${match[1]}T${match[2]}` : ''
  }

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const timePart = value ? [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':') : fallbackTime

  return `${datePart}T${timePart || fallbackTime}`
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function placeIdValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== '' ? parsed : null
}

function resetEditForm(value: Repair) {
  Object.assign(editForm, {
    status: normalizeRepairStatus(value.status),
    initialStatus: normalizeRepairStatus(value.status),
    urgent: Boolean(value.urgent),
    arrivalAt: dateTimeInputValue(value.plannedArrivalAt, '08:00'),
    departureAt: dateTimeInputValue(value.plannedDepartureAt, '16:00'),
  })
}

function openInfoEdit() {
  isInformationMenuOpen.value = false
  if (!repair.value || !canUpdateRepairs.value) {
    return
  }

  resetEditForm(repair.value)
  infoEditMode.value = true
}

function cancelInfoEdit() {
  if (!repair.value || isMutating.value) {
    return
  }

  resetEditForm(repair.value)
  infoEditMode.value = false
}

function showMutationError(title: string, message: string) {
  uiStore.addToast({
    type: 'error',
    title,
    message,
  })
}

function syncFaultEditRows(faults: RepairFault[]) {
  const activeIds = new Set(faults.map((fault) => fault.id))

  Object.keys(faultEditRows).forEach((id) => {
    if (!activeIds.has(Number(id))) {
      delete faultEditRows[Number(id)]
    }
  })

  faults.forEach((fault) => {
    faultEditRows[fault.id] = {
      description: fault.description,
      placeId: String(fault.placeId ?? ''),
    }
  })
}

function faultHasPhotos(fault: RepairFault) {
  return (fault.photos || []).length > 0
}

function shouldAutoExpandFault(fault: RepairFault) {
  return fault.status !== 'DONE' && faultHasPhotos(fault)
}


function syncFaultExpandedRows(faults: RepairFault[], applyDefaults = false) {
  const activeIds = new Set(faults.map((fault) => fault.id))
  const nextIds = new Set(Array.from(expandedFaultIds.value).filter((id) => activeIds.has(id)))

  if (applyDefaults) {
    faults.forEach((fault) => {
      if (shouldAutoExpandFault(fault)) {
        nextIds.add(fault.id)
      }
    })
  }

  expandedFaultIds.value = nextIds
}


function isFaultEditing(faultId: number) {
  return editingFaultId.value === faultId
}

function startFaultEdit(fault: RepairFault) {
  if (!canEditFaults.value) {
    return
  }

  faultEditRows[fault.id] = {
    description: fault.description,
    placeId: String(fault.placeId ?? ''),
  }
  editingFaultId.value = fault.id
}

function cancelFaultEdit() {
  if (!repair.value || isMutating.value) {
    return
  }

  syncFaultEditRows(repair.value.faults || [])
  editingFaultId.value = null
}

function clearNewFaultPhotoDrafts() {
  newFaultPhotoDrafts.value.forEach((draft) => URL.revokeObjectURL(draft.objectUrl))
  newFaultPhotoDrafts.value = []
}

function openAddFaultModal() {
  if (!canCreateFaults.value) {
    return
  }

  newDetailFault.description = ''
  newDetailFault.placeId = ''
  newFaultPhotoError.value = ''
  clearNewFaultPhotoDrafts()
  isAddFaultModalOpen.value = true
}

function closeAddFaultModal() {
  if (isMutating.value || isPhotoMutating.value) {
    return
  }

  isAddFaultModalOpen.value = false
  newFaultPhotoError.value = ''
  clearNewFaultPhotoDrafts()
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

function closePhotoPickerMenu() {
  photoPickerMenu.value = null
}

function openFaultPhotoAdd(faultId: number) {
  if (isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  if (shouldShowMobilePhotoMenu()) {
    photoPickerMenu.value = { target: 'fault', faultId }
    return
  }

  openFaultPhotoPicker(faultId)
}

function openNewFaultPhotoAdd() {
  if (isMutating.value || isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  if (shouldShowMobilePhotoMenu()) {
    photoPickerMenu.value = { target: 'new' }
    return
  }

  openNewFaultPhotoPicker()
}

function choosePhotoSource(source: 'gallery' | 'camera') {
  const menu = photoPickerMenu.value

  if (!menu) {
    return
  }

  if (menu.target === 'fault') {
    if (source === 'camera') {
      openFaultCameraPicker(menu.faultId)
    } else {
      openFaultPhotoPicker(menu.faultId)
    }
  } else if (source === 'camera') {
    openNewFaultCameraPicker()
  } else {
    openNewFaultPhotoPicker()
  }

  photoPickerMenu.value = null
}

function openFaultPhotoPicker(faultId: number) {
  if (isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = faultPhotoInput.value

  if (!input) {
    return
  }

  selectedFaultPhotoInputId.value = faultId
  input.value = ''
  input.click()
  blurFileInput(input)
}

function openFaultCameraPicker(faultId: number) {
  if (isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = faultCameraInput.value

  if (!input) {
    return
  }

  selectedFaultPhotoInputId.value = faultId
  input.value = ''
  input.click()
  blurFileInput(input)
}

function openNewFaultPhotoPicker() {
  if (isMutating.value || isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = newFaultPhotoInput.value

  if (!input) {
    return
  }

  input.value = ''
  input.click()
  blurFileInput(input)
}

function openNewFaultCameraPicker() {
  if (isMutating.value || isPhotoMutating.value || !canAddFaultPhotos.value) {
    return
  }

  const input = newFaultCameraInput.value

  if (!input) {
    return
  }

  input.value = ''
  input.click()
  blurFileInput(input)
}

function handleNewFaultPhotoSelection(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  newFaultPhotoError.value = ''

  if (!canAddFaultPhotos.value) {
    return
  }

  files.forEach((file) => {
    const validationError = validateRepairPhoto(file)

    if (validationError) {
      newFaultPhotoError.value = validationError
      return
    }

    newFaultPhotoDrafts.value = [
      ...newFaultPhotoDrafts.value,
      {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        objectUrl: URL.createObjectURL(file),
      },
    ]
  })
}

async function handleFaultPhotoInputSelection(event: Event) {
  const faultId = selectedFaultPhotoInputId.value
  selectedFaultPhotoInputId.value = null

  if (!faultId) {
    const input = event.target as HTMLInputElement
    input.value = ''
    return
  }

  await handleFaultPhotoSelection(faultId, event)
}

function removeNewFaultPhotoDraft(draftId: string) {
  const draft = newFaultPhotoDrafts.value.find((item) => item.id === draftId)

  if (draft) {
    URL.revokeObjectURL(draft.objectUrl)
  }

  newFaultPhotoDrafts.value = newFaultPhotoDrafts.value.filter((item) => item.id !== draftId)
}

function isFaultExpanded(faultId: number) {
  return expandedFaultIds.value.has(faultId)
}






function toggleFaultDetails(faultId: number) {
  const nextIds = new Set(expandedFaultIds.value)
  const willExpand = !nextIds.has(faultId)

  if (!willExpand) {
    nextIds.delete(faultId)
  } else {
    nextIds.add(faultId)
  }

  expandedFaultIds.value = nextIds
}






async function handleFaultPhotoSelection(faultId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''

  if (!repair.value || !files.length || !canAddFaultPhotos.value) return

  delete faultPhotoErrors[faultId]

  for (const file of files) {
    const validationError = validateRepairPhoto(file)

    if (validationError) {
      faultPhotoErrors[faultId] = validationError
      continue
    }

    try {
      const photo = await repairStore.uploadRepairFaultPhoto(repair.value.id, faultId, file)
      await loadPhotoObjectUrl(photo)
      const nextFault = repair.value.faults.find((item) => item.id === faultId)

      if (nextFault && shouldAutoExpandFault(nextFault)) {
        expandedFaultIds.value = new Set([...expandedFaultIds.value, faultId])
      }
      uiStore.addToast({
        type: 'success',
        title: 'Zdjęcie dodane',
        message: 'Zdjęcie zostało dodane do usterki.',
      })
    } catch {
      // Global API interceptor shows backend errors, including 413.
    }
  }
}

function clearFaultLocalData(faultId: number) {
  const fault = repair.value?.faults.find((item) => item.id === faultId)
  ;(fault?.photos || []).forEach((photo) => revokePhotoObjectUrl(photo.id))
  delete faultPhotoErrors[faultId]

  if (editingFaultId.value === faultId) {
    editingFaultId.value = null
  }

  if (expandedFaultIds.value.has(faultId)) {
    const nextIds = new Set(expandedFaultIds.value)
    nextIds.delete(faultId)
    expandedFaultIds.value = nextIds
  }

}

function openFaultsEdit() {
  if (!repair.value || !canEditFaults.value) {
    return
  }

  syncFaultEditRows(repair.value.faults || [])
  faultsEditMode.value = true
}

function cancelFaultsEdit() {
  if (!repair.value || isMutating.value) {
    return
  }

  syncFaultEditRows(repair.value.faults || [])
  faultsEditMode.value = false
}

function hasOpenFaults(value: Repair) {
  const faults = value.faults || []

  if (faults.length) {
    return faults.some((fault) => fault.status !== 'DONE')
  }

  return (value.totalFaults || 0) > (value.doneFaults || 0)
}

async function loadRepair() {
  if (!repairId.value) {
    repairStore.clearCurrentRepair()
    return
  }

  isLoading.value = true
  try {
    const details = await repairStore.loadRepairDetail(repairId.value)

    if (details) {
      if (canReadFaults.value) {
        await repairStore.loadRepairFaults(details.id, { silent: true }).catch(() => undefined)
      }

      const currentDetails = repair.value || details
      resetEditForm(currentDetails)
      syncFaultEditRows(currentDetails.faults || [])
      syncFaultExpandedRows(currentDetails.faults || [], true)
    }
  } catch {
    showMutationError('Nie udało się pobrać naprawy', 'Spróbuj odświeżyć stronę.')
  } finally {
    isLoading.value = false
  }
}

async function refreshRepair() {
  const details = await repairStore.loadRepairDetail(repairId.value, { silent: true })

  if (details) {
    if (canReadFaults.value) {
      await repairStore.loadRepairFaults(details.id, { silent: true }).catch(() => undefined)
    }

    const currentDetails = repair.value || details
    resetEditForm(currentDetails)
    syncFaultEditRows(currentDetails.faults || [])
    syncFaultExpandedRows(currentDetails.faults || [])
  }
}

async function updateRepairDetails() {
  if (!repair.value || !canUpdateRepairs.value) {
    return
  }

  if (editForm.status === 'done' && hasOpenFaults(repair.value)) {
    uiStore.addToast({
      type: 'warning',
      title: 'Nie można zakończyć',
      message: 'Najpierw oznacz wszystkie usterki jako zrobione.',
    })
    return
  }

  try {
    await repairStore.updateRepair(repair.value.id, {
      urgent: editForm.urgent,
      plannedArrivalAt: toIsoDateTime(editForm.arrivalAt),
      plannedDepartureAt: toIsoDateTime(editForm.departureAt),
      ...(editForm.status !== editForm.initialStatus ? { status: editForm.status } : {}),
    })
    infoEditMode.value = false
    uiStore.addToast({
      type: 'success',
      title: 'Naprawa zaktualizowana',
      message: 'Zapisano zmiany w naprawie.',
    })
  } catch {
    showMutationError('Nie udało się zapisać', 'Spróbuj ponownie albo sprawdź dane naprawy.')
  }
}

function requestRepairStatusChange() {
  if (!repair.value || !canUpdateRepairs.value) {
    return
  }

  if (normalizeRepairStatus(repair.value.status) === 'done') {
    repairStatusAction.value = 'open'
    return
  }

  if (hasOpenFaults(repair.value)) {
    uiStore.addToast({
      type: 'warning',
      title: 'Nie można zamknąć naprawy',
      message: 'Najpierw oznacz wszystkie usterki jako zrobione.',
    })
    return
  }

  repairStatusAction.value = 'close'
}

async function confirmRepairStatusChange() {
  if (!repair.value || !repairStatusAction.value || !canUpdateRepairs.value) {
    return
  }

  const action = repairStatusAction.value
  const nextStatus = action === 'close' ? 'done' : 'new'

  try {
    await repairStore.updateRepair(repair.value.id, { status: nextStatus })
    repairStatusAction.value = null
    uiStore.addToast({
      type: 'success',
      title: action === 'close' ? 'Naprawa zamknięta' : 'Naprawa otwarta',
      message: action === 'close'
        ? 'Status naprawy zmieniono na zakończona.'
        : 'Status naprawy zmieniono na „Nowa”.',
    })
  } catch {
    showMutationError(
      action === 'close' ? 'Nie udało się zamknąć naprawy' : 'Nie udało się otworzyć naprawy',
      'Spróbuj ponownie za chwilę.',
    )
  }
}

async function toggleFaultDone(fault: RepairFault) {
  if (!repair.value || !canChangeFaultStatus.value) {
    return
  }

  if (fault.status === 'DONE') {
    faultToReopen.value = fault
    return
  }

  faultToComplete.value = fault
}

async function confirmCompleteFault() {
  if (!repair.value || !faultToComplete.value || !canChangeFaultStatus.value) {
    return
  }

  try {
    await repairStore.updateRepairFaultStatus(repair.value.id, faultToComplete.value.id, {
      status: 'done',
    })
    const nextExpandedIds = new Set(expandedFaultIds.value)
    nextExpandedIds.delete(faultToComplete.value.id)
    expandedFaultIds.value = nextExpandedIds
    faultToComplete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Usterka zakończona',
      message: 'Oznaczono usterkę jako wykonaną.',
    })
  } catch {
    showMutationError('Nie udało się zakończyć usterki', 'Spróbuj ponownie za chwilę.')
  }
}

async function confirmReopenFault() {
  if (!repair.value || !faultToReopen.value || !canChangeFaultStatus.value) {
    return
  }

  try {
    await repairStore.updateRepairFaultStatus(repair.value.id, faultToReopen.value.id, {
      status: 'open',
    })
    faultToReopen.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Usterka cofnięta',
      message: 'Usterka ponownie jest oznaczona jako niezrobiona.',
    })
  } catch {
    showMutationError('Nie udało się cofnąć usterki', 'Spróbuj ponownie za chwilę.')
  }
}

async function confirmDeleteFault() {
  if (!repair.value || !faultToDelete.value || !canDeleteFault(faultToDelete.value)) {
    return
  }

  try {
    const deletedFaultId = faultToDelete.value.id
    await repairStore.deleteRepairFault(repair.value.id, deletedFaultId)
    clearFaultLocalData(deletedFaultId)
    faultToDelete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Usterka usunięta',
      message: 'Usunięto usterkę z naprawy.',
    })
  } catch {
    showMutationError('Nie udało się usunąć usterki', 'Spróbuj ponownie za chwilę.')
  }
}

async function saveFaultRow(fault: RepairFault) {
  if (!repair.value || !canEditFaults.value) {
    return
  }

  const row = faultEditRows[fault.id]

  if (!row?.description.trim()) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak opisu usterki',
      message: 'Opis usterki nie może być pusty.',
    })
    return
  }

  try {
    await repairStore.updateRepairFault(repair.value.id, fault.id, {
      description: row.description.trim(),
      placeId: placeIdValue(row.placeId),
      assignedMechanicId: null,
    })
    editingFaultId.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Usterka zaktualizowana',
      message: 'Zapisano zmiany w usterce.',
    })
  } catch {
    showMutationError('Nie udało się zapisać usterki', 'Sprawdź dane i spróbuj ponownie.')
  }
}

async function saveAllFaultRows() {
  if (!repair.value || !canEditFaults.value) {
    return
  }

  const changedFaults = (repair.value.faults || []).filter((fault) => {
    const row = faultEditRows[fault.id]
    return row && (row.description.trim() !== fault.description || row.placeId !== String(fault.placeId ?? ''))
  })

  const hasInvalidDescription = changedFaults.some((fault) => !faultEditRows[fault.id]?.description.trim())

  if (hasInvalidDescription) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak opisu usterki',
      message: 'Opis usterki nie może być pusty.',
    })
    return
  }

  try {
    for (const fault of changedFaults) {
      await repairStore.updateRepairFault(repair.value.id, fault.id, {
        description: faultEditRows[fault.id].description.trim(),
        placeId: placeIdValue(faultEditRows[fault.id].placeId),
        assignedMechanicId: null,
      })
    }

    faultsEditMode.value = false
    uiStore.addToast({
      type: 'success',
      title: changedFaults.length ? 'Usterki zaktualizowane' : 'Brak zmian',
      message: changedFaults.length ? 'Zapisano zmiany w usterkach.' : 'Nie było zmian do zapisania.',
    })
  } catch {
    showMutationError('Nie udało się zapisać usterek', 'Sprawdź dane i spróbuj ponownie.')
  }
}

async function addFaultToDetail() {
  if (!canCreateFaults.value) {
    return
  }

  if (!repair.value || !newDetailFault.description.trim()) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak opisu usterki',
      message: 'Uzupełnij opis usterki przed dodaniem.',
    })
    return
  }

  try {
    const createdFault = await repairStore.addRepairFault(repair.value.id, {
      description: newDetailFault.description.trim(),
      placeId: placeIdValue(newDetailFault.placeId),
      assignedMechanicId: null,
    })
    let failedUploads = 0
    let uploadedPhotos = 0

    for (const draft of newFaultPhotoDrafts.value) {
      try {
        const photo = await repairStore.uploadRepairFaultPhoto(repair.value.id, createdFault.id, draft.file)
        await loadPhotoObjectUrl(photo)
        uploadedPhotos += 1
      } catch {
        failedUploads += 1
      }
    }

    if (uploadedPhotos > 0 && shouldAutoExpandFault(createdFault)) {
      expandedFaultIds.value = new Set([...expandedFaultIds.value, createdFault.id])
    }

    newDetailFault.description = ''
    newDetailFault.placeId = ''
    isAddFaultModalOpen.value = false
    clearNewFaultPhotoDrafts()
    uiStore.addToast({
      type: 'success',
      title: 'Usterka dodana',
      message: failedUploads
        ? `Dodano usterkę, ale nie udało się wysłać zdjęć: ${failedUploads}.`
        : 'Dodano usterkę do naprawy.',
    })
  } catch {
    showMutationError('Nie udało się dodać usterki', 'Sprawdź dane i spróbuj ponownie.')
  }
}

async function confirmDeleteRepair() {
  if (!repairToDelete.value || !canDeleteRepairs.value) {
    return
  }

  const id = repairToDelete.value.id
  const workspaceEpoch = workspace.epoch
  try {
    await repairStore.deleteRepair(id)
  } catch {
    showMutationError('Nie udało się usunąć naprawy', 'Spróbuj ponownie za chwilę.')
    return
  }

  if (workspace.epoch !== workspaceEpoch) return

  repairToDelete.value = null
  const recordId = String(id)
  const deletedTab = workspace.tabs.find(tab => tab.name === 'repair-detail' && tab.recordId === recordId)
  if (deletedTab) workspace.close(deletedTab.id)

  uiStore.addToast({
    type: 'success',
    title: 'Naprawa usunięta',
    message: 'Usunięto naprawę.',
  })

  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'repair-detail' && currentRoute.params.id === recordId) {
    await router.replace({ name: 'repairs' })
  }
}

watch(
  allFaultPhotos,
  (photos) => syncPhotoObjectUrls(photos),
  { deep: true, immediate: true },
)

onMounted(() => {
  document.addEventListener('keydown', handlePreviewKeydown)
  void Promise.allSettled([loadRepair(), repairStore.loadDictionaries()])
})

onBeforeRouteLeave((to) => {
  if (to.name !== 'repairs') {
    repairStore.clearRepairsReturnPosition()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handlePreviewKeydown)
  clearNewFaultPhotoDrafts()
  revokeAllPhotoObjectUrls()
  repairStore.clearCurrentRepair()
})
useWorkspacePolling(async () => {
  if (repair.value && !isLoading.value && !isMutating.value && !isPhotoMutating.value
    && !infoEditMode.value && editingFaultId.value === null && !faultsEditMode.value) {
    await repairStore.loadRepairDetail(repairId.value, { silent: true, background: true })
  }
}, 30_000)

const workspacePortal = useWorkspacePortal()
useWorkspaceDirty(computed(() => infoEditMode.value || editingFaultId.value !== null || newDetailFault.description.trim().length > 0 || Boolean(newDetailFault.placeId) || newFaultPhotoDrafts.value.length > 0))
</script>

<style scoped>
.repair-overview {
  container-type: inline-size;
}

@container (min-width: 48rem) {
  .repair-overview-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.repair-hidden-file-input {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
