<template>
  <div class="space-y-3">
    <header class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          :to="{ name: 'repairs' }"
          aria-label="Wróć do napraw"
        >
          <ArrowLeft class="h-4 w-4" />
        </RouterLink>
        <div class="min-w-0">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Naprawa #{{ repairId }}</p>
          <h1 class="mt-0.5 truncate text-xl font-semibold text-slate-950 dark:text-slate-50">
            {{ repair ? repairVehicleLabel(repair) : 'Szczegóły naprawy' }}
          </h1>
        </div>
      </div>

      <div v-if="repair" class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <AppBadge :variant="statusVariant(repair.status)">{{ statusLabel(repair.status) }}</AppBadge>
        <AppButton class="w-full sm:w-auto" size="sm" variant="secondary" :loading="isMutating" @click="requestRepairStatusChange">
          <CircleCheck class="h-4 w-4" />
          {{ normalizeRepairStatus(repair.status) === 'done' ? 'Otwórz naprawę' : 'Zamknij naprawę' }}
        </AppButton>
        <AppButton class="w-full sm:w-auto" size="sm" variant="danger" @click="repairToDelete = repair">
          <Trash2 class="h-4 w-4" />
          Usuń naprawę
        </AppButton>
      </div>
    </header>

    <div v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie szczegółów naprawy...
    </div>

    <div v-else-if="!repair" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono naprawy.
    </div>

    <div v-else class="space-y-3">
        <AppCard title="Informacje" compact content-class="!p-3">
          <template #actions>
            <AppButton v-if="!infoEditMode" size="sm" variant="secondary" @click="openInfoEdit">
              <SquarePen class="h-4 w-4" />
              Edytuj
            </AppButton>
            <div v-else class="flex flex-wrap justify-end gap-2">
              <AppButton size="sm" variant="ghost" @click="cancelInfoEdit">
                <X class="h-4 w-4" />
                Anuluj
              </AppButton>
              <AppButton size="sm" variant="secondary" :loading="isMutating" @click="updateRepairDetails">
                <Check class="h-4 w-4" />
                Zapisz
              </AppButton>
            </div>
          </template>

          <div class="grid gap-2 md:grid-cols-3">
            <InfoLine label="Pojazd" :value="repairVehicleLabel(repair)" :icon="Truck" />
            <InfoLine label="Utworzył" :value="repairCreatorName(repair)" :icon="UserRound" />
            <div class="rounded-xl border border-slate-100 p-2.5 dark:border-app-border">
              <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <BadgeCheck class="h-3 w-3" />
                Status
              </p>
              <AppSelect v-if="infoEditMode" v-model="editForm.status" :options="repairStatusOptions" size="sm" class="mt-1.5" />
              <p v-else class="mt-0.5 break-words text-xs font-semibold text-slate-950 dark:text-slate-50">{{ statusLabel(repair.status) }}</p>
            </div>
            <div class="rounded-xl border border-slate-100 p-2.5 dark:border-app-border">
              <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <MapPin class="h-3 w-3" />
                Miejsce naprawy
              </p>
              <AppSearchSelect v-if="infoEditMode" v-model="editForm.placeId" placeholder="Wybierz miejsce" :options="placeOptions" size="sm" class="mt-1.5" />
              <p v-else class="mt-0.5 break-words text-xs font-semibold text-slate-950 dark:text-slate-50">{{ repairPlaceLabel(repair) }}</p>
            </div>
            <div class="rounded-xl border border-slate-100 p-2.5 dark:border-app-border">
              <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <CalendarClock class="h-3 w-3" />
                Planowany przyjazd
              </p>
              <AppDateTimePicker v-if="infoEditMode" v-model="editForm.arrivalAt" size="sm" default-time="08:00" class="mt-1.5" />
              <p v-else class="mt-0.5 break-words text-xs font-semibold text-slate-950 dark:text-slate-50">{{ formatDateTime(repair.plannedArrivalAt) }}</p>
            </div>
            <div class="rounded-xl border border-slate-100 p-2.5 dark:border-app-border">
              <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <CalendarCheck class="h-3 w-3" />
                Planowany odjazd
              </p>
              <AppDateTimePicker v-if="infoEditMode" v-model="editForm.departureAt" size="sm" default-time="16:00" class="mt-1.5" />
              <p v-else class="mt-0.5 break-words text-xs font-semibold text-slate-950 dark:text-slate-50">{{ formatDateTime(repair.plannedDepartureAt) }}</p>
            </div>
            <div class="rounded-xl border border-slate-100 p-2.5 dark:border-app-border md:col-span-3">
              <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <FileText class="h-3 w-3" />
                Uwagi
              </p>
              <textarea
                v-if="infoEditMode"
                v-model="editForm.description"
                class="mt-1.5 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
                placeholder="Uwagi do naprawy"
              ></textarea>
              <p v-else class="mt-0.5 text-xs font-semibold text-slate-950 dark:text-slate-50">{{ repair.description || '-' }}</p>
            </div>
          </div>
        </AppCard>

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
              v-for="photo in repair.photos"
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

          <p v-if="!repair.photos.length" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Brak zdjęć dla tej naprawy.
          </p>
        </AppCard>
        </template>
        <AppCard title="Usterki" compact content-class="!p-3">
          <template #actions>
            <div class="flex flex-wrap justify-end gap-2">
              <AppButton size="sm" variant="secondary" @click="openAddFaultModal">
                <Plus class="h-4 w-4" />
                Dodaj usterkę
              </AppButton>
            </div>
          </template>

          <div class="space-y-3">
            <article
              v-for="fault in repair.faults"
              :key="fault.id"
              :data-fault-card-id="fault.id"
              class="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm ring-1 ring-slate-200/70 dark:border-app-border dark:bg-app-dark dark:ring-white/5"
            >
              <div
                class="grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-2 py-2 transition hover:bg-slate-50 sm:px-3 md:grid-cols-[2rem_minmax(10rem,1fr)_12rem] md:gap-2 dark:hover:bg-app-elevated"
                role="button"
                tabindex="0"
                :aria-expanded="isFaultExpanded(fault.id)"
                :aria-label="isFaultExpanded(fault.id) ? 'Zwiń usterkę' : 'Rozwiń usterkę'"
                @click="toggleFaultDetails(fault.id)"
                @keydown.enter.self.prevent="toggleFaultDetails(fault.id)"
                @keydown.space.self.prevent="toggleFaultDetails(fault.id)"
              >
                <button
                  type="button"
                  class="inline-flex h-8 w-8 self-center items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-50 hover:text-success-600 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-success-400"
                  :aria-label="fault.status === 'DONE' ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'"
                  :disabled="isMutating"
                  @click.stop="toggleFaultDone(fault)"
                  @keydown.stop
                >
                  <CircleCheck v-if="fault.status === 'DONE'" class="h-5 w-5 text-success-600 dark:text-success-400" />
                  <Circle v-else class="h-5 w-5" />
                </button>

                <div class="min-w-0">
                  <AppInput
                    v-if="isFaultEditing(fault.id)"
                    v-model="faultEditRows[fault.id].description"
                    size="sm"
                    placeholder="Opis usterki"
                    @click.stop
                    @keydown.stop
                  />
                  <template v-else>
                    <div class="fault-description-scroll flex min-h-8 min-w-0 items-center overflow-x-auto">
                      <p class="w-max min-w-full whitespace-nowrap text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {{ fault.description }}
                      </p>
                    </div>
                  </template>
                </div>

                <div
                  v-if="isFaultExpanded(fault.id)"
                  class="col-span-full grid gap-2 border-t border-slate-100 bg-slate-50/80 p-2 dark:border-app-border dark:bg-app-dark/80 lg:grid-cols-[minmax(16rem,0.78fr)_minmax(0,1fr)]"
                  :data-fault-details-id="fault.id"
                  @click.stop
                  @keydown.stop
                >
                  <section class="min-w-0 rounded-xl border border-slate-100 bg-white p-2 dark:border-app-border dark:bg-app-panel">
                  <header class="mb-2 flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <ImagePlus class="h-4 w-4 text-slate-400" />
                      <h3 class="text-xs font-semibold text-slate-950 dark:text-slate-50">Zdjęcia</h3>
                    </div>
                    <AppBadge>{{ fault.photos?.length || 0 }}</AppBadge>
                  </header>

                  <div class="grid max-h-48 grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2 overflow-y-auto pr-1">
                    <label class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 text-center text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-app-border dark:text-slate-400 dark:hover:bg-app-elevated">
                      <input
                        type="file"
                        class="sr-only"
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        :disabled="isPhotoMutating"
                    @change="handleFaultPhotoSelection(fault.id, $event)"
                    @click.stop
                      />
                      <LoaderCircle v-if="isPhotoMutating" class="h-4 w-4 animate-spin" />
                      <ImagePlus v-else class="h-4 w-4" />
                      {{ isPhotoMutating ? 'Wysyłanie' : 'Dodaj' }}
                    </label>

                    <article
                      v-for="photo in fault.photos || []"
                      :key="photo.id"
                      class="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100 dark:border-app-border dark:bg-app-elevated"
                    >
                      <button
                        v-if="photoObjectUrls[photo.id]"
                        type="button"
                        class="block h-full w-full cursor-zoom-in"
                        :aria-label="`Powiększ zdjęcie ${photo.originalFilename}`"
                        @click.stop="photoPreview = { ...photo, faultId: fault.id }"
                      >
                        <img :src="photoObjectUrls[photo.id]" :alt="photo.originalFilename" class="h-full w-full object-cover" />
                      </button>
                      <div v-else class="grid h-full place-items-center text-slate-400 dark:text-app-muted">
                        <ImageOff v-if="photoLoadFailures[photo.id]" class="h-4 w-4" />
                        <LoaderCircle v-else class="h-4 w-4 animate-spin" />
                      </div>
                      <button
                        type="button"
                        class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950"
                        :disabled="isPhotoMutating"
                        aria-label="Usuń zdjęcie"
                        @click.stop="photoToDelete = { ...photo, faultId: fault.id }"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </article>
                  </div>
                  <p v-if="!fault.photos?.length" class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Brak zdjęć.
                  </p>
                  <p v-if="faultPhotoErrors[fault.id]" class="mt-1.5 text-[11px] font-medium text-danger-600 dark:text-danger-400">
                    {{ faultPhotoErrors[fault.id] }}
                  </p>
                </section>

                <section class="flex min-h-[10rem] min-w-0 flex-col rounded-xl border border-slate-100 bg-white p-2 dark:border-app-border dark:bg-app-panel">
                  <header class="mb-2 flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <MessageSquare class="h-4 w-4 shrink-0 text-slate-400" />
                      <h3 class="truncate text-xs font-semibold text-slate-950 dark:text-slate-50">Komentarze</h3>
                    </div>
                    <AppBadge>{{ fault.comments?.length || 0 }}</AppBadge>
                  </header>

                  <div class="max-h-[7.75rem] min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    <article v-for="comment in fault.comments || []" :key="comment.id">
                      <div class="flex items-center justify-between gap-2 px-1">
                        <p class="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">{{ comment.username || `Użytkownik #${comment.userId}` }}</p>
                        <time class="shrink-0 text-[10px] text-slate-400 dark:text-app-muted">{{ formatDateTime(comment.createdAt) }}</time>
                      </div>
                      <p class="mt-1 w-fit max-w-[95%] rounded-xl rounded-tl-sm bg-slate-100 px-2.5 py-1.5 text-xs text-slate-800 dark:bg-app-elevated dark:text-slate-100">
                        {{ comment.text }}
                      </p>
                    </article>
                    <p v-if="!fault.comments?.length" class="py-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
                      Brak komentarzy.
                    </p>
                  </div>

                  <div class="sticky bottom-0 mt-2 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-app-border dark:bg-app-dark">
                    <input
                      v-model="faultCommentDrafts[fault.id]"
                      type="text"
                      class="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-app-muted"
                      placeholder="Dodaj komentarz"
                      @click.stop
                      @keydown.enter.prevent="addFaultComment(fault.id)"
                    />
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-app-dark dark:hover:bg-white"
                      aria-label="Dodaj komentarz"
                      @click.stop="addFaultComment(fault.id)"
                    >
                      <Send class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </section>
                </div>

                <div class="col-start-3 row-start-1 flex self-center justify-end gap-1 md:col-start-3 md:justify-end">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    :aria-label="isFaultExpanded(fault.id) ? 'Zwiń usterkę' : 'Rozwiń usterkę'"
                    :aria-expanded="isFaultExpanded(fault.id)"
                    @click.stop="toggleFaultDetails(fault.id)"
                  >
                    <ChevronDown class="h-4 w-4 transition" :class="isFaultExpanded(fault.id) ? 'rotate-180' : ''" />
                    <span class="hidden sm:inline">{{ isFaultExpanded(fault.id) ? 'Zwiń' : 'Rozwiń' }}</span>
                  </button>
                  <button
                    v-if="!isFaultEditing(fault.id)"
                    type="button"
                    class="inline-flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    aria-label="Edytuj usterkę"
                    :disabled="isMutating"
                    @click.stop="startFaultEdit(fault)"
                  >
                    <SquarePen class="h-4 w-4" />
                    <span class="hidden sm:inline">Edytuj</span>
                  </button>
                  <button
                    v-if="isFaultEditing(fault.id)"
                    type="button"
                    class="inline-flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    aria-label="Anuluj edycję usterki"
                    :disabled="isMutating"
                    @click.stop="cancelFaultEdit"
                  >
                    <X class="h-4 w-4" />
                    <span class="hidden sm:inline">Anuluj</span>
                  </button>
                  <button
                    v-if="isFaultEditing(fault.id)"
                    type="button"
                    class="inline-flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    aria-label="Zapisz usterkę"
                    :disabled="isMutating"
                    @click.stop="saveFaultRow(fault)"
                  >
                    <Check class="h-4 w-4" />
                    <span class="hidden sm:inline">Zapisz</span>
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                    aria-label="Usuń usterkę"
                    :disabled="isMutating"
                    @click.stop="faultToDelete = fault"
                  >
                    <Trash2 class="h-4 w-4" />
                    <span class="hidden sm:inline">Usuń</span>
                  </button>
                </div>
              </div>

              <div v-if="false" class="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-app-border dark:bg-app-dark/70">
                <div class="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
                  <section class="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 dark:border-app-border dark:bg-app-panel">
                    <header class="mb-3 flex items-center justify-between gap-2">
                      <div class="flex min-w-0 items-center gap-2">
                        <MessageSquare class="h-4 w-4 shrink-0 text-slate-400" />
                        <h3 class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">Komentarze</h3>
                      </div>
                      <AppBadge>{{ fault.comments?.length || 0 }}</AppBadge>
                    </header>

                    <div class="max-h-40 space-y-2 overflow-y-auto pr-1">
                      <article v-for="comment in fault.comments || []" :key="comment.id">
                        <div class="flex items-center justify-between gap-2 px-1">
                          <p class="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ comment.username || `Użytkownik #${comment.userId}` }}</p>
                          <time class="shrink-0 text-[10px] text-slate-400 dark:text-app-muted">{{ formatDateTime(comment.createdAt) }}</time>
                        </div>
                        <p class="mt-1 w-fit max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-app-elevated dark:text-slate-100">
                          {{ comment.text }}
                        </p>
                      </article>
                      <p v-if="!fault.comments?.length" class="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        Brak komentarzy do tej usterki.
                      </p>
                    </div>

                    <div class="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-app-border dark:bg-app-dark">
                      <input
                        v-model="faultCommentDrafts[fault.id]"
                        type="text"
                        class="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-app-muted"
                        placeholder="Dodaj komentarz"
                        @keydown.enter.prevent="addFaultComment(fault.id)"
                      />
                      <button
                        type="button"
                        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-app-dark dark:hover:bg-white"
                        aria-label="Dodaj komentarz"
                        @click="addFaultComment(fault.id)"
                      >
                        <Send class="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  <section class="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 dark:border-app-border dark:bg-app-panel">
                    <header class="mb-3 flex items-center gap-2">
                      <ImagePlus class="h-4 w-4 text-slate-400" />
                      <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Zdjęcia usterki</h3>
                    </header>

                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      <label class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:border-app-border dark:text-slate-400 dark:hover:bg-app-elevated">
                        <input
                          type="file"
                          class="sr-only"
                          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                          multiple
                          :disabled="isPhotoMutating"
                          @change="handleFaultPhotoSelection(fault.id, $event)"
                        />
                        <LoaderCircle v-if="isPhotoMutating" class="h-5 w-5 animate-spin" />
                        <ImagePlus v-else class="h-5 w-5" />
                        {{ isPhotoMutating ? 'Wysyłanie' : 'Dodaj' }}
                      </label>

                      <article
                        v-for="photo in fault.photos || []"
                        :key="photo.id"
                        class="group relative aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 dark:border-app-border dark:bg-app-elevated"
                      >
                        <button
                          v-if="photoObjectUrls[photo.id]"
                          type="button"
                          class="block h-full w-full cursor-zoom-in"
                          :aria-label="`Powiększ zdjęcie ${photo.originalFilename}`"
                          @click="photoPreview = { ...photo, faultId: fault.id }"
                        >
                          <img :src="photoObjectUrls[photo.id]" :alt="photo.originalFilename" class="h-full w-full object-cover" />
                        </button>
                        <div v-else class="grid h-full place-items-center text-slate-400 dark:text-app-muted">
                          <ImageOff v-if="photoLoadFailures[photo.id]" class="h-5 w-5" />
                          <LoaderCircle v-else class="h-5 w-5 animate-spin" />
                        </div>
                        <button
                          type="button"
                          class="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950"
                          :disabled="isPhotoMutating"
                          aria-label="Usuń zdjęcie"
                          @click="photoToDelete = { ...photo, faultId: fault.id }"
                        >
                          <X class="h-3.5 w-3.5" />
                        </button>
                      </article>
                    </div>
                    <p v-if="!fault.photos?.length" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Brak zdjęć do tej usterki.
                    </p>
                    <p v-if="faultPhotoErrors[fault.id]" class="mt-2 text-xs font-medium text-danger-600 dark:text-danger-400">
                      {{ faultPhotoErrors[fault.id] }}
                    </p>
                  </section>
                </div>
              </div>
            </article>

            <div v-if="!repair.faults.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
              Brak usterek.
            </div>
          </div>
        </AppCard>

      </div>

    <Teleport to="body">
      <div
        v-if="isAddFaultModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="closeAddFaultModal"
      >
        <section class="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Dodaj usterkę</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Usterka zostanie dopisana do naprawy #{{ repairId }}.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
              aria-label="Zamknij modal dodawania usterki"
              @click="closeAddFaultModal"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <AppInput v-model="newDetailFault.description" label="Usterka" placeholder="Opis usterki" />

            <section class="rounded-2xl border border-slate-100 p-3 dark:border-app-border">
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <ImagePlus class="h-4 w-4 shrink-0 text-slate-400" />
                  <h3 class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">Zdjęcia do usterki</h3>
                </div>
                <AppBadge>{{ newFaultPhotoDrafts.length }}</AppBadge>
              </div>

              <label class="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:border-app-border dark:bg-app-dark dark:text-slate-300 dark:hover:bg-app-elevated">
                <input
                  type="file"
                  class="sr-only"
                  accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  :disabled="isMutating || isPhotoMutating"
                  @change="handleNewFaultPhotoSelection"
                />
                <ImagePlus class="h-5 w-5" />
                Dodaj zdjęcia
              </label>

              <p v-if="newFaultPhotoError" class="mt-2 text-xs font-medium text-danger-600 dark:text-danger-400">
                {{ newFaultPhotoError }}
              </p>

              <div v-if="newFaultPhotoDrafts.length" class="mt-3 grid max-h-36 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2 overflow-y-auto pr-1">
                <article
                  v-for="draft in newFaultPhotoDrafts"
                  :key="draft.id"
                  class="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100 dark:border-app-border dark:bg-app-elevated"
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

          <footer class="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-app-border sm:flex-row sm:justify-end">
            <AppButton variant="secondary" :disabled="isMutating || isPhotoMutating" @click="closeAddFaultModal">Anuluj</AppButton>
            <AppButton :loading="isMutating || isPhotoMutating" @click="addFaultToDetail">
              <Plus class="h-4 w-4" />
              Dodaj usterkę
            </AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
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

    <Teleport to="body">
      <div
        v-if="photoToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="photoToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć zdjęcie?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz usunąć {{ photoToDelete.originalFilename }}?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" :disabled="isPhotoMutating" @click="photoToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isPhotoMutating" @click="confirmDeletePhoto">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="repairStatusAction && repair"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="repairStatusAction = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">
              {{ repairStatusAction === 'close' ? 'Zamknąć naprawę?' : 'Otworzyć naprawę?' }}
            </h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ repairStatusAction === 'close' ? 'Czy chcesz zamknąć naprawę?' : 'Czy chcesz ponownie otworzyć naprawę i ustawić status W trakcie?' }}
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="repairStatusAction = null">Anuluj</AppButton>
            <AppButton :loading="isMutating" @click="confirmRepairStatusChange">
              {{ repairStatusAction === 'close' ? 'Zamknij naprawę' : 'Otwórz naprawę' }}
            </AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="faultToComplete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="faultToComplete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Zamknąć usterkę?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy chcesz oznaczyć tę usterkę jako wykonaną?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="faultToComplete = null">Anuluj</AppButton>
            <AppButton :loading="isMutating" @click="confirmCompleteFault">Zamknij usterkę</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="faultToReopen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="faultToReopen = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Cofnąć wykonanie usterki?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz cofnąć wykonanie tej usterki?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="faultToReopen = null">Anuluj</AppButton>
            <AppButton :loading="isMutating" @click="confirmReopenFault">Cofnij wykonanie</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="faultToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="faultToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć usterkę?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz usunąć tę usterkę?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="faultToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isMutating" @click="confirmDeleteFault">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="repairToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="repairToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć naprawę?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ta operacja usunie naprawę dla pojazdu {{ repairVehicleLabel(repairToDelete) }}.
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="repairToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isMutating" @click="confirmDeleteRepair">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Component, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BadgeCheck, CalendarCheck, CalendarClock, Check, ChevronDown, Circle, CircleCheck, FileText, ImageOff, ImagePlus, LoaderCircle, MapPin, MessageSquare, Plus, Send, SquarePen, Trash2, Truck, UserRound, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { repairService } from '@/services/repairService'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Repair, RepairFault, RepairFaultPhoto, RepairPhoto, RepairStatus } from '@/types/repair'

interface NewFaultPhotoDraft {
  id: string
  file: File
  objectUrl: string
}

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const repairStore = useRepairStore()
const {
  currentRepair: repair,
  places,
  isDetailLoading: isLoading,
  isMutating,
  isPhotoMutating,
} = storeToRefs(repairStore)
const repairToDelete = ref<Repair | null>(null)
const repairStatusAction = ref<'close' | 'open' | null>(null)
const faultToComplete = ref<RepairFault | null>(null)
const faultToReopen = ref<RepairFault | null>(null)
const faultToDelete = ref<RepairFault | null>(null)
const faultsEditMode = ref(false)
const editingFaultId = ref<number | null>(null)
const isAddFaultModalOpen = ref(false)
const infoEditMode = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const photoToDelete = ref<RepairFaultPhoto | null>(null)
const photoPreview = ref<RepairFaultPhoto | null>(null)
const photoValidationError = ref('')
const photoObjectUrls = reactive<Record<number, string>>({})
const photoLoadFailures = reactive<Record<number, boolean>>({})
const pendingPhotoLoads = new Map<number, symbol>()
let photoLoadErrorShown = false
const newDetailFault = reactive({ description: '' })
const newFaultPhotoDrafts = ref<NewFaultPhotoDraft[]>([])
const newFaultPhotoError = ref('')
const faultEditRows = reactive<Record<number, { description: string }>>({})
const expandedFaultIds = ref<Set<number>>(new Set())
const faultCommentDrafts = reactive<Record<number, string>>({})
const faultPhotoErrors = reactive<Record<number, string>>({})
const editForm = reactive({
  status: 'planned' as RepairStatus,
  placeId: '',
  arrivalAt: '',
  departureAt: '',
  description: '',
})
const repairId = computed(() => String(route.params.id || ''))
const allFaultPhotos = computed(() => (repair.value?.faults || []).flatMap((fault) => fault.photos || []))

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024

const repairStatusOptions: AppSelectOption[] = [
  { label: 'Nowa', value: 'new' },
  { label: 'Zaplanowana', value: 'planned' },
  { label: 'Gotowa do naprawy', value: 'ready_to_be_repaired' },
  { label: 'W lokalizacji', value: 'at_location' },
  { label: 'W terenie', value: 'IN_FIELD' },
  { label: 'Zakończona', value: 'done' },
  { label: 'Anulowana', value: 'cancelled' },
]

const placeOptions = computed<AppSearchSelectOption[]>(() => places.value.map((place) => ({
  value: String(place.id),
  label: place.name,
})))

const InfoLine = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: String as PropType<string>,
      required: true,
    },
    icon: {
      type: Object as PropType<Component>,
      default: null,
    },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-xl border border-slate-100 p-2.5 dark:border-app-border' }, [
      h('p', { class: 'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400' }, [
        props.icon ? h(props.icon, { class: 'h-3 w-3' }) : null,
        props.label,
      ]),
      h('p', { class: 'mt-0.5 break-words text-xs font-semibold text-slate-950 dark:text-slate-50' }, props.value),
    ])
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

function repairVehicleLabel(value: Repair) {
  return value.vehicle?.licensePlate || value.vehicleLicensePlate || `Pojazd #${value.vehicleId}`
}

function repairPlaceLabel(value: Repair) {
  return value.place?.name || value.placeName || (value.placeId ? `Miejsce #${value.placeId}` : 'Brak miejsca')
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

function nullableDescription(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function mechanicIdValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== '' ? parsed : null
}

function resetEditForm(value: Repair) {
  const placeId = value.place?.id ?? value.placeId ?? ''

  Object.assign(editForm, {
    status: normalizeRepairStatus(value.status),
    placeId: placeId ? String(placeId) : '',
    arrivalAt: dateTimeInputValue(value.plannedArrivalAt, '08:00'),
    departureAt: dateTimeInputValue(value.plannedDepartureAt, '16:00'),
    description: value.description || '',
  })
}

function openInfoEdit() {
  if (!repair.value) {
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
    }
  })
}

function syncFaultExpandedRows(faults: RepairFault[], expandMissing = false) {
  const activeIds = new Set(faults.map((fault) => fault.id))
  const nextIds = new Set(Array.from(expandedFaultIds.value).filter((id) => activeIds.has(id)))

  if (expandMissing) {
    faults.forEach((fault) => {
      if (!expandedFaultIds.value.has(fault.id) && fault.status !== 'DONE') {
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
  faultEditRows[fault.id] = {
    description: fault.description,
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
  newDetailFault.description = ''
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

function handleNewFaultPhotoSelection(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  newFaultPhotoError.value = ''

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

async function scrollExpandedFaultIntoView(faultId: number) {
  await nextTick()

  const cardElement = document.querySelector<HTMLElement>(`[data-fault-card-id="${faultId}"]`)

  if (!cardElement) {
    return
  }

  const faults = repair.value?.faults || []
  const isLastFault = faults[faults.length - 1]?.id === faultId

  if (isLastFault) {
    const scrollParent = findScrollableParent(cardElement)

    scrollParent.scrollTo({
      top: scrollParent.scrollHeight,
      behavior: 'smooth',
    })
    return
  }

  cardElement.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

function findScrollableParent(element: HTMLElement) {
  let currentElement = element.parentElement

  while (currentElement) {
    const style = window.getComputedStyle(currentElement)
    const canScroll = /(auto|scroll)/.test(style.overflowY)

    if (canScroll && currentElement.scrollHeight > currentElement.clientHeight) {
      return currentElement
    }

    currentElement = currentElement.parentElement
  }

  return document.scrollingElement as HTMLElement
}

function toggleFaultDetails(faultId: number) {
  const nextIds = new Set(expandedFaultIds.value)
  const willExpand = !nextIds.has(faultId)

  if (!willExpand) {
    nextIds.delete(faultId)
  } else {
    nextIds.add(faultId)
    if (repair.value) {
      void repairStore.loadRepairFaultComments(repair.value.id, faultId, { silent: true }).catch(() => undefined)
    }
  }

  expandedFaultIds.value = nextIds

  if (willExpand) {
    void scrollExpandedFaultIntoView(faultId)
  }
}

async function addFaultComment(faultId: number) {
  if (!repair.value) return

  const content = faultCommentDrafts[faultId]?.trim()

  if (!content) return

  try {
    await repairStore.addRepairFaultComment(repair.value.id, faultId, content)
    faultCommentDrafts[faultId] = ''
    uiStore.addToast({
      type: 'success',
      title: 'Komentarz dodany',
      message: 'Dodano komentarz do usterki.',
    })
  } catch {
    showMutationError('Nie udało się dodać komentarza', 'Spróbuj ponownie za chwilę.')
  }
}

async function handleFaultPhotoSelection(faultId: number, event: Event) {
  if (!repair.value) return

  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
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
      uiStore.addToast({
        type: 'success',
        title: 'Zdjęcie dodane',
        message: 'Zdjęcie zostało dodane do usterki.',
      })
    } catch {
      // Global API interceptor shows backend errors, including 413.
    }
  }

  input.value = ''
}

function clearFaultLocalData(faultId: number) {
  const fault = repair.value?.faults.find((item) => item.id === faultId)
  ;(fault?.photos || []).forEach((photo) => revokePhotoObjectUrl(photo.id))
  delete faultPhotoErrors[faultId]
  delete faultCommentDrafts[faultId]

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
  if (!repair.value) {
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

  try {
    const details = await repairStore.loadRepairDetail(repairId.value)

    if (details) {
      resetEditForm(details)
      syncFaultEditRows(details.faults || [])
      syncFaultExpandedRows(details.faults || [], true)
    }
  } catch {
    showMutationError('Nie udało się pobrać naprawy', 'Spróbuj odświeżyć stronę.')
  }
}

async function refreshRepair() {
  const details = await repairStore.refreshCurrentRepair({ silent: true })

  if (details) {
    resetEditForm(details)
    syncFaultEditRows(details.faults || [])
    syncFaultExpandedRows(details.faults || [])
  }
}

async function updateRepairDetails() {
  if (!repair.value) {
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
      placeId: mechanicIdValue(editForm.placeId),
      plannedArrivalAt: toIsoDateTime(editForm.arrivalAt),
      plannedDepartureAt: toIsoDateTime(editForm.departureAt),
      status: editForm.status,
      description: nullableDescription(editForm.description),
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
  if (!repair.value) {
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
  if (!repair.value || !repairStatusAction.value) {
    return
  }

  const action = repairStatusAction.value
  const nextStatus = action === 'close' ? 'done' : 'at_location'

  try {
    await repairStore.updateRepair(repair.value.id, { status: nextStatus })
    repairStatusAction.value = null
    uiStore.addToast({
      type: 'success',
      title: action === 'close' ? 'Naprawa zamknięta' : 'Naprawa otwarta',
      message: action === 'close'
        ? 'Status naprawy zmieniono na zakończona.'
        : 'Status naprawy zmieniono na „W lokalizacji”.',
    })
  } catch {
    showMutationError(
      action === 'close' ? 'Nie udało się zamknąć naprawy' : 'Nie udało się otworzyć naprawy',
      'Spróbuj ponownie za chwilę.',
    )
  }
}

async function toggleFaultDone(fault: RepairFault) {
  if (!repair.value) {
    return
  }

  if (fault.status === 'DONE') {
    faultToReopen.value = fault
    return
  }

  faultToComplete.value = fault
}

async function confirmCompleteFault() {
  if (!repair.value || !faultToComplete.value) {
    return
  }

  try {
    await repairStore.updateRepairFault(repair.value.id, faultToComplete.value.id, {
      description: faultToComplete.value.description,
      status: 'done',
      note: faultToComplete.value.note || 'Oznaczone jako wykonane',
      assignedMechanicId: null,
      completedByMechanicId: null,
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
  if (!repair.value || !faultToReopen.value) {
    return
  }

  try {
    await repairStore.updateRepairFault(repair.value.id, faultToReopen.value.id, {
      description: faultToReopen.value.description,
      status: 'open',
      note: null,
      assignedMechanicId: null,
      completedByMechanicId: null,
    })
    expandedFaultIds.value = new Set([...expandedFaultIds.value, faultToReopen.value.id])
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
  if (!repair.value || !faultToDelete.value) {
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
  if (!repair.value) {
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
  if (!repair.value) {
    return
  }

  const changedFaults = (repair.value.faults || []).filter((fault) => {
    const row = faultEditRows[fault.id]
    return row && row.description.trim() !== fault.description
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
      assignedMechanicId: null,
    })
    expandedFaultIds.value = new Set([...expandedFaultIds.value, createdFault.id])
    let failedUploads = 0

    for (const draft of newFaultPhotoDrafts.value) {
      try {
        const photo = await repairStore.uploadRepairFaultPhoto(repair.value.id, createdFault.id, draft.file)
        await loadPhotoObjectUrl(photo)
      } catch {
        failedUploads += 1
      }
    }

    newDetailFault.description = ''
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
  if (!repairToDelete.value) {
    return
  }

  try {
    await repairStore.deleteRepair(repairToDelete.value.id)
    repairToDelete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Naprawa usunięta',
      message: 'Usunięto naprawę.',
    })
    await router.push({ name: 'repairs' })
  } catch {
    showMutationError('Nie udało się usunąć naprawy', 'Spróbuj ponownie za chwilę.')
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

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handlePreviewKeydown)
  clearNewFaultPhotoDrafts()
  revokeAllPhotoObjectUrls()
  repairStore.clearCurrentRepair()
})
</script>

<style scoped>
.icon-button {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  color: rgb(100 116 139);
  transition: background-color 150ms ease, color 150ms ease;
}

.icon-button:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

:global(.dark) .icon-button {
  border-color: #5a5a60;
  color: #b9bac2;
}

:global(.dark) .icon-button:hover {
  background: #48484d;
  color: rgb(248 250 252);
}

.fault-description-scroll {
  scrollbar-color: rgb(var(--rw-app-border)) transparent;
  scrollbar-width: thin;
}

.fault-description-scroll::-webkit-scrollbar {
  height: 4px;
}

.fault-description-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.fault-description-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background: rgb(var(--rw-app-border));
}
</style>
