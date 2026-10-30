<template>
  <div class="space-y-3 md:flex md:h-full md:min-h-0 md:flex-col md:gap-3 md:space-y-0 md:overflow-hidden">
    <header class="flex shrink-0 flex-col items-start gap-3">
      <div class="flex items-center gap-3">
        <AppIconLink class="md:hidden" :to="{ name: 'vehicles' }" label="Wróć do listy pojazdów" size="sm">
          <ArrowLeft class="h-4 w-4" />
        </AppIconLink>
        <div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pojazd</p>
          <h1 class="mt-1 ui-page-title">
            {{ vehicle?.licensePlate || 'Szczegóły pojazdu' }}
          </h1>
        </div>
      </div>

      <AppTabs v-if="vehicle" v-model="activeTab" :items="visibleVehicleTabs" size="sm" variant="underline" aria-label="Sekcje pojazdu" />

    </header>

    <div v-if="!vehicle && fleetStore.isVehiclesLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie pojazdu...
    </div>

    <div v-else-if="!vehicle" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono pojazdu.
    </div>

    <div
      v-else-if="activeTab === 'information'"
      class="vehicle-information-layout min-w-0 md:min-h-0 md:flex-1"
    >
        <AppCard class="vehicle-information-card flex min-h-0 min-w-0 flex-col" title="Informacje" :icon="Info" compact content-class="!p-0 min-h-0 flex-1 overflow-y-auto">
          <template #actions>
            <div class="flex h-8 w-[4.5rem] items-center justify-end gap-2">
              <template v-if="isEditModalOpen">
                <AppIconButton label="Anuluj edycję informacji" size="sm" variant="ghost" :disabled="isUpdatingVehicle" @click="closeEditModal"><X class="h-4 w-4" /></AppIconButton>
                <AppIconButton label="Zapisz informacje" form="vehicle-inline-edit-form" type="submit" size="sm" :loading="isUpdatingVehicle"><Check class="h-4 w-4" /></AppIconButton>
              </template>
              <span v-else ref="informationMenuAnchor" class="inline-flex">
                <AppIconButton label="Opcje informacji" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isInformationMenuOpen" @click="isInformationMenuOpen = !isInformationMenuOpen"><Ellipsis class="h-4 w-4" /></AppIconButton>
              </span>
            </div>
            <AppDropdown :open="isInformationMenuOpen" :anchor="informationMenuAnchor" role="menu" :match-width="false" content-class="min-w-36 p-1" @close="isInformationMenuOpen = false">
              <AppDropdownItem role="menuitem" :disabled="!canUpdateVehicles" @click="openEditModal"><SquarePen class="h-4 w-4" />Edytuj</AppDropdownItem>
            </AppDropdown>
          </template>

          <form id="vehicle-inline-edit-form" @submit.prevent="submitVehicleEdit">
            <table class="vehicle-information-table w-full table-fixed border-collapse" aria-label="Informacje o pojeździe">
              <tbody>
                <InfoRow label="Numer rejestracyjny" :value="vehicle.licensePlate" :editing="isEditModalOpen" copyable>
                  <input v-model="editForm.licensePlate" class="vehicle-inline-control" aria-label="Numer rejestracyjny" :disabled="isUpdatingVehicle" required />
                </InfoRow>
                <InfoRow label="VIN" :value="vehicle.vin" :editing="isEditModalOpen" copyable>
                  <input v-model="editForm.vin" class="vehicle-inline-control" aria-label="VIN" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow label="Pierwsza rejestracja" :value="formatDate(vehicle.firstRegistration)" :editing="isEditModalOpen" copyable>
                  <AppDatePicker v-model="editForm.firstRegistration" inline editable aria-label="Pierwsza rejestracja" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow label="Typ pojazdu" :value="vehicleTypeLabel(vehicle.type)" :editing="isEditModalOpen">
                  <template #display><span class="inline-flex items-center gap-1.5"><VehicleTypeIcon :type="vehicle.type" class="h-4 w-4" />{{ vehicleTypeLabel(vehicle.type) }}</span></template>
                  <AppSelect v-model="editForm.type" inline aria-label="Typ pojazdu" :options="vehicleTypeFormOptions" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow label="Marka" :value="vehicle.make" :editing="isEditModalOpen">
                  <input v-model="editForm.make" class="vehicle-inline-control" aria-label="Marka" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow label="Rok produkcji" :value="formatValue(vehicle.productionYear)" :editing="isEditModalOpen">
                  <input v-model="editForm.productionYear" class="vehicle-inline-control" type="number" aria-label="Rok produkcji" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow v-if="vehicle.type !== 'TRAILER'" label="Zbiornik paliwa" :value="fuelTankLabel(vehicle.fuelTank)" :editing="isEditModalOpen">
                  <input v-model="editForm.fuelTank" class="vehicle-inline-control" type="number" aria-label="Zbiornik paliwa" :disabled="isUpdatingVehicle || editForm.type === 'TRAILER'" />
                </InfoRow>
                <InfoRow label="Ostatnia pozycja" :value="formatDateTime(vehicle.lastPositionAt)" />
                <InfoRow label="Przebieg" :value="historyMetric(vehicleMileage, 'km')" />
                <InfoRow label="Status" :value="statusLabel(vehicle.status)" :editing="isEditModalOpen">
                  <AppSelect v-model="editForm.status" inline aria-label="Status" :options="vehicleStatusFormOptions" :disabled="isUpdatingVehicle" />
                </InfoRow>
                <InfoRow label="Opis pojazdu" :value="vehicle.description" :editing="isEditModalOpen" multiline>
                  <textarea v-model="editForm.description" class="vehicle-inline-control !resize-none" aria-label="Opis pojazdu" :maxlength="1000" :disabled="isUpdatingVehicle" />
                </InfoRow>
              </tbody>
            </table>
          </form>
        </AppCard>

        <div class="vehicle-information-sidebar grid min-h-0 min-w-0 gap-3" :class="vehicle.type === 'TRAILER' ? 'vehicle-information-sidebar--trailer' : ''">
          <AppCard class="flex min-h-0 min-w-0 flex-col" :title="vehicle.type === 'TRAILER' ? 'Przegląd techniczny' : 'Przeglądy i winiety'" :icon="CalendarCheck" compact content-class="!p-3 min-h-0 flex-1 overflow-y-auto">
            <template #actions>
              <div class="flex h-8 w-[4.5rem] items-center justify-end gap-2">
                <template v-if="isEditingInspections">
                  <AppIconButton label="Anuluj edycję przeglądów i winiet" size="sm" variant="ghost" :disabled="isUpdatingInspections" @click="closeInspectionEdit"><X class="h-4 w-4" /></AppIconButton>
                  <AppIconButton label="Zapisz przeglądy i winiety" form="vehicle-inspection-edit-form" type="submit" size="sm" :loading="isUpdatingInspections"><Check class="h-4 w-4" /></AppIconButton>
                </template>
                <span v-else ref="inspectionMenuAnchor" class="inline-flex">
                  <AppIconButton label="Opcje przeglądów i winiet" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isInspectionMenuOpen" @click="isInspectionMenuOpen = !isInspectionMenuOpen"><Ellipsis class="h-4 w-4" /></AppIconButton>
                </span>
              </div>
              <AppDropdown :open="isInspectionMenuOpen" :anchor="inspectionMenuAnchor" role="menu" :match-width="false" content-class="min-w-36 p-1" @close="isInspectionMenuOpen = false">
                <AppDropdownItem role="menuitem" :disabled="!canUpdateVehicles" @click="openInspectionEdit"><SquarePen class="h-4 w-4" />Edytuj</AppDropdownItem>
              </AppDropdown>
            </template>
            <form id="vehicle-inspection-edit-form" class="space-y-1.5" @submit.prevent="submitInspectionEdit">
              <InspectionRow v-for="field in visibleInspectionFields" :key="field.key" v-model="inspectionEditForm[field.key]" :label="field.label" :date="vehicle[field.key]" :editing="isEditingInspections" :disabled="isUpdatingInspections" />
            </form>
          </AppCard>

          <div class="vehicle-device-telemetry grid min-h-0 min-w-0 grid-cols-2 self-start gap-3">
            <AppCard class="flex min-h-0 min-w-0 flex-col" title="Urządzenie" :icon="Cpu" compact content-class="!p-2 flex min-h-16 flex-1 items-center justify-center text-center">
              <template v-if="vehicle.assignedDeviceId" #actions>
                <span ref="deviceMenuAnchor" class="inline-flex">
                  <AppIconButton label="Opcje urządzenia" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isDeviceMenuOpen" @click="isDeviceMenuOpen = !isDeviceMenuOpen">
                    <Ellipsis class="h-4 w-4" />
                  </AppIconButton>
                </span>
                <AppDropdown :open="isDeviceMenuOpen" :anchor="deviceMenuAnchor" role="menu" :match-width="false" content-class="min-w-44 p-1" @close="isDeviceMenuOpen = false">
                  <AppDropdownItem role="menuitem" :disabled="!canAssignDevices" @click="openAssignDeviceModal"><Plus class="h-4 w-4" />Przypisz urządzenie</AppDropdownItem>
                  <AppDropdownItem role="menuitem" :disabled="!canAssignDevices" @click="openUnassignDeviceModal"><Unplug class="h-4 w-4" />Odepnij urządzenie</AppDropdownItem>
                </AppDropdown>
              </template>
              <div v-if="vehicle.assignedDeviceId" class="flex min-w-0 flex-col items-center justify-center text-center">
                <div class="min-w-0">
                  <RouterLink v-if="canReadDevices" :to="{ name: 'device-detail', params: { id: vehicle.assignedDeviceId } }" class="break-words text-sm font-semibold text-ui-text underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus">{{ vehicle.assignedDeviceName || 'Urządzenie GPS' }}</RouterLink>
                  <p v-else class="break-words text-sm font-semibold text-ui-text">{{ vehicle.assignedDeviceName || 'Urządzenie GPS' }}</p>
                  <p class="mt-1 ui-caption">#{{ vehicle.assignedDeviceId }}</p>
                </div>
              </div>
              <AppButton v-else variant="secondary" class="min-h-16 w-full !h-auto flex-col !border-dashed py-2" :disabled="!canAssignDevices" :title="!canAssignDevices ? 'Brak uprawnienia: devices.assign' : undefined" @click="openAssignDeviceModal">
                <Plus class="h-5 w-5" />Przypisz urządzenie
              </AppButton>
            </AppCard>
            <AppCard class="flex min-h-0 min-w-0 flex-col" title="Bateria" :icon="Battery" compact content-class="!p-2 flex min-h-16 flex-1 items-center justify-center">
              <VehicleBatteryLevel :level="vehicleBatteryLevel" class="!text-lg" icon-class="!h-5 !w-5" />
            </AppCard>
          </div>
        </div>
        <AppCard class="vehicle-location-card flex min-h-0 min-w-0 flex-col" title="Lokalizacja pojazdu" :icon="MapPin" compact content-class="!p-0 min-h-0 flex-1 relative">
          <VehicleLocationPreview :vehicle="vehicle" />
        </AppCard>
    </div>

    <div v-else-if="activeTab === 'service'" class="vehicle-service-layout min-w-0 md:min-h-0 md:flex-1" :class="showPlannedVehicleSections && vehicle.type === 'TRAILER' && wheelTelemetry ? 'vehicle-service-layout--trailer' : ''">
        <AppCard v-if="showPlannedVehicleSections && vehicle.type === 'TRAILER' && wheelTelemetry" class="vehicle-axles-card flex min-h-0 min-w-0 flex-col" title="Osie, opony i okładziny" :icon="Truck" compact content-class="min-h-0 flex-1 !p-3">
          <template #actions>
            <div class="flex items-center gap-2">
              <AppBadge :variant="wheelTelemetry.source === 'mock' ? 'neutral' : 'info'">{{ wheelTelemetry.source === 'mock' ? 'Mockup' : 'Odczyty API' }}</AppBadge>
              <AppIconButton v-if="wheelTelemetry.source === 'mock'" label="Odśwież dane demonstracyjne" :disabled="maintenanceStore.loadingByVehicleId[vehicleId]" @click="maintenanceStore.refreshMockReadings(vehicleId)"><RefreshCw class="h-4 w-4" :class="maintenanceStore.loadingByVehicleId[vehicleId] ? 'animate-spin' : ''" /></AppIconButton>
            </div>
          </template>
          <p v-if="maintenanceStore.errorsByVehicleId[vehicleId]" class="mb-3 ui-error" role="alert">{{ maintenanceStore.errorsByVehicleId[vehicleId] }}</p>
          <TrailerAxleDiagram :wheels="wheelTelemetry.wheels" :selected-wheel-id="maintenanceStore.selectedWheelByVehicleId[vehicleId] || '1-left'" @select-wheel="maintenanceStore.selectWheel(vehicleId, $event)" />
        </AppCard>
      <div class="vehicle-service-sidebar flex min-h-0 min-w-0 flex-col gap-3">
        <VehicleServiceIntervals v-if="showPlannedVehicleSections && serviceSchedule" class="vehicle-service-intervals shrink-0" :schedule="serviceSchedule" />
      <AppCard class="vehicle-repair-history flex min-h-0 min-w-0 flex-1 flex-col" compact content-class="!p-0 flex min-h-0 flex-1 flex-col">
        <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ui-divider p-3">
          <h2 class="ui-section-title inline-flex items-center gap-2"><History class="h-4 w-4 text-ui-icon" />Historia napraw</h2>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton v-if="canReadRepairs" size="sm" variant="secondary" @click="openServiceHistory"><CalendarCheck class="h-4 w-4" />Kalendarz</AppButton>
            <AppButton v-if="canAddFault" size="sm" @click="isRepairCreateOpen = true"><Plus class="h-4 w-4" />Dodaj usterkę</AppButton>
          </div>
        </div>
        <p v-if="!canReadRepairs" class="p-4 ui-body-sm text-ui-mutedText">Nie masz dostępu do historii napraw.</p>
        <p v-else-if="isRepairsLoading && !repairHistory.length" class="p-4 ui-body-sm text-ui-mutedText" role="status">Pobieranie historii napraw...</p>
        <div v-else-if="repairHistoryError" class="space-y-2 p-4" role="alert"><p class="ui-error">{{ repairHistoryError }}</p><AppButton size="sm" variant="secondary" @click="loadRepairHistory">Spróbuj ponownie</AppButton></div>
        <p v-else-if="!repairHistory.length" class="p-4 ui-body-sm text-ui-mutedText">Brak napraw tego pojazdu.</p>
        <div v-else class="min-h-0 overflow-y-auto divide-y divide-ui-divider">
          <article v-for="repair in repairHistory" :key="repairKey(repair)" class="min-w-0">
            <button type="button" class="flex w-full items-center gap-3 p-3 text-left transition hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus" :aria-expanded="isRepairExpanded(repair)" @click="toggleRepairHistory(repair)">
              <span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-ui-text">{{ repairTitle(repair) }}</span><span class="mt-1 block break-words ui-caption">{{ repairDate(repair) }} · {{ repairPlace(repair) }}</span></span>
              <AppBadge :variant="repairStatusVariant(repair)">{{ repairStatus(repair) }}</AppBadge>
              <ChevronDown class="h-4 w-4 shrink-0 text-ui-icon transition" :class="isRepairExpanded(repair) ? 'rotate-180' : ''" />
            </button>
            <div v-if="isRepairExpanded(repair)" class="space-y-3 border-t border-ui-divider bg-ui-muted p-3">
              <ul v-if="canReadFaults && repairFaults(repairDetail(repair)).length" class="space-y-2">
                <li v-for="fault in repairFaults(repairDetail(repair))" :key="repairFaultKey(fault)" class="flex items-start gap-2 text-sm text-ui-text">
                  <CircleCheck v-if="repairFaultStatusLabel(fault) === 'Zrobiona'" class="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" /><Circle v-else class="mt-0.5 h-4 w-4 shrink-0 text-ui-icon" /><span class="min-w-0 break-words">{{ repairFaultDescription(fault) }}</span>
                </li>
              </ul>
              <p v-else-if="canReadFaults" class="ui-caption">Brak usterek.</p>
              <RouterLink v-if="repair.id" :to="{ name: 'repair-detail', params: { id: repair.id } }" class="inline-flex h-8 items-center gap-2 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface px-3 text-xs font-semibold text-ui-text hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"><ExternalLink class="h-3.5 w-3.5" />Przejdź do szczegółów</RouterLink>
            </div>
          </article>
        </div>
      </AppCard>
      </div>
    </div>

    <div v-else class="vehicle-documents-layout grid min-w-0 gap-3 md:min-h-0 md:flex-1 lg:items-stretch" :class="showPlannedVehicleSections ? 'lg:grid-cols-2' : ''">
        <AppCard v-if="showPlannedVehicleSections" class="flex min-h-0 min-w-0 flex-col" title="Dokumenty pojazdu" :icon="Files" compact content-class="min-h-0 flex-1 overflow-y-auto">
          <div class="grid gap-2">
            <div
              v-for="document in mockedDocuments"
              :key="document"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border"
            >
              <div class="flex min-w-0 items-center gap-2">
                <FileText class="h-4 w-4 shrink-0 text-slate-400" />
                <span class="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{{ document }}</span>
              </div>
              <AppBadge variant="neutral">Mock</AppBadge>
            </div>
          </div>
        </AppCard>

        <AppCard v-if="canReadVehiclePhotos" class="flex min-h-0 min-w-0 flex-col" title="Zdjęcia pojazdu" :icon="Images" compact content-class="min-h-0 flex-1 overflow-y-auto">
          <VehiclePhotoGallery :vehicle-id="vehicle.id" />
        </AppCard>
    </div>
    <RepairCreateModal :open="isRepairCreateOpen" :initial-vehicle-id="vehicle?.id" lock-vehicle quick-report @close="isRepairCreateOpen = false" @created="loadRepairHistory" @open-repair="openCreatedRepair" />
    <AppModal
      :open="isServiceHistoryOpen"
      title="Historia serwisowa"
      size="full"
      body-class="!min-h-0 !overflow-hidden !p-0"
      @close="isServiceHistoryOpen = false"
    >
      <div class="grid h-full min-h-0 lg:grid-cols-[30rem_minmax(0,1fr)]">
        <aside class="min-h-0 overflow-y-auto border-b border-ui-divider bg-ui-muted p-3 lg:border-b-0 lg:border-r">
          <div v-if="isRepairsLoading" class="p-4 ui-body-sm text-ui-mutedText">Pobieranie historii...</div>
          <div v-else-if="!repairHistory.length" class="rounded-[var(--rw-radius-control)] border border-dashed border-ui-border p-4 ui-body-sm text-ui-mutedText">
            Brak wpisów w książce serwisowej.
          </div>
          <div v-else class="ui-table-shell overflow-x-auto">
            <table class="ui-table w-full min-w-[27rem]">
              <thead class="ui-table-head">
                <tr>
                  <th class="ui-table-cell font-medium">Naprawa</th>
                  <th class="ui-table-cell w-28 font-medium">Termin</th>
                  <th class="ui-table-cell w-28 font-medium">Status</th>
                  <th class="ui-table-cell w-10"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="repair in repairHistory" :key="repairKey(repair)">
                  <tr class="ui-table-row cursor-pointer" @click="handleRepairHistoryClick(repair)">
                    <td class="ui-table-cell">
                      <p class="truncate font-semibold text-ui-text">{{ repairTitle(repair) }}</p>
                      <p class="mt-0.5 truncate ui-caption">{{ repairPlace(repair) }}</p>
                    </td>
                    <td class="ui-table-cell w-36 align-middle ui-caption">{{ serviceRepairRangeLabel(repair) }}</td>
                    <td class="ui-table-cell align-middle">
                      <AppBadge :variant="repairStatusVariant(repair)">{{ repairStatus(repair) }}</AppBadge>
                    </td>
                    <td class="ui-table-cell text-right">
                      <ChevronDown class="h-4 w-4 text-ui-icon transition" :class="isRepairExpanded(repair) ? 'rotate-180' : ''" />
                    </td>
                  </tr>
                  <tr v-if="isRepairExpanded(repair)">
                    <td colspan="4" class="border-b border-ui-divider bg-ui-muted p-3">
                      <div class="space-y-2.5">
                        <ul v-if="repairFaults(repairDetail(repair)).length" class="space-y-1.5">
                          <li
                            v-for="fault in repairFaults(repairDetail(repair))"
                            :key="repairFaultKey(fault)"
                            class="flex items-start justify-between gap-2 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface p-2"
                          >
                            <span class="min-w-0 text-xs font-medium text-ui-text">{{ repairFaultDescription(fault) }}</span>
                            <AppBadge :variant="repairFaultStatusVariant(fault)">{{ repairFaultStatusLabel(fault) }}</AppBadge>
                          </li>
                        </ul>
                        <p v-else class="rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface p-2 ui-caption">Brak usterek.</p>
                        <RouterLink
                          v-if="repair.id"
                          class="inline-flex h-8 items-center gap-1.5 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface px-2.5 text-xs font-semibold text-ui-text transition hover:bg-ui-hover"
                          :to="{ name: 'repair-detail', params: { id: repair.id } }"
                        >
                          <ExternalLink class="h-3.5 w-3.5" />
                          Przejdź do szczegółów
                        </RouterLink>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </aside>

        <section class="hidden min-h-0 flex-col bg-ui-surface p-3 sm:p-4 lg:flex">
          <header class="mb-3 flex items-center justify-between gap-3 border-b border-ui-divider pb-3">
            <AppIconButton label="Poprzedni miesiąc" :disabled="!canGoToPreviousServiceMonth" @click="changeServiceHistoryMonth(-1)">
              <ChevronLeft class="h-4 w-4" />
            </AppIconButton>
            <h3 class="text-sm font-semibold capitalize text-ui-text sm:text-base">{{ serviceHistoryMonthLabel }}</h3>
            <AppIconButton label="Następny miesiąc" :disabled="!canGoToNextServiceMonth" @click="changeServiceHistoryMonth(1)">
              <ChevronRight class="h-4 w-4" />
            </AppIconButton>
          </header>

          <div ref="serviceCalendarScrollElement" class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1" @scroll.passive="syncServiceHistoryMonthFromScroll">
            <article
              v-for="month in serviceCalendarMonths"
              :id="serviceCalendarMonthId(month.date)"
              :key="month.key"
              class="service-calendar-month scroll-mt-2"
              :data-month-date="month.key"
            >
              <h4 class="mb-2 text-sm font-semibold capitalize text-ui-text">{{ month.label }}</h4>
              <div class="grid grid-cols-7 border-l border-t border-ui-divider text-center">
                <div v-for="dayName in serviceCalendarWeekdays" :key="`${month.key}-${dayName}`" class="border-b border-r border-ui-divider bg-ui-muted px-1 py-2 ui-caption">
                  {{ dayName }}
                </div>
              </div>
              <div class="service-calendar-grid relative grid grid-cols-7 grid-rows-6 overflow-hidden border-l border-ui-divider">
                <div
                  v-for="day in month.days"
                  :key="`${month.key}-${day.key}`"
                  class="service-calendar-day min-h-20 border-b border-r border-ui-divider p-2"
                  :class="[
                    day.isCurrentMonth ? 'bg-ui-surface' : 'bg-ui-muted text-ui-mutedText',
                    day.isToday ? 'relative z-[1] ring-1 ring-inset ring-danger-400 bg-danger-50/30 dark:bg-danger-500/5' : '',
                  ]"
                >
                  <span
                    class="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-transparent px-1 text-[11px] font-semibold"
                  >
                    {{ day.date.getDate() }}
                  </span>
                </div>

                <div class="pointer-events-none absolute inset-0 grid grid-cols-7 grid-rows-6">
                  <AppPopover
                  v-for="segment in month.segments"
                  :key="segment.key"
                  :open="openServiceCalendarPopoverKey === segment.key"
                  :open-on-hover="true"
                  :hover-delay="700"
                  :match-width="false"
                  :use-anchor-min-width="false"
                  :max-height="440"
                  :trigger-class="serviceCalendarSegmentTriggerClass(segment)"
                  :trigger-style="serviceCalendarSegmentStyle(segment)"
                  :trigger-id="segment.isFirstForRepair ? serviceRepairAnchorId(segment.repair) : undefined"
                  content-class="w-80 overflow-hidden p-0"
                  @update:open="setServiceCalendarPopover(segment.key, $event)"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="block h-5 w-full truncate px-2 py-1 text-left text-[10px] font-semibold leading-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus sm:text-[11px]"
                      :class="serviceCalendarRepairClass(segment.repair)"
                      :aria-label="`Pokaż szczegóły: ${repairTitle(segment.repair)}`"
                    >
                      {{ repairPlace(segment.repair) }}
                    </button>
                  </template>

                  <div class="border-b border-ui-divider bg-ui-muted px-3 py-2.5">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-ui-text">{{ repairTitle(segment.repair) }}</p>
                        <p class="mt-0.5 truncate ui-caption">{{ repairPlace(segment.repair) }}</p>
                        <p class="mt-1 text-xs font-medium text-ui-text-secondary">{{ serviceRepairRangeLabel(segment.repair) }}</p>
                      </div>
                      <AppBadge :variant="repairStatusVariant(segment.repair)">{{ repairStatus(segment.repair) }}</AppBadge>
                    </div>
                  </div>
                  <div class="space-y-2.5 p-3">
                    <p v-if="repairDescription(segment.repair)" class="line-clamp-3 border-t border-ui-divider pt-2 text-xs leading-5 text-ui-text-secondary">
                      {{ repairDescription(segment.repair) }}
                    </p>
                    <div class="border-t border-ui-divider pt-2">
                      <p class="mb-1.5 text-xs font-semibold text-ui-text">Usterki</p>
                      <div v-if="repairFaults(repairDetail(segment.repair)).length" class="max-h-36 space-y-1 overflow-y-auto pr-1">
                        <div
                          v-for="fault in repairFaults(repairDetail(segment.repair))"
                          :key="repairFaultKey(fault)"
                          class="flex items-start gap-2 rounded-[6px] bg-ui-muted px-2 py-1.5"
                        >
                          <Check v-if="repairFaultStatusLabel(fault) === 'Zrobiona'" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400" />
                          <span v-else class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-ui-border-strong" />
                          <div class="min-w-0 flex-1">
                            <p class="break-words text-xs font-medium leading-4 text-ui-text">{{ repairFaultDescription(fault) }}</p>
                            <p v-if="repairFaultVisibleNote(fault)" class="mt-0.5 break-words ui-caption">{{ repairFaultVisibleNote(fault) }}</p>
                          </div>
                        </div>
                      </div>
                      <p v-else class="rounded-[6px] bg-ui-muted px-2 py-1.5 ui-caption">Brak usterek.</p>
                    </div>
                    <RouterLink
                      v-if="segment.repair.id"
                      :to="{ name: 'repair-detail', params: { id: segment.repair.id } }"
                      class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-ui-border bg-ui-surface px-3 text-sm font-medium text-ui-text-secondary shadow-soft transition hover:border-ui-border-strong hover:bg-ui-hover hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                    >
                      <ExternalLink class="h-4 w-4" />
                      Przejdź do szczegółów
                    </RouterLink>
                  </div>
                  </AppPopover>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </AppModal>

    <AppModal :open="isAssignDeviceModalOpen" title="Przypisz urządzenie" :description="`Wyszukaj urządzenie do przypisania do ${vehicle?.licensePlate || 'pojazdu'}.`" size="sm" :busy="isAssigningDevice" @close="closeAssignDeviceModal">
      <form id="assign-vehicle-device-form" @submit.prevent="assignDevice">
        <DeviceSelect v-if="isAssignDeviceModalOpen" v-model="deviceIdInput" label="Urządzenie" placeholder="Szukaj po nazwie lub ID urządzenia" :reload-key="devicesReloadKey" :disabled="!canAssignDevices || isAssigningDevice" />
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="isAssigningDevice" @click="closeAssignDeviceModal">Anuluj</AppButton>
        <AppButton type="submit" form="assign-vehicle-device-form" :loading="isAssigningDevice" :disabled="!canAssignDevices || !deviceIdInput.trim()">Przypisz urządzenie</AppButton>
      </template>
    </AppModal>

    <AppConfirmModal
      :open="isUnassignDeviceModalOpen"
      title="Odpiąć urządzenie?"
      :description="unassignDeviceDescription"
      confirm-label="Odepnij urządzenie"
      confirm-variant="danger"
      :busy="isUnassigningDevice"
      @close="closeUnassignDeviceModal"
      @confirm="unassignDevice"
    />
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceDirty, useWorkspaceTitle, useWorkspaceViewState } from '@/composables/useWorkspace'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Battery, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, Copy, Cpu, Ellipsis, ExternalLink, FileText, Files, History, Images, Info, MapPin, Plus, RefreshCw, SquarePen, Truck, Unplug, Wrench, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppTabs, { type AppTabItem } from '@/components/ui/AppTabs.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPopover from '@/components/ui/AppPopover.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import DeviceSelect from '@/components/selects/DeviceSelect.vue'
import VehiclePhotoGallery from '@/components/vehicles/VehiclePhotoGallery.vue'
import VehicleLocationPreview from '@/components/vehicles/VehicleLocationPreview.vue'
import VehicleBatteryLevel from '@/components/vehicles/VehicleBatteryLevel.vue'
import VehicleTypeIcon from '@/components/vehicles/VehicleTypeIcon.vue'
import TrailerAxleDiagram from '@/components/vehicles/TrailerAxleDiagram.vue'
import VehicleServiceIntervals from '@/components/vehicles/VehicleServiceIntervals.vue'
import RepairCreateModal from '@/components/repairs/RepairCreateModal.vue'
import { vehicleService, type VehiclePayload } from '@/services/vehicleService'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore, type VehicleRepairHistoryItem } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import { useVehicleMaintenanceStore } from '@/stores/vehicleMaintenanceStore'
import { historyMetric } from '@/utils/localPositionHistory'
import type { ApiVehicle } from '@/types/fleet'
import type { Repair, RepairComment, RepairFault } from '@/types/repair'

type VehicleForm = ReturnType<typeof createEmptyVehicleForm>
type RepairHistoryLike = VehicleRepairHistoryItem
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info'
interface ServiceCalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
}
interface ServiceCalendarRangeSegment {
  key: string
  repair: RepairHistoryLike
  row: number
  startColumn: number
  columnSpan: number
  lane: number
  isFirstForRepair: boolean
}
interface ServiceCalendarMonth {
  key: string
  date: Date
  label: string
  days: ServiceCalendarDay[]
  segments: ServiceCalendarRangeSegment[]
}
type RepairHistoryFault = RepairFault | string | {
  id?: number | string
  name?: string | null
  description?: string | null
  status?: string | null
  note?: string | null
  assignedMechanicFullName?: string | null
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const maintenanceStore = useVehicleMaintenanceStore()
const activeTab = ref('information')
// Keep planned mock sections available for later without showing them in the vehicle view.
const showPlannedVehicleSections = false
const vehicleTabs: AppTabItem[] = [
  { value: 'information', label: 'Informacje', icon: Info },
  { value: 'service', label: 'Serwis', icon: Wrench },
  { value: 'documents', label: showPlannedVehicleSections ? 'Dokumenty i zdjęcia' : 'Zdjęcia', icon: showPlannedVehicleSections ? Files : Images },
]
useWorkspaceViewState({ activeVehicleTab: activeTab })
const isRepairCreateOpen = ref(false)
const repairHistoryError = ref('')
const {
  vehicleRepairHistory,
  repairDetailsById,
  repairCommentsById,
  isVehicleRepairHistoryLoading: isRepairsLoading,
} = storeToRefs(repairStore)
const isEditModalOpen = ref(false)
const isInformationMenuOpen = ref(false)
const informationMenuAnchor = ref<HTMLElement | null>(null)
const isInspectionMenuOpen = ref(false)
const inspectionMenuAnchor = ref<HTMLElement | null>(null)
const isEditingInspections = ref(false)
const isUpdatingInspections = ref(false)
const inspectionFields = [
  { key: 'technicalInspection', label: 'Przegląd techniczny' },
  { key: 'tachographInspection', label: 'Legalizacja tachografu' },
  { key: 'vignetteUk', label: 'Winieta UK' },
] as const
const visibleInspectionFields = computed(() => inspectionFields.filter(field => vehicle.value?.type !== 'TRAILER' || field.key === 'technicalInspection'))
type InspectionField = typeof inspectionFields[number]['key']
const inspectionEditForm = reactive<Record<InspectionField, string>>({ technicalInspection: '', tachographInspection: '', vignetteUk: '' })
const originalInspectionForm = ref({ ...inspectionEditForm })
const isUnassignDeviceModalOpen = ref(false)
const isAssignDeviceModalOpen = ref(false)
const isDeviceMenuOpen = ref(false)
const deviceMenuAnchor = ref<HTMLElement | null>(null)
const isUpdatingVehicle = ref(false)
const isAssigningDevice = ref(false)
const isUnassigningDevice = ref(false)
const deviceIdInput = ref('')
const devicesReloadKey = ref(0)
const editForm = reactive(createEmptyVehicleForm())
const originalEditForm = ref<VehicleForm>(createEmptyVehicleForm())
const expandedRepairIds = ref<Set<string>>(new Set())
const isServiceHistoryOpen = ref(false)
const openServiceCalendarPopoverKey = ref<string | null>(null)
const focusedServiceRepairKey = ref<string | null>(null)
const serviceCalendarScrollElement = ref<HTMLElement | null>(null)
const serviceHistoryMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const serviceCalendarWeekdays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

const vehicleId = computed(() => String(route.params.id || ''))
const vehicle = computed(() => fleetStore.apiVehicles.find((item) => String(item.id) === vehicleId.value) || null)
const vehicleBatteryLevel = computed(() => fleetStore.vehicles.find(item => item.backendId === vehicle.value?.id)?.batteryLevel ?? vehicle.value?.batteryLevel ?? null)
const vehicleMileage = computed(() => fleetStore.vehicles.find(item => item.backendId === vehicle.value?.id)?.mileage ?? null)
const wheelTelemetry = computed(() => maintenanceStore.telemetryByVehicleId[vehicleId.value])
const serviceSchedule = computed(() => maintenanceStore.schedulesByVehicleId[vehicleId.value])
watch(() => [vehicleId.value, vehicle.value?.type] as const, ([id, type]) => {
  if (id && type) maintenanceStore.ensureMock(id, type === 'TRAILER')
}, { immediate: true })
useWorkspaceTitle(computed(() => vehicle.value?.licensePlate ? `Pojazd - ${vehicle.value.licensePlate}` : null))
const assignedDeviceLabel = computed(() => {
  if (!vehicle.value?.assignedDeviceId) return 'Brak'
  return vehicle.value.assignedDeviceName
    ? `${vehicle.value.assignedDeviceName} · #${vehicle.value.assignedDeviceId}`
    : `Urządzenie #${vehicle.value.assignedDeviceId}`
})
const unassignDeviceDescription = computed(() => {
  if (!vehicle.value) return ''
  return `Czy na pewno chcesz odpiąć ${assignedDeviceLabel.value} od pojazdu ${vehicle.value.licensePlate}?`
})
const repairHistory = computed(() => [...(vehicleRepairHistory.value[vehicleId.value] || [])].sort((first, second) => repairTimestamp(second) - repairTimestamp(first)))
const serviceHistoryMonthLabel = computed(() => serviceHistoryMonth.value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }))
const serviceCalendarMonths = computed<ServiceCalendarMonth[]>(() => {
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  let firstMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1)

  for (const repair of repairHistory.value) {
    const start = serviceRepairStart(repair)
    if (!start) continue
    const repairMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    if (repairMonth.getTime() < firstMonth.getTime()) firstMonth = repairMonth
  }

  const months: ServiceCalendarMonth[] = []
  const cursor = new Date(firstMonth)

  while (cursor.getTime() <= currentMonth.getTime()) {
    const date = new Date(cursor)
    const days = createServiceCalendarDays(date)
    months.push({
      key: serviceCalendarMonthKey(date),
      date,
      label: date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
      days,
      segments: createServiceCalendarSegments(date, days),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
})
const canGoToPreviousServiceMonth = computed(() => {
  const firstMonth = serviceCalendarMonths.value[0]?.date
  return Boolean(firstMonth && serviceHistoryMonth.value.getTime() > firstMonth.getTime())
})
const canGoToNextServiceMonth = computed(() => {
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  return serviceHistoryMonth.value.getTime() < currentMonth.getTime()
})
function createServiceCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)
  const todayKey = calendarDateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      key: calendarDateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: calendarDateKey(date) === todayKey,
    }
  })
}

function createServiceCalendarSegments(monthDate: Date, days: ServiceCalendarDay[]) {
  if (!days.length) return []

  const dayIndexByKey = new Map(days.map((day, index) => [day.key, index]))
  const firstDayTimestamp = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime()
  const lastDayTimestamp = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getTime()
  const occupiedLanes = Array.from({ length: 6 }, () => [] as Array<{ start: number; end: number; lane: number }>)
  const segments: ServiceCalendarRangeSegment[] = []

  const repairs = [...repairHistory.value].sort((first, second) => repairTimestamp(first) - repairTimestamp(second))

  for (const repair of repairs) {
    const range = normalizedServiceRepairRange(repair)
    if (!range) continue

    const rangeStartTimestamp = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).getTime()
    const rangeEndTimestamp = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate()).getTime()
    if (rangeEndTimestamp < firstDayTimestamp || rangeStartTimestamp > lastDayTimestamp) continue

    const clippedStart = new Date(Math.max(rangeStartTimestamp, firstDayTimestamp))
    const clippedEnd = new Date(Math.min(rangeEndTimestamp, lastDayTimestamp))
    const startIndex = dayIndexByKey.get(calendarDateKey(clippedStart))
    const endIndex = dayIndexByKey.get(calendarDateKey(clippedEnd))
    if (startIndex === undefined || endIndex === undefined) continue

    let isFirstForRepair = serviceCalendarMonthKey(range.start) === serviceCalendarMonthKey(monthDate)

    for (let row = Math.floor(startIndex / 7); row <= Math.floor(endIndex / 7); row += 1) {
      const segmentStart = Math.max(startIndex, row * 7)
      const segmentEnd = Math.min(endIndex, row * 7 + 6)
      const startColumn = segmentStart % 7
      const endColumn = segmentEnd % 7
      const rowLanes = occupiedLanes[row]
      let lane = 0

      while (rowLanes.some((item) => item.lane === lane && item.start <= endColumn && item.end >= startColumn)) {
        lane += 1
      }

      rowLanes.push({ start: startColumn, end: endColumn, lane })
      segments.push({
        key: `${serviceCalendarMonthKey(monthDate)}-${repairKey(repair)}-${row}-${startColumn}-${endColumn}`,
        repair,
        row,
        startColumn,
        columnSpan: endColumn - startColumn + 1,
        lane,
        isFirstForRepair,
      })
      isFirstForRepair = false
    }
  }

  return segments
}
const canUpdateVehicles = computed(() => hasPermission('vehicles.update'))
const canAssignDevices = computed(() => hasPermission('devices.assign'))
const canReadDevices = computed(() => hasPermission('devices.read'))
const canReadVehiclePhotos = computed(() => authStore.hasActiveCompanyPermission('vehicle_photos.read'))
const visibleVehicleTabs = computed(() => vehicleTabs.filter(tab => tab.value !== 'documents' || showPlannedVehicleSections || canReadVehiclePhotos.value))
watch(visibleVehicleTabs, tabs => {
  if (!tabs.some(tab => tab.value === activeTab.value)) activeTab.value = 'information'
}, { immediate: true })
const canReadRepairs = computed(() => hasPermission('repairs.read'))
const canReadFaults = computed(() => hasPermission('faults.read'))
const canAddFault = computed(() => hasPermission('repairs.create') && hasPermission('faults.create'))

const mockedDocuments = [
  'Dowód rejestracyjny',
  'Certyfikat emisji spalin',
  'CIF',
  'COC',
]

const vehicleTypeFormOptions: AppSelectOption[] = [
  { label: 'Ciągnik', value: 'TRUCK' },
  { label: 'Naczepa', value: 'TRAILER' },
]

const vehicleStatusFormOptions: AppSelectOption[] = [
  { label: 'Aktywny', value: 'ACTIVE' },
  { label: 'Nieaktywny', value: 'INACTIVE' },
]

const InfoRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number] as PropType<string | number | null | undefined>, default: null },
    editing: Boolean,
    multiline: Boolean,
    copyable: Boolean,
  },
  setup(props, { slots }) {
    return () => h('tr', { class: 'border-b border-ui-border last:border-b-0' }, [
      h('td', { class: 'w-[44%] border-r border-ui-border px-3 py-1 align-top ui-caption' }, [
        h('div', { class: 'py-2 leading-5' }, props.label),
      ]),
      h('td', { class: 'px-2 py-1 align-top text-left text-[13px] font-semibold leading-5 text-ui-text' }, [
        h('div', { class: 'relative min-w-0' }, [
          // Keep the display text in the flow so editors cannot change row geometry.
          h('div', { class: ['min-h-9 whitespace-pre-wrap break-words border border-transparent px-2 py-[7px]', props.copyable ? 'pr-9' : '', props.multiline ? 'min-h-[5.5rem]' : '', props.editing ? 'invisible' : ''], 'aria-hidden': props.editing || undefined }, slots.display?.() ?? formatValue(props.value)),
          props.copyable && !props.editing && props.value != null && props.value !== '' && props.value !== '-'
            ? h(AppIconButton, { label: `Kopiuj: ${props.label}`, size: 'sm', variant: 'ghost', class: 'absolute right-0 top-0.5', onClick: () => copyVehicleInformation(String(props.value), props.label) }, () => h(Copy, { class: 'h-3.5 w-3.5' }))
            : null,
          props.editing ? h('div', { class: 'absolute inset-0' }, slots.default?.()) : null,
        ]),
      ]),
    ])
  },
})

const InspectionRow = defineComponent({
  props: {
    label: { type: String, required: true },
    date: { type: String as PropType<string | null>, default: null },
    modelValue: { type: String, default: '' },
    editing: Boolean,
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      const days = daysUntil(props.date)
      const variant: 'neutral' | 'success' | 'warning' | 'error' =
        days === null ? 'neutral' : days < 15 ? 'error' : days < 30 ? 'warning' : 'success'
      return h('div', { class: 'min-w-0 space-y-1 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-muted px-2.5 py-1.5' }, [
        h('p', { class: 'text-xs font-semibold text-ui-text' }, props.label),
        h('div', { class: 'flex min-w-0 items-center justify-between gap-2' }, [
          h(AppBadge, { variant }, () => daysLabel(days)),
          h('div', { class: 'relative h-8 w-[9.5rem] min-w-0 shrink' }, [
            h('p', { class: ['flex h-full items-center justify-end px-2 ui-caption tabular-nums', props.editing ? 'invisible' : ''], 'aria-hidden': props.editing || undefined }, formatDate(props.date)),
            props.editing ? h(AppDatePicker, { inline: true, editable: true, ariaLabel: props.label, modelValue: props.modelValue, disabled: props.disabled, 'onUpdate:modelValue': (value: string) => emit('update:modelValue', value) }) : null,
          ]),
        ]),
      ])
    }
  },
})

async function copyVehicleInformation(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    uiStore.addToast({ type: 'success', title: 'Skopiowano do schowka', message: label })
  } catch {
    uiStore.addToast({ type: 'error', title: 'Nie udało się skopiować danych', message: 'Sprawdź uprawnienia schowka w przeglądarce i spróbuj ponownie.' })
  }
}

function createEmptyVehicleForm() {
  return {
    licensePlate: '',
    type: 'TRUCK',
    make: '',
    vin: '',
    firstRegistration: '',
    productionYear: '',
    technicalInspection: '',
    tachographInspection: '',
    vignetteUk: '',
    vignetteLuxembourg: '',
    vignetteDenmark: '',
    fuelTank: '',
    status: 'ACTIVE',
    description: '',
  }
}

function resetFormFromVehicle(form: VehicleForm, source: ApiVehicle) {
  Object.assign(form, {
    licensePlate: source.licensePlate || '',
    type: source.type || 'TRUCK',
    make: source.make || '',
    vin: source.vin || '',
    firstRegistration: dateInputValue(source.firstRegistration),
    productionYear: source.productionYear ? String(source.productionYear) : '',
    technicalInspection: dateInputValue(source.technicalInspection),
    tachographInspection: dateInputValue(source.tachographInspection),
    vignetteUk: dateInputValue(source.vignetteUk),
    vignetteLuxembourg: dateInputValue(source.vignetteLuxembourg),
    vignetteDenmark: dateInputValue(source.vignetteDenmark),
    fuelTank: source.fuelTank ? String(source.fuelTank) : '',
    status: source.status || 'ACTIVE',
    description: source.description || '',
  })
}

function nullableText(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function nullableNumber(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function payloadFromForm(form: VehicleForm, preserveEmptyDescription = false): VehiclePayload {
  return {
    licensePlate: form.licensePlate.trim(),
    type: form.type || null,
    make: nullableText(form.make),
    vin: nullableText(form.vin),
    firstRegistration: nullableText(form.firstRegistration),
    productionYear: nullableNumber(form.productionYear),
    technicalInspection: nullableText(form.technicalInspection),
    tachographInspection: nullableText(form.tachographInspection),
    vignetteUk: nullableText(form.vignetteUk),
    vignetteLuxembourg: nullableText(form.vignetteLuxembourg),
    vignetteDenmark: nullableText(form.vignetteDenmark),
    fuelTank: nullableNumber(form.fuelTank),
    status: form.status || null,
    description: preserveEmptyDescription ? form.description.trim() : nullableText(form.description),
  }
}

function changedPayloadFromForm(form: VehicleForm, original: VehicleForm): VehiclePayload {
  const fullPayload = payloadFromForm(form, true)
  const changedPayload: VehiclePayload = {}

  ;(Object.keys(form) as Array<keyof VehicleForm>).forEach((key) => {
    if (form[key] !== original[key]) {
      Object.assign(changedPayload, { [key]: fullPayload[key] })
    }
  })

  return changedPayload
}

function dateInputValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return isoDate ? isoDate[1] : ''
}

function formatValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

function daysUntil(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const dueDate = new Date(value)

  if (Number.isNaN(dueDate.getTime())) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function daysLabel(days: number | null) {
  if (days === null) {
    return 'Brak'
  }

  if (days < 0) {
    return `${Math.abs(days)}d po terminie`
  }

  return `${days}d`
}

function vehicleTypeLabel(type: string | null) {
  if (type === 'TRAILER') {
    return 'Naczepa'
  }

  if (type === 'TRUCK') {
    return 'Ciągnik'
  }

  return type || '-'
}

function statusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktywny',
    INACTIVE: 'Nieaktywny',
  }

  return value ? labels[value] || value : '-'
}

function fuelTankLabel(value: number | null) {
  return value ? `${value} l` : '-'
}

function devicePayloadValue(value: string) {
  const normalized = value.trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : normalized
}

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function calendarDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function serviceCalendarMonthKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function serviceCalendarMonthId(value: Date) {
  return `service-calendar-month-${serviceCalendarMonthKey(value)}`
}

function serviceRepairStart(repair: RepairHistoryLike) {
  const value = repair.arrivalTime || repair.plannedArrivalAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function serviceRepairEnd(repair: RepairHistoryLike) {
  const value = repair.departureTime || repair.plannedDepartureAt || repair.arrivalTime || repair.plannedArrivalAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function serviceCalendarRepairClass(repair: RepairHistoryLike) {
  const status = String(repair.status || '').toLowerCase()

  if (status === 'done') return 'bg-success-100/80 text-success-700 dark:bg-success-400/15 dark:text-success-400'
  if (status === 'cancelled') return 'bg-ui-muted text-ui-mutedText'
  if (status === 'at_location' || status === 'ready_to_be_repaired') return 'bg-warning-100/80 text-warning-700 dark:bg-warning-400/15 dark:text-warning-400'
  if (status === 'in_field') return 'bg-info-100/80 text-info-700 dark:bg-info-400/15 dark:text-info-400'
  return 'bg-ui-selected text-ui-text'
}

function isSameCalendarDay(first: Date, second: Date) {
  return calendarDateKey(first) === calendarDateKey(second)
}

function normalizedServiceRepairRange(repair: RepairHistoryLike) {
  const start = serviceRepairStart(repair)
  const end = serviceRepairEnd(repair)

  if (!start || !end) return null
  return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start }
}

function serviceCalendarSegmentStyle(segment: ServiceCalendarRangeSegment) {
  return {
    gridColumn: `${segment.startColumn + 1} / span ${segment.columnSpan}`,
    gridRow: `${segment.row + 1}`,
    marginTop: `${28 + segment.lane * 24}px`,
  }
}

function serviceCalendarSegmentTriggerClass(segment: ServiceCalendarRangeSegment) {
  return [
    'service-calendar-overlay-range',
    focusedServiceRepairKey.value === repairKey(segment.repair) ? 'service-calendar-overlay-range--focused' : '',
  ].filter(Boolean).join(' ')
}

function serviceRepairAnchorId(repair: RepairHistoryLike) {
  return `service-repair-${repairKey(repair).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function setServiceCalendarPopover(key: string, open: boolean) {
  if (open) {
    openServiceCalendarPopoverKey.value = key
  } else if (openServiceCalendarPopoverKey.value === key) {
    openServiceCalendarPopoverKey.value = null
  }
}

function serviceRepairRangeLabel(repair: RepairHistoryLike) {
  const range = normalizedServiceRepairRange(repair)
  if (!range) return '-'

  const format = (date: Date) => date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  if (isSameCalendarDay(range.start, range.end)) return format(range.start)
  return `${format(range.start)} - ${format(range.end)}`
}

function clampServiceHistoryMonth(value: Date) {
  const requestedMonth = new Date(value.getFullYear(), value.getMonth(), 1)
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  return requestedMonth.getTime() > currentMonth.getTime() ? currentMonth : requestedMonth
}

async function scrollToServiceCalendarMonth(value: Date, behavior: ScrollBehavior = 'smooth') {
  await nextTick()
  const container = serviceCalendarScrollElement.value
  const panel = document.getElementById(serviceCalendarMonthId(value))
  if (!container || !panel) return

  const containerRect = container.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  container.scrollTo({
    top: container.scrollTop + panelRect.top - containerRect.top,
    behavior,
  })
}

async function changeServiceHistoryMonth(offset: number) {
  const firstAvailableMonth = serviceCalendarMonths.value[0]?.date
  let target = clampServiceHistoryMonth(new Date(
    serviceHistoryMonth.value.getFullYear(),
    serviceHistoryMonth.value.getMonth() + offset,
    1,
  ))

  if (firstAvailableMonth && target.getTime() < firstAvailableMonth.getTime()) {
    target = new Date(firstAvailableMonth)
  }

  serviceHistoryMonth.value = target
  openServiceCalendarPopoverKey.value = null
  await scrollToServiceCalendarMonth(target)
}

function syncServiceHistoryMonthFromScroll() {
  const container = serviceCalendarScrollElement.value
  if (!container) return

  const containerTop = container.getBoundingClientRect().top
  const panels = Array.from(container.querySelectorAll<HTMLElement>('[data-month-date]'))
  const nearestPanel = panels.reduce<HTMLElement | null>((nearest, panel) => {
    if (!nearest) return panel
    const panelDistance = Math.abs(panel.getBoundingClientRect().top - containerTop)
    const nearestDistance = Math.abs(nearest.getBoundingClientRect().top - containerTop)
    return panelDistance < nearestDistance ? panel : nearest
  }, null)

  const monthKey = nearestPanel?.dataset.monthDate
  if (!monthKey) return
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return

  const visibleMonth = new Date(year, month - 1, 1)
  if (visibleMonth.getTime() !== serviceHistoryMonth.value.getTime()) {
    serviceHistoryMonth.value = visibleMonth
    openServiceCalendarPopoverKey.value = null
  }
}

async function openServiceHistory() {
  const newestRepairDate = repairHistory.value.map(serviceRepairStart).find(Boolean)

  if (newestRepairDate) {
    serviceHistoryMonth.value = clampServiceHistoryMonth(new Date(newestRepairDate.getFullYear(), newestRepairDate.getMonth(), 1))
  } else {
    serviceHistoryMonth.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  }

  isServiceHistoryOpen.value = true
  await scrollToServiceCalendarMonth(serviceHistoryMonth.value, 'auto')
}

function openEditModal() {
  isInformationMenuOpen.value = false
  if (!vehicle.value || !canUpdateVehicles.value) {
    return
  }

  resetFormFromVehicle(editForm, vehicle.value)
  originalEditForm.value = { ...editForm }
  isEditModalOpen.value = true
}

function closeEditModal() {
  if (!isUpdatingVehicle.value) {
    isEditModalOpen.value = false
  }
}

function openInspectionEdit() {
  isInspectionMenuOpen.value = false
  if (!vehicle.value || !canUpdateVehicles.value) return
  for (const { key } of visibleInspectionFields.value) inspectionEditForm[key] = dateInputValue(vehicle.value[key])
  originalInspectionForm.value = { ...inspectionEditForm }
  isEditingInspections.value = true
}

function closeInspectionEdit() {
  if (!isUpdatingInspections.value) isEditingInspections.value = false
}

async function submitInspectionEdit() {
  if (!isEditingInspections.value || isUpdatingInspections.value || !vehicle.value || !canUpdateVehicles.value) return
  const payload: VehiclePayload = {}
  for (const { key } of visibleInspectionFields.value) {
    if (inspectionEditForm[key] !== originalInspectionForm.value[key]) payload[key] = nullableText(inspectionEditForm[key])
  }
  if (!Object.keys(payload).length) {
    isEditingInspections.value = false
    return
  }
  isUpdatingInspections.value = true
  try {
    const updatedVehicle = await vehicleService.updateVehicle(vehicle.value.id, payload)
    fleetStore.upsertApiVehicle(updatedVehicle)
    isEditingInspections.value = false
    uiStore.addToast({ type: 'success', title: 'Zapisano przeglądy i winiety', message: 'Terminy pojazdu zostały zaktualizowane.' })
  } catch {
    // API interceptor pokazuje szczegóły błędu; formularz pozostaje otwarty.
  } finally {
    isUpdatingInspections.value = false
  }
}

function openAssignDeviceModal() {
  isDeviceMenuOpen.value = false
  if (!vehicle.value || !canAssignDevices.value) return
  deviceIdInput.value = ''
  isAssignDeviceModalOpen.value = true
}

function closeAssignDeviceModal() {
  if (!isAssigningDevice.value) isAssignDeviceModalOpen.value = false
}

function openUnassignDeviceModal() {
  isDeviceMenuOpen.value = false
  if (canAssignDevices.value && vehicle.value?.assignedDeviceId) {
    isUnassignDeviceModalOpen.value = true
  }
}

function closeUnassignDeviceModal() {
  if (!isUnassigningDevice.value) {
    isUnassignDeviceModalOpen.value = false
  }
}

async function submitVehicleEdit() {
  if (!isEditModalOpen.value || isUpdatingVehicle.value || !vehicle.value || !canUpdateVehicles.value || !editForm.licensePlate.trim()) {
    return
  }

  isUpdatingVehicle.value = true

  try {
    const payload = changedPayloadFromForm(editForm, originalEditForm.value)

    if (!Object.keys(payload).length) {
      isEditModalOpen.value = false
      return
    }

    const updatedVehicle = await vehicleService.updateVehicle(vehicle.value.id, payload)
    fleetStore.upsertApiVehicle(updatedVehicle)
    uiStore.addToast({
      type: 'success',
      title: 'Pojazd zaktualizowany',
      message: `Zapisano zmiany dla ${editForm.licensePlate.trim()}.`,
    })
    isEditModalOpen.value = false
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isUpdatingVehicle.value = false
  }
}

async function assignDevice() {
  if (!vehicle.value || !canAssignDevices.value || !deviceIdInput.value.trim()) {
    return
  }

  isAssigningDevice.value = true
  const plateNumber = vehicle.value.licensePlate

  try {
    await vehicleService.assignDevice(vehicle.value.id, devicePayloadValue(deviceIdInput.value))
    await Promise.allSettled([
      fleetStore.fetchVehicles({ silent: true }),
      deviceStore.loadDevices(undefined, { silent: true }),
    ])
    devicesReloadKey.value += 1
    uiStore.addToast({
      type: 'success',
      title: 'Urządzenie przypisane',
      message: `Przypisano urządzenie do ${plateNumber}.`,
    })
    deviceIdInput.value = ''
    isAssignDeviceModalOpen.value = false
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isAssigningDevice.value = false
  }
}

async function unassignDevice() {
  if (!vehicle.value?.assignedDeviceId || !canAssignDevices.value) {
    return
  }

  isUnassigningDevice.value = true
  const plateNumber = vehicle.value.licensePlate

  try {
    await vehicleService.unassignDevice(vehicle.value.id)
    await Promise.allSettled([
      fleetStore.fetchVehicles({ silent: true }),
      deviceStore.loadDevices(undefined, { silent: true }),
    ])
    devicesReloadKey.value += 1
    isUnassignDeviceModalOpen.value = false
    uiStore.addToast({
      type: 'success',
      title: 'Urządzenie odpięte',
      message: `Odpięto urządzenie od ${plateNumber}.`,
    })
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isUnassigningDevice.value = false
  }
}

function repairKey(repair: RepairHistoryLike) {
  return String(repair.id || repair.number || repair.createdAt || repair.updatedAt || JSON.stringify(repair))
}

function repairTimestamp(repair: RepairHistoryLike) {
  const value = repair.createdAt || repair.plannedArrivalAt || repair.startedAt || repair.updatedAt || null

  if (!value) {
    return 0
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function repairTitle(repair: RepairHistoryLike) {
  return `Naprawa #${repair.id || repair.number || '-'}`
}

function repairStatus(repair: RepairHistoryLike) {
  const labels: Record<string, string> = {
    new: 'Nowa',
    planned: 'Zaplanowana',
    ready_to_be_repaired: 'Gotowa',
    at_location: 'W lokalizacji',
    IN_FIELD: 'W terenie',
    in_field: 'W terenie',
    done: 'Zakończona',
    cancelled: 'Anulowana',
  }

  return labels[String(repair.status || '')] || String(repair.status || 'Historia')
}

function repairStatusVariant(repair: RepairHistoryLike): BadgeVariant {
  const status = String(repair.status || '').toLowerCase()

  if (status === 'done') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'error'
  }

  if (status === 'at_location' || status === 'in_field') {
    return 'warning'
  }

  return 'neutral'
}

function repairDate(repair: RepairHistoryLike) {
  return formatDateTime(repair.plannedArrivalAt || repair.startedAt || repair.createdAt || repair.updatedAt || null)
}

function repairDescription(repair: RepairHistoryLike) {
  return repair.description ? String(repair.description) : ''
}

function repairPlace(repair: RepairHistoryLike) {
  if (typeof repair.place === 'string') {
    return repair.place
  }

  return repair.place?.name || repair.placeName || (repair.placeId ? `#${repair.placeId}` : '-')
}

function repairFaultsSummary(repair: RepairHistoryLike) {
  const total = repair.totalFaults ?? repair.faults?.length ?? 0
  const done = repair.doneFaults ?? repair.faults?.filter((fault) => typeof fault !== 'string' && 'status' in fault && String(fault.status).toLowerCase() === 'done').length ?? 0
  return `${done}/${total}`
}

function repairDepartureDate(repair: RepairHistoryLike) {
  return formatDateTime(repair.plannedDepartureAt || repair.finishedAt || null)
}

function isRepairExpanded(repair: RepairHistoryLike) {
  return expandedRepairIds.value.has(repairKey(repair))
}

async function toggleRepairHistory(repair: RepairHistoryLike) {
  const key = repairKey(repair)
  const nextExpandedIds = new Set(expandedRepairIds.value)

  if (nextExpandedIds.has(key)) {
    nextExpandedIds.delete(key)
    expandedRepairIds.value = nextExpandedIds
    return
  }

  nextExpandedIds.add(key)
  expandedRepairIds.value = nextExpandedIds

  if (!repair.id || repairCommentsById.value[String(repair.id)]) {
    return
  }

  try {
    await repairStore.loadRepairDetail(repair.id, { silent: true })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się pobrać szczegółów',
      message: 'Szczegóły naprawy są chwilowo niedostępne.',
    })
  }
}

let serviceRepairFocusTimer: number | null = null

async function handleRepairHistoryClick(repair: RepairHistoryLike) {
  void toggleRepairHistory(repair)

  const start = serviceRepairStart(repair)
  if (!start) return

  serviceHistoryMonth.value = clampServiceHistoryMonth(new Date(start.getFullYear(), start.getMonth(), 1))
  focusedServiceRepairKey.value = repairKey(repair)
  openServiceCalendarPopoverKey.value = null
  await nextTick()

  document.getElementById(serviceRepairAnchorId(repair))?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })

  if (serviceRepairFocusTimer !== null) window.clearTimeout(serviceRepairFocusTimer)
  serviceRepairFocusTimer = window.setTimeout(() => {
    focusedServiceRepairKey.value = null
    serviceRepairFocusTimer = null
  }, 1800)
}

function repairDetail(repair: RepairHistoryLike): RepairHistoryLike {
  return (repair.id ? repairDetailsById.value[String(repair.id)] || repair : repair) as RepairHistoryLike
}

function repairFaults(repair: RepairHistoryLike): RepairHistoryFault[] {
  return Array.isArray(repair.faults) ? repair.faults : []
}

function repairFaultKey(fault: RepairHistoryFault) {
  if (typeof fault === 'string') {
    return fault
  }

  const name = 'name' in fault ? fault.name : null
  return String(fault.id || fault.description || name || JSON.stringify(fault))
}

function repairFaultDescription(fault: RepairHistoryFault) {
  if (typeof fault === 'string') return fault
  const name = 'name' in fault ? fault.name : null
  return fault.description || name || '-'
}

function repairFaultStatusLabel(fault: RepairHistoryFault) {
  if (typeof fault === 'string') {
    return 'Otwarta'
  }

  return String(fault.status || '').toLowerCase() === 'done' ? 'Zrobiona' : 'Otwarta'
}

function repairFaultStatusVariant(fault: RepairHistoryFault): BadgeVariant {
  if (typeof fault === 'string') {
    return 'neutral'
  }

  return String(fault.status || '').toLowerCase() === 'done' ? 'success' : 'neutral'
}

function repairFaultMechanic(fault: RepairHistoryFault) {
  return typeof fault === 'string' ? '' : fault.assignedMechanicFullName || ''
}

function repairFaultNote(fault: RepairHistoryFault) {
  return typeof fault === 'string' ? '' : fault.note || ''
}

function repairFaultVisibleNote(fault: RepairHistoryFault) {
  const note = repairFaultNote(fault).trim()
  return note.toLocaleLowerCase('pl-PL') === 'oznaczone jako wykonane' ? '' : note
}

function repairCreatedBy(repair: RepairHistoryLike) {
  if (repair.createdByUsername) {
    return repair.createdByUsername
  }

  if (repair.createdBy && typeof repair.createdBy === 'object') {
    return repair.createdBy.username || '-'
  }

  return repair.createdBy ? `#${repair.createdBy}` : '-'
}

function repairComments(repair: RepairHistoryLike) {
  if (!repair.id) {
    return (repair.comments || []) as RepairComment[]
  }

  return repairCommentsById.value[String(repair.id)] || repair.comments || []
}

function repairCommentAuthor(comment: RepairComment) {
  return comment.createdByUsername || (comment.createdBy ? `Użytkownik #${comment.createdBy}` : 'Użytkownik')
}

async function loadRepairHistory() {
  if (!vehicleId.value || !canReadRepairs.value) {
    return
  }
  const requestedVehicleId = vehicleId.value
  repairHistoryError.value = ''
  try {
    await repairStore.loadVehicleRepairHistory(requestedVehicleId, { silent: true })
  } catch {
    if (requestedVehicleId !== vehicleId.value) return
    repairHistoryError.value = 'Historia serwisowa pojazdu jest chwilowo niedostępna.'
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się pobrać historii',
      message: 'Historia serwisowa pojazdu jest chwilowo niedostępna.',
    })
  }
}

function openCreatedRepair(repair: Repair) {
  isRepairCreateOpen.value = false
  void router.push({ name: 'repair-detail', params: { id: repair.id } })
}

onMounted(async () => {
  if (!fleetStore.apiVehicles.length) {
    await fleetStore.fetchVehicles()
  }

  await loadRepairHistory()
})

watch(vehicleId, () => {
  isEditModalOpen.value = false
  isInformationMenuOpen.value = false
  isInspectionMenuOpen.value = false
  isEditingInspections.value = false
  deviceIdInput.value = ''
  isAssignDeviceModalOpen.value = false
  isUnassignDeviceModalOpen.value = false
  isDeviceMenuOpen.value = false
  isRepairCreateOpen.value = false
  repairHistoryError.value = ''
  expandedRepairIds.value = new Set()
  void loadRepairHistory()
})

watch(isServiceHistoryOpen, (open) => {
  if (!open) openServiceCalendarPopoverKey.value = null
})

onBeforeUnmount(() => {
  if (serviceRepairFocusTimer !== null) window.clearTimeout(serviceRepairFocusTimer)
})
useWorkspaceDirty(computed(() => isEditModalOpen.value || isEditingInspections.value))
</script>

<style scoped>
:deep(.vehicle-inline-control) {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  margin: 0;
  border: 1px solid rgb(var(--rw-border));
  border-radius: var(--rw-radius-control);
  background: rgb(var(--rw-surface));
  padding: 7px 8px;
  color: inherit;
  font: inherit;
  line-height: 20px;
  text-align: left;
  outline: none;
}
:deep(.vehicle-inline-control:focus) { border-color: rgb(var(--rw-focus-ring)); box-shadow: inset 0 0 0 1px rgb(var(--rw-focus-ring)); }
:deep(.vehicle-inline-control:disabled) { opacity: .6; }

.vehicle-information-layout, .vehicle-service-layout { display: grid; gap: .75rem; }
.vehicle-information-sidebar { grid-template-columns: minmax(0, 1fr); }
.vehicle-device-telemetry :deep(.ui-card-header) { min-height: 3rem; align-items: center; gap: .375rem; padding: .5rem; }
.vehicle-device-telemetry :deep(.ui-icon-button) { width: 1.5rem !important; height: 1.5rem !important; }
.vehicle-device-telemetry :deep(.ui-card-header > div:first-child) { min-width: 0; }
.vehicle-device-telemetry :deep(.ui-section-title) { gap: .375rem; font-size: .875rem; }
@media (min-width: 640px) {
  .vehicle-information-sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vehicle-information-sidebar--trailer > :first-child { grid-column: 1; grid-row: 1; }
  .vehicle-information-sidebar--trailer > .vehicle-device-telemetry { grid-column: 1; grid-row: 2; }
  .vehicle-location-card { width: calc((100% - .75rem) / 2); justify-self: start; }
}
.vehicle-location-card { min-height: 14rem; }
@media (min-width: 1024px) {
  .vehicle-information-layout { grid-template-columns: minmax(19rem, .85fr) minmax(0, 1.65fr); grid-template-rows: minmax(13rem, auto) minmax(14rem, 1fr); overflow-y: auto; }
  .vehicle-information-card { grid-column: 1; grid-row: 1 / 3; }
  .vehicle-information-sidebar { grid-column: 2; grid-row: 1; grid-template-rows: minmax(0, 1fr); }
  .vehicle-information-sidebar--trailer { grid-template-rows: auto auto; align-content: start; }
  .vehicle-location-card { grid-column: 2; grid-row: 2; min-height: 14rem; }
  .vehicle-location-card :deep(.vehicle-location-preview) { min-height: 0; }
  .vehicle-service-layout { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); overflow: hidden; }
  .vehicle-service-layout--trailer { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
  .vehicle-service-sidebar { height: 100%; overflow: hidden; }
  .vehicle-service-intervals { max-height: 55%; overflow-y: auto; }
  .vehicle-documents-layout { grid-template-rows: minmax(0, 1fr); overflow: hidden; }
}
@media (max-width: 1023px) {
  .vehicle-information-layout, .vehicle-service-layout, .vehicle-documents-layout { overflow-y: auto; }
  .vehicle-information-card { flex-shrink: 0; }
  .vehicle-repair-history { flex: none; }
}
:global(.service-calendar-overlay-range) {
  display: block;
  min-width: 0;
  height: 1.25rem;
  overflow: hidden;
  align-self: start;
  pointer-events: auto;
  position: relative;
  z-index: 5;
  margin-right: 1px;
  margin-left: 1px;
  border-radius: 4px;
  transition: box-shadow 180ms ease, transform 180ms ease;
}

:global(.service-calendar-overlay-range--focused) {
  z-index: 8;
  box-shadow: 0 0 0 2px rgb(var(--rw-focus-ring));
  transform: translateY(-1px);
}
</style>
