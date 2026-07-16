<template>
  <div class="relative flex h-full w-full overflow-hidden bg-app-light text-xs dark:bg-app-dark" @click="hidePinnedOverlays">
    <button
      v-if="vehiclePanelCollapsed"
      type="button"
      class="absolute left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated md:hidden"
      aria-label="Pokaż panel mapy"
      @click.stop="toggleVehiclePanel"
    >
      <component :is="activeModeIcon" class="h-4 w-4" />
    </button>

    <button
      v-if="vehiclePanelCollapsed"
      type="button"
      class="absolute left-3 top-3 z-40 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50 md:flex"
      aria-label="Pokaż listę pojazdów"
      @click.stop="toggleVehiclePanel"
    >
      <PanelLeftOpen class="h-4 w-4" />
    </button>

    <aside :class="vehiclePanelClasses">
      <button
        type="button"
        class="hidden"
        aria-label="Schowaj listę pojazdów"
        @click.stop="toggleVehiclePanel"
      >
        <PanelLeftClose class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50 md:hidden"
        :aria-label="activeMode === 'history' ? 'Schowaj historię' : 'Schowaj listę pojazdów'"
        @click.stop="toggleVehiclePanel"
      >
        <X class="h-3.5 w-3.5" />
      </button>

      <div class="border-b border-slate-200 p-3 pr-11 dark:border-app-border md:pr-3">
        <div class="flex items-center gap-2">
          <div v-if="activeMode === 'places'" class="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 dark:border-app-border dark:bg-app-panel">
            <span class="flex min-w-0 items-center gap-2 font-semibold text-slate-950 dark:text-slate-50">
              <MapPin class="h-4 w-4 shrink-0" />
              <span class="truncate">Edycja stref</span>
            </span>
            <button type="button" class="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50" @click="finishPlaceEditing">
              Gotowe
            </button>
          </div>

          <div v-else class="grid min-w-0 flex-1 grid-cols-3 gap-2">
            <button
              v-for="item in modes"
              :key="item.value"
              type="button"
              class="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl border px-1 text-[11px] font-medium transition"
              :class="activeMode === item.value ? activeModeClasses : inactiveModeClasses"
              @click="activeMode = item.value"
            >
              <component :is="item.icon" class="h-3.5 w-3.5" />
              {{ item.label }}
            </button>
          </div>

          <button
            type="button"
            class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50 md:flex"
            aria-label="Schowaj listÄ™ pojazdĂłw"
            @click.stop="toggleVehiclePanel"
          >
            <PanelLeftClose class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="activeMode === 'list'" class="flex min-h-0 flex-1 flex-col">
        <div class="space-y-2 border-b border-slate-200 p-3 dark:border-app-border">
          <AppSelect
            v-model="selectedFleetId"
            placeholder="Flota"
            :options="fleetSelectOptions"
            size="sm"
          />

          <AppInput
            v-model="vehicleSearch"
            placeholder="Szukaj pojazdu"
            size="sm"
            clearable
          />
        </div>

        <div class="rw-list-scroll min-h-0 flex-1 overflow-y-auto" @scroll="hideAlertTooltip">
          <table class="w-full table-fixed text-left text-xs">
            <thead class="sticky top-0 z-10 border-b border-slate-200 bg-app-light text-xs uppercase text-slate-500 dark:border-app-border dark:bg-app-dark dark:text-app-muted">
              <tr>
                <th v-if="mapSettings.columns.order" class="w-16 px-2 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="setVehicleSort('order')">
                    #
                    <component :is="sortIcon('order')" class="h-3 w-3" />
                  </button>
                </th>
                <th v-if="mapSettings.columns.info" class="px-1.5 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="setVehicleSort('plate')">
                    Informacje
                    <component :is="sortIcon('plate')" class="h-3 w-3" />
                  </button>
                </th>
                <th v-if="mapSettings.columns.fuel" class="w-14 px-1.5 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="setVehicleSort('fuel')">
                    Paliwo
                    <component :is="sortIcon('fuel')" class="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(vehicle, index) in filteredVehicles"
                :key="vehicle.id"
                class="cursor-pointer border-b border-slate-200 transition hover:bg-white dark:border-app-border dark:hover:bg-app-panel"
                :class="selectedVehicleId === vehicle.id ? 'bg-white dark:bg-app-panel' : ''"
                @click="selectVehicle(vehicle.id)"
              >
                <td v-if="mapSettings.columns.order" class="px-2 py-1.5 align-middle">
                  <div class="flex items-center gap-1.5">
                    <span class="w-5 text-slate-500 dark:text-app-muted">{{ index + 1 }}.</span>
                    <button
                      v-if="vehicleAlertItems(vehicle).length"
                      type="button"
                      class="inline-flex h-5 w-5 items-center justify-center"
                      @blur="hideAlertTooltip"
                      @click.stop="toggleAlertTooltip(vehicle, $event)"
                      @focus="showAlertTooltip(vehicle, $event)"
                      @mouseenter="showAlertTooltip(vehicle, $event)"
                      @mouseleave="scheduleAlertTooltipHide"
                    >
                      <span
                        v-if="vehicleAlertItems(vehicle).length > 1"
                        class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold leading-none"
                        :class="vehicleAlertCountClasses(vehicle)"
                      >
                        {{ vehicleAlertItems(vehicle).length }}
                      </span>
                      <GlobeOff v-else-if="vehicleAlertItems(vehicle)[0]?.id === 'gps-offline'" class="h-5 w-5" :class="vehicleAlertIconClasses(vehicle)" />
                      <Wrench v-else-if="vehicleAlertItems(vehicle)[0]?.repairId" class="h-5 w-5" :class="vehicleAlertIconClasses(vehicle)" />
                      <TriangleAlert v-else class="h-5 w-5" :class="vehicleAlertIconClasses(vehicle)" />
                    </button>
                  </div>
                </td>

                <td v-if="mapSettings.columns.info" class="px-1.5 py-1.5 align-middle">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <component
                      :is="vehicle.vehicleType === 'trailer' ? Container : Truck"
                      v-if="mapSettings.row.vehicleIcon"
                      class="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300"
                    />
                    <img
                      v-if="mapSettings.row.flag"
                      class="h-5 w-5 shrink-0 rounded-full"
                      :src="`https://flagsapi.com/${vehicle.countryCode}/flat/64.png`"
                      alt=""
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <div class="flex min-w-0 items-center gap-1">
                      <span class="truncate font-medium leading-none text-slate-950 dark:text-slate-50">
                        {{ vehicle.plateNumber }}
                      </span>
                      <span v-if="mapSettings.row.driver && vehicle.vehicleType !== 'trailer'" class="truncate text-[11px] leading-none text-slate-500 dark:text-app-muted">
                        [{{ vehicleDriverLabel(vehicle) }}]
                      </span>
                    </div>
                  </div>
                </td>

                <td v-if="mapSettings.columns.fuel" class="px-1.5 py-1.5 align-middle font-medium text-slate-700 dark:text-slate-200">
                  {{ formatFuel(vehicle) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeMode === 'places'" class="flex min-h-0 flex-1 flex-col">
        <div class="space-y-2 border-b border-slate-200 p-3 dark:border-app-border">
          <AppButton full-width size="sm" :variant="isPlacePlacementMode ? 'secondary' : 'primary'" @click="togglePlacePlacementMode">
            <X v-if="isPlacePlacementMode" class="h-3.5 w-3.5" />
            <MapPinPlus v-else class="h-3.5 w-3.5" />
            {{ isPlacePlacementMode ? 'Anuluj wskazywanie' : 'Dodaj miejsce na mapie' }}
          </AppButton>
          <p v-if="!isPlacePlacementMode" class="px-1 text-[11px] leading-4 text-slate-500 dark:text-app-muted">
            Przeciągnij punkt centralny, aby zmienić położenie strefy.
          </p>
          <p v-if="isPlacePlacementMode" class="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 dark:border-app-border dark:bg-app-panel dark:text-slate-300">
            Kliknij na mapie, aby wskazać środek nowej strefy.
          </p>
        </div>

        <div class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
          <div v-if="arePlacesLoading" class="p-3 text-center text-xs text-slate-500 dark:text-app-muted">
            Pobieranie miejsc...
          </div>

          <article
            v-for="place in places"
            :key="place.id"
            class="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-app-border dark:bg-app-panel"
          >
            <button type="button" class="flex w-full min-w-0 items-start gap-2 text-left" @click="focusPlace(place)">
              <span class="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-white shadow-sm" :style="{ backgroundColor: place.color }"></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-xs font-semibold text-slate-950 dark:text-slate-50">{{ place.name }}</span>
                <span class="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-app-muted">
                  {{ place.city || formatPlaceCoordinates(place) }} · {{ place.radiusMeters }} m
                </span>
              </span>
              <AppBadge :variant="place.visible ? 'success' : 'neutral'">{{ place.visible ? 'Widoczne' : 'Ukryte' }}</AppBadge>
            </button>

            <div class="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-app-border">
              <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                @click="openEditPlace(place)"
              >
                <Pencil class="h-3.5 w-3.5" />
                Edytuj
              </button>
              <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                @click="placeToDelete = place"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Usuń
              </button>
            </div>
          </article>

          <div v-if="!arePlacesLoading && !places.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-app-border dark:text-slate-400">
            Brak zapisanych miejsc.
          </div>
        </div>
      </div>

      <div v-else-if="activeMode === 'history'" class="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        <AppSelect
          v-model="historyFilters.fleetId"
          placeholder="Flota"
          :options="fleetSelectOptions"
          size="sm"
        />

        <VehicleSearchSelect
          v-model="historyFilters.vehicleId"
          :fleet-id="historyFilters.fleetId"
          :include-all="false"
          placeholder="Pojazd"
        />

        <AppSelect
          v-model="historyFilters.preset"
          placeholder="Zakres niestandardowy"
          :options="historyPresetOptions"
          size="sm"
        />

        <AppDateTimePicker
          :model-value="historyFilters.dateFrom"
          label="Od"
          size="sm"
          default-time="00:00"
          @update:model-value="setCustomHistoryDate('dateFrom', $event)"
        />
        <AppDateTimePicker
          :model-value="historyFilters.dateTo"
          label="Do"
          size="sm"
          default-time="23:59"
          @update:model-value="setCustomHistoryDate('dateTo', $event)"
        />

        <AppButton
          full-width
          size="sm"
          :disabled="!canSearchHistory"
          :loading="fleetStore.isRouteHistoryLoading"
          @click="searchPositionHistory"
        >
          <Search class="h-3.5 w-3.5" />
          Szukaj
        </AppButton>

        <p v-if="historyFormError" class="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300">
          {{ historyFormError }}
        </p>

        <section
          v-if="showHistorySummary"
          class="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-app-border dark:bg-app-panel"
        >
          <h2 class="text-xs font-semibold text-slate-950 dark:text-slate-50">Podsumowanie trasy</h2>
          <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <div class="col-span-2 border-b border-slate-100 pb-2 dark:border-app-border">
              <dt class="text-slate-500 dark:text-app-muted">Zakres</dt>
              <dd class="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">{{ historyRangeLabel }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-app-muted">Kilometry łącznie</dt>
              <dd class="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">{{ historyDistanceLabel }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-app-muted">Średnia prędkość</dt>
              <dd class="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">{{ historyAverageSpeedLabel }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-app-muted">Km początek</dt>
              <dd class="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">{{ historyStartMileageLabel }}</dd>
            </div>
            <div>
              <dt class="text-slate-500 dark:text-app-muted">Km koniec</dt>
              <dd class="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">{{ historyEndMileageLabel }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div v-else class="min-h-0 flex-1 overflow-y-auto p-2.5">
        <section class="space-y-1.5">
          <h2 class="text-xs font-semibold text-slate-950 dark:text-slate-50">Kolumny</h2>
          <MapSwitch v-model="mapSettings.columns.order" label="Numer" />
          <MapSwitch v-model="mapSettings.columns.info" label="Informacje" />
          <MapSwitch v-model="mapSettings.columns.fuel" label="Paliwo" />
        </section>

        <section class="mt-4 space-y-1.5">
          <h2 class="text-xs font-semibold text-slate-950 dark:text-slate-50">W wierszu</h2>
          <MapSwitch v-model="mapSettings.row.flag" label="Flaga" />
          <MapSwitch v-model="mapSettings.row.vehicleIcon" label="Ikona typu pojazdu" />
          <MapSwitch v-model="mapSettings.row.driver" label="Kierowca" />
        </section>

        <section class="mt-4 space-y-1.5">
          <h2 class="text-xs font-semibold text-slate-950 dark:text-slate-50">Mapa i trasa</h2>
          <MapSwitch v-model="mapSettings.map.zoomOnSelect" label="Przenieś do pojazdu" />
          <MapSwitch v-model="mapSettings.map.showMarkerAlerts" label="Alerty na markerach" />
          <MapSwitch v-model="mapSettings.map.showMarkerLabels" label="Dymki markerów" />
          <MapSwitch v-model="mapSettings.map.showMarkerDriver" label="Kierowca w dymku" />
          <MapSwitch v-model="mapSettings.map.followVehicle" label="Sledz pojazd" />
          <MapSwitch v-model="mapSettings.map.todayRoute" label="Trasa z dzisiaj" />
          <MapSwitch v-model="mapSettings.map.refuelings" label="Tankowania" />
          <MapSwitch v-model="mapSettings.map.fuel" label="Paliwo" />

          <AppSelect
            class="pt-2"
            :model-value="mapSettings.map.fuelUnit"
            placeholder="Auto"
            :options="fuelUnitOptions"
            size="sm"
            @update:model-value="setFuelUnit"
          />
        </section>

        <section class="mt-4 space-y-1.5">
          <h2 class="text-xs font-semibold text-slate-950 dark:text-slate-50">Historia trasy</h2>
          <MapSwitch v-model="mapSettings.map.historyMarkersByZoom" label="Pokazuj markery w zależności od zoomu" />
        </section>
      </div>
    </aside>

    <section class="relative min-h-0 min-w-0 flex-1">
      <div ref="mapElement" class="h-full w-full"></div>

      <div
        v-if="isPlacePlacementMode"
        class="absolute left-1/2 top-3 z-30 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200"
        @click.stop
      >
        <MapPinPlus class="h-4 w-4 shrink-0" />
        <span class="truncate">Wskaż środek miejsca</span>
        <button type="button" class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-app-elevated" aria-label="Anuluj dodawanie miejsca" @click="togglePlacePlacementMode">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        v-if="activeMode === 'history' && (fleetStore.isRouteHistoryLoading || isHistoryRendering)"
        class="pointer-events-none absolute inset-x-0 top-0 z-50 h-1 overflow-hidden bg-slate-200/80 dark:bg-slate-700/80"
        role="progressbar"
        aria-label="Renderowanie historii trasy"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(historyRenderProgress)"
      >
        <div
          class="h-full bg-blue-600 transition-[width] duration-75 ease-linear dark:bg-blue-400"
          :class="fleetStore.isRouteHistoryLoading ? 'animate-pulse' : ''"
          :style="{ width: `${fleetStore.isRouteHistoryLoading ? 8 : historyRenderProgress}%` }"
        ></div>
      </div>

      <div
        v-if="activeMode !== 'history' && selectedVehicle && !vehicleDetailsDrawerOpen"
        class="absolute right-3 top-3 z-20 flex items-center gap-1 md:hidden"
        @click.stop
      >
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          aria-label="Pokaż szczegóły pojazdu"
          @click="showVehicleDetailsDrawer"
        >
          <PanelRightOpen class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-red-600 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-red-300"
          aria-label="Wyczyść wybór pojazdu i trasę"
          @click="closeVehicleDrawer"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="absolute top-3 z-20 transition-[left]" :class="vehiclePanelCollapsed ? 'left-14' : 'left-3'" @click.stop>
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
            aria-label="Warstwy mapy"
            @click="toggleLayersMenu"
          >
            <Layers class="h-4 w-4" />
          </button>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm transition"
            :class="activeMode === 'places' || placesMenuOpen ? activeModeClasses : inactiveModeClasses"
            aria-label="Strefy na mapie"
            @click="togglePlacesMenu"
          >
            <MapPin class="h-4 w-4" />
          </button>
        </div>

        <div
          v-if="layersMenuOpen"
          class="absolute left-11 top-0 w-56 max-w-[calc(100vw-4rem)] rounded-2xl border border-slate-200 bg-white p-2.5 text-xs shadow-sm dark:border-app-border dark:bg-app-panel"
        >
          <section>
            <p class="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Motyw</p>
            <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-app-elevated">
              <button type="button" class="h-7 rounded-lg text-[11px] font-medium transition" :class="mapOptionClasses(mapSettings.map.mapTheme === 'light')" @click="setMapTheme('light')">Jasny</button>
              <button type="button" class="h-7 rounded-lg text-[11px] font-medium transition" :class="mapOptionClasses(mapSettings.map.mapTheme === 'dark')" @click="setMapTheme('dark')">Ciemny</button>
            </div>
          </section>

          <section class="mt-3">
            <p class="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Typ mapy</p>
            <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-app-elevated">
              <button type="button" class="h-7 rounded-lg text-[11px] font-medium transition" :class="mapOptionClasses(mapSettings.map.mapType === 'roadmap')" @click="setMapType('roadmap')">Mapa</button>
              <button type="button" class="h-7 rounded-lg text-[11px] font-medium transition" :class="mapOptionClasses(mapSettings.map.mapType === 'satellite')" @click="setMapType('satellite')">Satelita</button>
            </div>
          </section>

          <section class="mt-3">
            <p class="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Warstwy</p>
            <MapSwitch v-model="mapSettings.map.trafficLayer" label="Ruch drogowy" />
          </section>
        </div>

        <div
          v-if="placesMenuOpen"
          class="absolute left-11 top-11 w-56 max-w-[calc(100vw-4rem)] rounded-2xl border border-slate-200 bg-white p-2.5 text-xs shadow-sm dark:border-app-border dark:bg-app-panel"
        >
          <p class="mb-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Strefy</p>
          <MapSwitch v-model="mapSettings.map.showPlaces" label="Pokaż na mapie" />
          <AppButton class="mt-2" full-width size="sm" variant="secondary" @click="openPlacesPanel">
            <Pencil class="h-3.5 w-3.5" />
            Edytuj strefy
          </AppButton>
        </div>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <aside
          v-if="activeMode !== 'history' && selectedVehicle && vehicleDetailsDrawerOpen"
          class="absolute right-0 top-0 z-20 flex max-h-[calc(100%-0.5rem)] w-[15.25rem] max-w-[calc(100%-0.5rem)] flex-col overflow-y-auto rounded-bl-xl border-b border-l border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel md:max-h-none md:w-[20.5rem] md:max-w-[calc(100%-1rem)] md:overflow-visible md:rounded-bl-2xl"
        >
          <header class="flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5 dark:border-app-border md:gap-3 md:px-3 md:py-2.5">
            <div class="flex min-w-0 items-center gap-2">
              <img
                class="h-4 w-4 shrink-0 rounded-full md:h-5 md:w-5"
                :src="`https://flagsapi.com/${selectedVehicle.countryCode}/flat/64.png`"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
              />
              <h2 class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50 md:text-base">
                {{ selectedVehicle.plateNumber }}
              </h2>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50 md:hidden"
                aria-label="Schowaj szczegóły pojazdu"
                @click="hideVehicleDetailsDrawer"
              >
                <PanelRightClose class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-red-600 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-red-300 md:h-7 md:w-7 md:rounded-xl"
                aria-label="Zamknij szczegóły i wyczyść wybór pojazdu"
                @click="closeVehicleDrawer"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div class="flex flex-col gap-1.5 p-1.5 md:gap-2 md:p-2.5">
            <section class="rounded-lg border border-slate-200 p-2 dark:border-app-border md:rounded-2xl md:p-2.5">
              <div class="flex items-center justify-between">
                <p class="text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Status</p>
                <AppBadge v-if="selectedVehicle.vehicleType !== 'trailer'" :variant="selectedVehicle.ignitionState === 'ON' ? 'success' : 'neutral'">
                  {{ selectedVehicle.ignitionState === 'ON' ? 'ON' : 'OFF' }}
                </AppBadge>
              </div>
              <div class="mt-2 grid grid-cols-[auto_1fr] items-end gap-x-3">
                <div class="flex items-end gap-1">
                  <span class="text-lg font-semibold leading-none text-slate-950 dark:text-slate-50 md:text-xl">{{ selectedVehicle.speed }}</span>
                  <span class="pb-0.5 text-[11px] text-slate-500 dark:text-app-muted">km/h</span>
                </div>
                <p class="pb-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{{ vehicleStatusLabel(selectedVehicle) }}</p>
              </div>
            </section>

            <section v-if="selectedVehicle.vehicleType !== 'trailer'" class="rounded-lg border border-slate-200 p-2 dark:border-app-border md:rounded-2xl md:p-2.5">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Kierowca</p>
                  <p class="mt-0.5 truncate text-xs font-semibold text-slate-950 dark:text-slate-50 md:mt-1 md:text-sm">
                    {{ vehicleDriverLabel(selectedVehicle) || '[]' }}
                  </p>
                </div>
                <AppButton class="h-7 shrink-0 px-2 text-[11px]" variant="secondary" size="sm">
                  <Gauge class="h-3 w-3" />
                  Tacho
                </AppButton>
              </div>
            </section>

            <section class="rounded-lg border border-slate-200 p-2 dark:border-app-border md:rounded-2xl md:p-2.5">
              <div class="grid gap-2 text-xs">
                <div v-if="selectedVehicle.vehicleType !== 'trailer'" class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-500 dark:text-app-muted">Paliwo</span>
                  <span class="font-semibold text-slate-950 dark:text-slate-50">{{ formatFuel(selectedVehicle) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-500 dark:text-app-muted">GPS</span>
                  <div class="flex min-w-0 items-center gap-1">
                    <span class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ vehicleCoordinates(selectedVehicle) }}</span>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-app-elevated dark:hover:text-slate-50"
                      title="Kopiuj koordynaty"
                      @click="copyVehiclePosition(selectedVehicle)"
                    >
                      <Copy class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-500 dark:text-app-muted">Aktualizacja</span>
                  <span class="text-right font-semibold text-slate-950 dark:text-slate-50">
                    {{ vehicleSignalLabel(selectedVehicle) }}
                  </span>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-slate-200 p-2 dark:border-app-border md:rounded-2xl md:p-2.5">
              <p class="text-[11px] font-semibold uppercase text-slate-500 dark:text-app-muted">Przeglądy i winiety</p>
              <div class="mt-2 space-y-1.5">
                <div
                  v-for="item in selectedVehicleLifecycleItems"
                  :key="item.label"
                  class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 dark:bg-app-elevated md:gap-3 md:rounded-xl md:px-2.5 md:py-1.5"
                >
                  <div>
                    <p class="text-xs font-semibold text-slate-950 dark:text-slate-50">{{ item.label }}</p>
                    <p class="mt-0.5 text-[11px] text-slate-500 dark:text-app-muted">{{ item.dateLabel }}</p>
                  </div>
                  <AppBadge :variant="item.variant">{{ item.daysLabel }}</AppBadge>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </Transition>

      <div
        v-if="mapState !== 'ready'"
        class="absolute inset-0 grid place-items-center bg-[#eef0f3] px-6 text-center dark:bg-[#303033]"
      >
        <div class="max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-panel">
          <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ mapMessage.title }}</p>
          <p class="mt-2 text-sm text-slate-500 dark:text-app-muted">{{ mapMessage.description }}</p>
        </div>
      </div>
    </section>

    <div
      v-if="activeAlertTooltip"
      class="fixed z-[80] w-80 -translate-y-1/2 rounded-[3px] bg-[#48484e] p-0 text-left normal-case text-white shadow-[0_3px_6px_-4px_rgba(0,0,0,.24),0_6px_12px_rgba(0,0,0,.16),0_9px_18px_8px_rgba(0,0,0,.10)]"
      :style="{ left: `${activeAlertTooltip.x}px`, top: `${activeAlertTooltip.y}px` }"
      @mouseenter="cancelAlertTooltipHide"
      @mouseleave="scheduleAlertTooltipHide"
      @click.stop
    >
      <div class="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2 text-[13px] font-medium text-white/90">
        <CircleAlert class="h-3.5 w-3.5" />
        <span>Alerty i terminy</span>
        <span class="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
          {{ activeAlertTooltip.items.length }}
        </span>
      </div>
      <div class="max-h-[70vh] space-y-2 overflow-y-auto px-3.5 py-2">
        <button
          v-for="alert in activeAlertTooltip.items"
          :key="alert.id"
          type="button"
          class="block w-full rounded-sm border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition"
          :class="alert.repairId ? 'cursor-pointer hover:border-white/25 hover:bg-white/10' : 'cursor-default'"
          @click="openAlertRepair(alert)"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-white/90">{{ alert.title }}</span>
            <span class="text-[11px]" :class="alertDeadlineClasses(alert)">{{ alert.daysLabel }}</span>
          </div>
          <div v-if="alert.repairId" class="mt-1.5 space-y-1 text-[11px] text-white/75">
            <div class="flex items-center gap-1.5">
              <Wrench class="h-2.5 w-2.5 shrink-0" />
              <span class="truncate">Miejsce: {{ alert.placeName }}</span>
            </div>
            <div class="truncate">Dodał: {{ alert.createdByName }}</div>
            <div>
              <span class="font-medium text-white/90">Usterki:</span>
              <ul v-if="alert.faults.length" class="mt-1 space-y-0.5 pl-3">
                <li v-for="fault in alert.faults" :key="fault" class="list-disc">{{ fault }}</li>
              </ul>
              <span v-else class="ml-1">brak</span>
            </div>
          </div>
          <div v-else class="mt-1 flex items-center gap-1.5 text-[11px] text-white/75">
            <GlobeOff v-if="alert.id === 'gps-offline'" class="h-2.5 w-2.5" />
            <CircleAlert v-else class="h-2.5 w-2.5" />
            <span v-if="alert.dateLabel">
              Do:
              <span :class="alertDeadlineClasses(alert)">{{ alert.dateLabel }}</span>
            </span>
            <span v-else :class="alertDeadlineClasses(alert)">{{ alert.description }}</span>
          </div>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isPlaceFormOpen"
        class="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-6"
        @click.self="closePlaceForm"
      >
        <form
          class="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel"
          @submit.prevent="submitPlaceForm"
        >
          <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-app-border sm:px-5 sm:py-4">
            <div class="min-w-0">
              <h2 class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                {{ placeForm.id ? 'Edytuj miejsce' : 'Dodaj miejsce' }}
              </h2>
              <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-app-muted">
                {{ formatPlaceFormCoordinates }}
              </p>
            </div>
            <button type="button" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-slate-300 dark:hover:bg-app-elevated dark:hover:text-slate-50" aria-label="Zamknij formularz" @click="closePlaceForm">
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            <div v-if="placeForm.id" class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-app-elevated">
              <button type="button" class="h-8 flex-1 rounded-lg text-xs font-semibold transition" :class="placeFormTab === 'data' ? 'bg-white text-slate-950 shadow-sm dark:bg-app-dark dark:text-slate-50' : 'text-slate-500 dark:text-app-muted'" @click="placeFormTab = 'data'">Dane miejsca</button>
              <button type="button" class="h-8 flex-1 rounded-lg text-xs font-semibold transition" :class="placeFormTab === 'events' ? 'bg-white text-slate-950 shadow-sm dark:bg-app-dark dark:text-slate-50' : 'text-slate-500 dark:text-app-muted'" @click="placeFormTab = 'events'">Zdarzenia</button>
            </div>

            <template v-if="placeFormTab === 'data'">
            <div class="grid gap-3 sm:grid-cols-2">
              <AppInput v-model="placeForm.name" label="Nazwa" placeholder="Np. Baza Warszawa" required />
              <AppInput v-model="placeForm.city" label="Miasto" placeholder="Warszawa" />
              <AppInput v-model="placeForm.phone" label="Telefon" placeholder="+48 000 000 000" />
              <AppInput v-model="placeForm.email" label="E-mail" type="email" placeholder="kontakt@firma.pl" />
              <AppInput v-model="placeForm.radiusMeters" label="Promień strefy (m)" type="number" min="1" placeholder="100" required />

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Kolor strefy</span>
                <div class="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm dark:border-app-border dark:bg-app-dark">
                  <input v-model="placeForm.color" type="color" class="h-7 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label="Kolor strefy" />
                  <span class="font-mono text-xs font-medium uppercase text-slate-600 dark:text-slate-300">{{ placeForm.color }}</span>
                </div>
              </label>
            </div>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Opis</span>
              <textarea
                v-model="placeForm.description"
                class="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-app-border dark:bg-app-dark dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
                maxlength="255"
                placeholder="Dodatkowe informacje o miejscu"
              ></textarea>
            </label>

            <MapSwitch v-model="placeForm.visible" label="Miejsce widoczne na mapie" />

            <p v-if="placeFormError" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300">
              {{ placeFormError }}
            </p>
            </template>

            <PlaceEventsPanel v-else-if="placeForm.id" :place-id="placeForm.id" />
          </div>

          <footer v-if="placeFormTab === 'data'" class="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-app-border sm:px-5 sm:py-4">
            <AppButton type="button" variant="secondary" @click="closePlaceForm">Anuluj</AppButton>
            <AppButton type="submit" :loading="isPlaceMutating">
              {{ placeForm.id ? 'Zapisz zmiany' : 'Dodaj miejsce' }}
            </AppButton>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="placeToDelete"
        class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="placeToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć miejsce?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Strefa „{{ placeToDelete.name }}” zniknie z mapy.
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="placeToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isPlaceMutating" @click="confirmDeletePlace">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>

  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, defineComponent, h, markRaw, onBeforeUnmount, onMounted, reactive, ref, render, shallowRef, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Container, Copy, Flag, Gauge, GlobeOff, History, Layers, List, LocateFixed, MapPin, MapPinPlus, Pencil, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, Settings, Trash2, TriangleAlert, Truck, Wrench, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import VehicleSearchSelect from '@/components/selects/VehicleSearchSelect.vue'
import PlaceEventsPanel from '@/components/places/PlaceEventsPanel.vue'
import { usePositionHistory, type RouteLatLng } from '@/composables/usePositionHistory'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import type { ApiPositionHistoryPoint } from '@/services/positionService'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { usePlaceStore } from '@/stores/placeStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Vehicle } from '@/types/fleet'
import type { Place, PlacePayload } from '@/types/place'
import type { Repair } from '@/types/repair'

type MapMode = 'list' | 'history' | 'places' | 'settings'
type MapState = 'missing-key' | 'loading' | 'ready' | 'error'
type FuelUnit = 'auto' | 'liters' | 'percent'
type MapTheme = 'light' | 'dark'
type GoogleMapType = 'roadmap' | 'satellite'
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info'
type HistoryPreset = 'today' | 'yesterday' | 'current-week' | 'previous-week' | 'current-month' | 'previous-month'
type RoutePointMarkerKind = 'point' | 'start' | 'end'
type VehicleSortKey = 'order' | 'plate' | 'fuel'
type SortDirection = 'asc' | 'desc'
type VehicleAlertItem = {
  id: string
  title: string
  description: string
  dateLabel: string
  daysLabel: string
  daysLeft: number | null
  variant: BadgeVariant
  repairId: number | null
  placeName: string
  createdByName: string
  faults: string[]
}
type AlertTooltip = {
  vehicleId: string
  items: VehicleAlertItem[]
  x: number
  y: number
  pinned: boolean
}
type PlaceFormState = {
  id: number | null
  name: string
  phone: string
  radiusMeters: string
  color: string
  latitude: number | null
  longitude: number | null
  visible: boolean
  city: string
  email: string
  description: string
}
const MAP_SETTINGS_KEY = 'routewise.map.settings'
const MAP_SELECTED_FLEET_KEY_PREFIX = 'routewise.map.selectedFleet'
const DEFAULT_SELECTED_FLEET_ID = 'type:truck'
const MOBILE_MAP_MEDIA_QUERY = '(max-width: 767px)'
const ROUTE_DETAIL_POINT_INTERVAL = 10
const HISTORY_RENDER_DURATION_MS = 550
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const DARK_STYLES = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#7a5a5a' }, { weight: 1.2 }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#6a4a4a' }, { weight: 0.6 }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#4f5861' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2c3e50' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b8c2' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8e8e8e' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'off' }],
  },
]

const defaultMapSettings = {
  columns: {
    order: true,
    info: true,
    fuel: true,
  },
  row: {
    flag: true,
    vehicleIcon: true,
    driver: true,
  },
  map: {
    zoomOnSelect: true,
    followVehicle: false,
    todayRoute: true,
    refuelings: false,
    fuel: true,
    showMarkerAlerts: false,
    showMarkerLabels: true,
    showMarkerDriver: false,
    historyMarkersByZoom: false,
    mapTheme: 'light' as MapTheme,
    mapType: 'roadmap' as GoogleMapType,
    trafficLayer: false,
    showPlaces: true,
    fuelUnit: 'percent' as FuelUnit,
  },
}

const MapSwitch = defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex h-8 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200' }, [
      h('span', { class: 'truncate' }, props.label),
      h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': props.modelValue,
        class: [
          'relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600',
          props.modelValue ? 'bg-slate-950 dark:bg-slate-100' : 'bg-slate-200 dark:bg-app-elevated',
        ],
        onClick: () => emit('update:modelValue', !props.modelValue),
      }, [
        h('span', {
          class: [
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition dark:bg-app-dark',
            props.modelValue ? 'translate-x-4' : 'translate-x-0',
          ],
        }),
      ]),
    ])
  },
})

function readMapSettings() {
  const stored = localStorage.getItem(MAP_SETTINGS_KEY)

  if (!stored) {
    return defaultMapSettings
  }

  try {
    return {
      ...defaultMapSettings,
      ...JSON.parse(stored),
      columns: {
        ...defaultMapSettings.columns,
        ...JSON.parse(stored).columns,
      },
      row: {
        ...defaultMapSettings.row,
        ...JSON.parse(stored).row,
      },
      map: {
        ...defaultMapSettings.map,
        ...JSON.parse(stored).map,
      },
    }
  } catch {
    localStorage.removeItem(MAP_SETTINGS_KEY)
    return defaultMapSettings
  }
}

function emptyPlaceForm(): PlaceFormState {
  return {
    id: null,
    name: '',
    phone: '',
    radiusMeters: '100',
    color: '#7093ff',
    latitude: null,
    longitude: null,
    visible: true,
    city: '',
    email: '',
    description: '',
  }
}

function selectedFleetStorageKey() {
  const userKey = authStore.user?.id || authStore.user?.login || authStore.user?.email || 'anonymous'
  return `${MAP_SELECTED_FLEET_KEY_PREFIX}.${userKey}`
}

function readSelectedFleet() {
  return localStorage.getItem(selectedFleetStorageKey()) || DEFAULT_SELECTED_FLEET_ID
}

function isMobileMapViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MAP_MEDIA_QUERY).matches
}

function toLocalDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function initialHistoryRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  return {
    from: toLocalDateTimeValue(start),
    to: toLocalDateTimeValue(now),
  }
}

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(23, 59, 0, 0)
  return result
}

function startOfWeek(date: Date) {
  const result = startOfDay(date)
  const mondayOffset = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - mondayOffset)
  return result
}

function historyRangeForPreset(preset: HistoryPreset) {
  const now = new Date()

  if (preset === 'today') {
    return { from: startOfDay(now), to: now }
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
  }

  if (preset === 'current-week') {
    return { from: startOfWeek(now), to: now }
  }

  if (preset === 'previous-week') {
    const currentWeekStart = startOfWeek(now)
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    const previousWeekEnd = new Date(currentWeekStart)
    previousWeekEnd.setMinutes(previousWeekEnd.getMinutes() - 1)
    return { from: previousWeekStart, to: previousWeekEnd }
  }

  if (preset === 'current-month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}

const fleetStore = useFleetStore()
const uiStore = useUiStore()
const authStore = useAuthStore()
const repairStore = useRepairStore()
const placeStore = usePlaceStore()
const router = useRouter()
const { repairs } = storeToRefs(repairStore)
const {
  places,
  isLoading: arePlacesLoading,
  isMutating: isPlaceMutating,
} = storeToRefs(placeStore)
const positionHistory = usePositionHistory()
const activeMode = ref<MapMode>('list')
const selectedFleetId = ref(readSelectedFleet())
const selectedVehicleId = ref<string | null>(null)
const vehicleSearch = ref('')
const vehiclePanelCollapsed = ref(isMobileMapViewport())
const vehicleDetailsDrawerOpen = ref(false)
const mapElement = ref<HTMLDivElement | null>(null)
const mapState = ref<MapState>(googleMapsApiKey ? 'loading' : 'missing-key')
const googleMap = shallowRef<any>(null)
const googleTrafficLayer = shallowRef<any | null>(null)
const googleMarkers = shallowRef<any[]>([])
const todayRoutePointMarkers = new Map<string, any>()
const positionRefreshTimer = ref<number | null>(null)
const activeAlertTooltip = ref<AlertTooltip | null>(null)
const layersMenuOpen = ref(false)
const placesMenuOpen = ref(false)
const isPlacePlacementMode = ref(false)
const isPlaceFormOpen = ref(false)
const placeFormTab = ref<'data' | 'events'>('data')
const placeToDelete = ref<Place | null>(null)
const placeFormError = ref('')
const placeForm = reactive<PlaceFormState>(emptyPlaceForm())
const isHistoryRendering = ref(false)
const historyRenderProgress = ref(0)
const mapSettings = reactive(readMapSettings())
const vehicleSort = reactive<{ key: VehicleSortKey; direction: SortDirection }>({
  key: 'plate',
  direction: 'asc',
})
const initialHistoryDates = initialHistoryRange()
const historyFilters = reactive({
  fleetId: 'all',
  vehicleId: 'all',
  preset: 'today' as HistoryPreset | '',
  dateFrom: initialHistoryDates.from,
  dateTo: initialHistoryDates.to,
})
const historyFormError = ref('')
let alertTooltipHideTimer: number | null = null
let todayRouteRequestId = 0
let routeAnimationFrameId: number | null = null
let routeAnimationId = 0
let todayRoutePolyline: any | null = null
let routeInfoWindow: any | null = null
let routeInfoWindowContent: HTMLDivElement | null = null
let routeInfoWindowRecordIndex: number | null = null
let routeInfoWindowPinned = false
let routeZoomListener: any | null = null
let routeZoomRefreshFrameId: number | null = null
let renderedRoutePositionCount = 0
let isRouteRenderComplete = false
let placeMapClickListener: any | null = null
const placeCircles = new Map<number, any>()
const placeMarkers = new Map<number, any>()

const modes: Array<{ value: MapMode; label: string; icon: Component }> = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'history', label: 'Historia', icon: History },
  { value: 'settings', label: 'Opcje', icon: Settings },
]

const activeModeIcon = computed(() => activeMode.value === 'places'
  ? MapPin
  : modes.find((mode) => mode.value === activeMode.value)?.icon || List)

const historyPresetOptions = [
  { value: 'today', label: 'Dziś' },
  { value: 'yesterday', label: 'Wczoraj' },
  { value: 'current-week', label: 'Tydzień bieżący' },
  { value: 'previous-week', label: 'Tydzień poprzedni' },
  { value: 'current-month', label: 'Miesiąc bieżący' },
  { value: 'previous-month', label: 'Miesiąc poprzedni' },
]

const activeModeClasses = 'border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-app-dark'
const inactiveModeClasses = 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated'

const vehiclePanelClasses = computed(() => {
  const base = 'absolute inset-y-0 left-0 z-30 flex min-h-0 w-full max-w-full flex-col border-r border-slate-200 bg-app-light shadow-sm transition-[width,transform] duration-200 ease-out dark:border-app-border dark:bg-app-dark md:relative md:z-auto md:max-w-none md:shadow-none'

  return vehiclePanelCollapsed.value
    ? `${base} -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0`
    : `${base} translate-x-0 md:w-96 md:translate-x-0`
})

const fleetSelectOptions = computed(() => [
  { value: 'all', label: 'Wszystkie floty' },
  ...fleetStore.vehicleTypeGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.vehiclesCount})`,
  })),
  ...fleetStore.vehicleGroups.map((group) => ({
    value: group.id,
    label: `${group.name} (${group.vehiclesCount})`,
  })),
])

const selectedVehicle = computed(() => (
  selectedVehicleId.value
    ? fleetStore.vehicles.find((vehicle) => vehicle.id === selectedVehicleId.value) || null
    : null
))

const formatPlaceFormCoordinates = computed(() => {
  if (placeForm.latitude === null || placeForm.longitude === null) return 'Brak współrzędnych'
  return `${placeForm.latitude.toFixed(6)}, ${placeForm.longitude.toFixed(6)}`
})

const filteredVehicles = computed(() => {
  const query = vehicleSearch.value.trim().toLowerCase()

  const matchedVehicles = fleetStore.vehicles.filter((vehicle) => {
    const driver = vehicleDriverLabel(vehicle).toLowerCase()
    const matchesFleet = selectedFleetId.value === 'all' || fleetStore.isVehicleInGroup(selectedFleetId.value, vehicle.id)
    const matchesQuery = !query ||
      vehicle.plateNumber.toLowerCase().includes(query) ||
      vehicle.name.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      (vehicle.vin || '').toLowerCase().includes(query) ||
      driver.includes(query)

    return matchesFleet && matchesQuery
  })

  return sortVehicles(matchedVehicles)
})

const mapMarkerVehicles = computed(() => {
  if (activeMode.value === 'history') {
    return []
  }

  return filteredVehicles.value.filter((vehicle) => vehicle.hasPosition)
})

const activeRepairsByVehicleId = computed(() => {
  const grouped = new Map<string, Repair[]>()

  repairs.value.forEach((repair) => {
    const status = String(repair.status || '').trim().toLowerCase()

    if (status === 'done' || status === 'cancelled') {
      return
    }

    const vehicleId = repair.vehicle?.id ?? repair.vehicleId
    const key = String(vehicleId)
    grouped.set(key, [...(grouped.get(key) || []), repair])
  })

  return grouped
})

const canSearchHistory = computed(() => (
  historyFilters.vehicleId !== 'all' &&
  Boolean(historyFilters.dateFrom) &&
  Boolean(historyFilters.dateTo) &&
  !fleetStore.isRouteHistoryLoading
))

const showHistorySummary = computed(() => (
  fleetStore.currentPositionHistoryMode === 'custom' &&
  fleetStore.currentPositionHistoryVehicleId !== null &&
  fleetStore.currentPositionHistoryRange !== null &&
  fleetStore.currentPositionHistorySummary !== null
))

const historyRangeLabel = computed(() => {
  const range = fleetStore.currentPositionHistoryRange

  if (!range) {
    return '—'
  }

  return `${formatUnixTimestamp(range.from)} – ${formatUnixTimestamp(range.to)}`
})

const historyDistanceLabel = computed(() => {
  const mileageDistance = fleetStore.currentPositionHistorySummary?.mileageDifferenceKm
  const distance = mileageDistance ?? calculateRouteDistanceKm(positionHistory.path.value)
  return formatMileage(distance)
})

const historyStartMileageLabel = computed(() => formatMileage(
  fleetStore.currentPositionHistorySummary?.firstMileageKm ?? null,
))

const historyEndMileageLabel = computed(() => formatMileage(
  fleetStore.currentPositionHistorySummary?.lastMileageKm ?? null,
))

const historyAverageSpeedLabel = computed(() => {
  const speeds = positionHistory.records.value
    .map((point) => point.speedKph)
    .filter((speed): speed is number => speed !== null && Number.isFinite(speed) && speed >= 0)

  if (!speeds.length) {
    return '—'
  }

  const averageSpeed = speeds.reduce((total, speed) => total + speed, 0) / speeds.length
  return `${averageSpeed.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/h`
})

const fuelUnitOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'liters', label: 'Litry' },
  { value: 'percent', label: '%' },
]

const selectedVehicleLifecycleItems = computed(() => {
  if (!selectedVehicle.value) {
    return []
  }

  return [
    {
      label: 'Przegląd techniczny',
      date: selectedVehicle.value.technicalInspection,
    },
    {
      label: 'Tachograf',
      date: selectedVehicle.value.tachographInspection,
    },
    {
      label: 'Winieta UK',
      date: selectedVehicle.value.vignetteUk,
    },
    {
      label: 'Winieta Luksemburg',
      date: selectedVehicle.value.vignetteLuxembourg,
    },
    {
      label: 'Winieta Dania',
      date: selectedVehicle.value.vignetteDenmark,
    },
  ].map((item) => {
    const daysLeft = daysUntilDate(item.date)

    return {
      ...item,
      dateLabel: item.date ? formatDateLabel(item.date) : '—',
      daysLabel: formatDaysLeft(daysLeft),
      variant: resolveDaysVariant(daysLeft),
    }
  })
})

const mapMessage = computed(() => {
  if (mapState.value === 'missing-key') {
    return {
      title: 'Brak klucza Google Maps',
      description: 'Dodaj VITE_GOOGLE_MAPS_API_KEY w pliku .env, a mapa zaladuje sie automatycznie.',
    }
  }

  if (mapState.value === 'error') {
    return {
      title: 'Nie udalo sie zaladowac Google Maps',
      description: 'Sprawdz klucz API, domeny dozwolone w Google Cloud i polaczenie sieciowe.',
    }
  }

  return {
    title: 'Ladowanie mapy',
    description: 'Pobieram Google Maps i nanosze pojazdy.',
  }
})

function applyHistoryPreset(preset: HistoryPreset) {
  const range = historyRangeForPreset(preset)
  historyFilters.dateFrom = toLocalDateTimeValue(range.from)
  historyFilters.dateTo = toLocalDateTimeValue(range.to)
  historyFormError.value = ''
}

function setCustomHistoryDate(field: 'dateFrom' | 'dateTo', value: string) {
  historyFilters[field] = value
  historyFilters.preset = ''
}

function toggleVehiclePanel() {
  vehiclePanelCollapsed.value = !vehiclePanelCollapsed.value
}

function collapseVehiclePanelOnMobile() {
  if (isMobileMapViewport()) {
    vehiclePanelCollapsed.value = true
  }
}

function showVehicleDetailsDrawer() {
  vehicleDetailsDrawerOpen.value = true
}

function hideVehicleDetailsDrawer() {
  vehicleDetailsDrawerOpen.value = false
}

function clearPositionHistoryData() {
  positionHistory.clear()
  fleetStore.clearPositionHistory()
}

function setVehicleSort(key: VehicleSortKey) {
  if (vehicleSort.key === key) {
    vehicleSort.direction = vehicleSort.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  vehicleSort.key = key
  vehicleSort.direction = 'asc'
}

function sortIcon(key: VehicleSortKey): Component {
  if (vehicleSort.key !== key) {
    return ArrowUpDown
  }

  return vehicleSort.direction === 'asc' ? ArrowUp : ArrowDown
}

function compareVehicleText(first: string, second: string) {
  return first.localeCompare(second, 'pl', {
    numeric: true,
    sensitivity: 'base',
  })
}

function sortVehicles(vehicles: Vehicle[]) {
  const direction = vehicleSort.direction === 'asc' ? 1 : -1

  return [...vehicles].sort((first, second) => {
    if (vehicleSort.key === 'order') {
      const byBackendId = (first.backendId - second.backendId) * direction
      return byBackendId || compareVehicleText(first.plateNumber, second.plateNumber)
    }

    if (vehicleSort.key === 'fuel') {
      if (first.fuelPct === null && second.fuelPct === null) {
        return compareVehicleText(first.plateNumber, second.plateNumber)
      }

      if (first.fuelPct === null) {
        return 1
      }

      if (second.fuelPct === null) {
        return -1
      }

      const byFuel = (first.fuelPct - second.fuelPct) * direction
      return byFuel || compareVehicleText(first.plateNumber, second.plateNumber)
    }

    return compareVehicleText(first.plateNumber, second.plateNumber) * direction
  })
}

function vehicleDriverLabel(vehicle: Vehicle) {
  if (vehicle.vehicleType === 'trailer') {
    return ''
  }

  return vehicle.driverName || (vehicle.driverId ? fleetStore.drivers.find((driver) => driver.id === vehicle.driverId)?.name : null) || ''
}

function formatUnixTimestamp(value: string) {
  const timestamp = Number(value)

  if (!Number.isFinite(timestamp)) {
    return '—'
  }

  return new Date(timestamp * 1000).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMileage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

function calculateRouteDistanceKm(points: RouteLatLng[]) {
  const earthRadiusKm = 6371
  let distance = 0

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const latitudeDelta = (current.lat - previous.lat) * Math.PI / 180
    const longitudeDelta = (current.lng - previous.lng) * Math.PI / 180
    const previousLatitude = previous.lat * Math.PI / 180
    const currentLatitude = current.lat * Math.PI / 180
    const haversine = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(previousLatitude) * Math.cos(currentLatitude) * Math.sin(longitudeDelta / 2) ** 2
    distance += earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  }

  return distance
}

function routePointDriverLabel(point: ApiPositionHistoryPoint) {
  const driver = point.driver0 || point.driver1

  if (!driver) {
    return '-'
  }

  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim()
  return name || String(driver.tachoid)
}

function routePointCoordinates(point: ApiPositionHistoryPoint) {
  return point.lat !== null && point.lon !== null
    ? `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
    : '-'
}

function routePointSpeed(point: ApiPositionHistoryPoint) {
  return `${Math.round(point.speedKph ?? 0)} km/h`
}

function routePointFuel(point: ApiPositionHistoryPoint) {
  return point.fuelPct === null ? '-' : `${Math.round(point.fuelPct)}%`
}

function routePointTimestamp(point: ApiPositionHistoryPoint) {
  return formatDateTimeLabel(point.ts)
}

function copyRoutePointCoordinates(point: ApiPositionHistoryPoint) {
  if (point.lat === null || point.lon === null || !navigator.clipboard) {
    return
  }

  const coordinates = routePointCoordinates(point)

  void navigator.clipboard.writeText(coordinates).then(() => {
    uiStore.addToast({
      type: 'success',
      title: 'Skopiowano do schowka',
      message: `Koordynaty ${coordinates}`,
    })
  })
}

function openRoutePointInGoogleMaps(point: ApiPositionHistoryPoint) {
  if (point.lat === null || point.lon === null) {
    return
  }

  window.open(`https://www.google.com/maps?q=${point.lat},${point.lon}`, '_blank', 'noopener,noreferrer')
}

function formatFuel(vehicle: Vehicle) {
  if (vehicle.fuelPct === null) {
    return '-'
  }

  if (mapSettings.map.fuelUnit === 'liters' || (mapSettings.map.fuelUnit === 'auto' && vehicle.fuelTank > 0)) {
    return vehicle.fuelTank > 0
      ? `${Math.round((vehicle.fuelPct / 100) * vehicle.fuelTank)} l`
      : `${Math.round(vehicle.fuelPct)}%`
  }

  return `${Math.round(vehicle.fuelPct)}%`
}

function daysUntilDate(value: string | null) {
  const dueDate = parseDate(value)

  if (!dueDate) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function formatDaysLeft(daysLeft: number | null) {
  if (daysLeft === null) {
    return '—'
  }

  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)}d po`
  }

  if (daysLeft === 0) {
    return 'dzisiaj'
  }

  return `${daysLeft}d`
}

function formatDateLabel(value: string) {
  const date = parseDate(value)

  if (!date) {
    return value
  }

  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTimeLabel(value: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatPositionUpdatedAt(value: string | null) {
  return formatDateTimeLabel(value)
}

function formatSignalAge(vehicle: Vehicle) {
  const ageHours = positionAgeHours(vehicle)

  if (ageHours === null) {
    return ''
  }

  const days = Math.floor(ageHours / 24)
  const hours = ageHours % 24

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  return `${ageHours}h`
}

function vehicleSignalLabel(vehicle: Vehicle) {
  if (isPositionStale(vehicle)) {
    const age = formatSignalAge(vehicle)
    return age ? `Brak sygnału GPS ${age} temu` : 'Brak sygnału GPS'
  }

  return formatDateTimeLabel(vehicle.positionTimestamp)
}

function parseDate(value: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  const isoDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const polishDateMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  if (polishDateMatch) {
    const [, day, month, year] = polishDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function vehicleStatusLabel(vehicle: Vehicle) {
  if (vehicle.status === 'moving') {
    return 'W ruchu'
  }

  if (vehicle.status === 'idle') {
    return 'Postój'
  }

  if (vehicle.status === 'service') {
    return 'Serwis'
  }

  return 'Offline'
}

function vehicleCoordinates(vehicle: Vehicle) {
  return vehicle.hasPosition
    ? `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`
    : '-'
}

function copyVehiclePosition(vehicle: Vehicle) {
  if (!vehicle.hasPosition || !navigator.clipboard) {
    return
  }

  const coordinates = vehicleCoordinates(vehicle)

  void navigator.clipboard.writeText(coordinates).then(() => {
    uiStore.addToast({
      type: 'success',
      title: 'Skopiowano do schowka',
      message: `Koordynaty ${coordinates}`,
    })
  })
}

function positionAgeHours(vehicle: Vehicle) {
  if (!vehicle.positionTimestamp) {
    return null
  }

  const timestamp = new Date(vehicle.positionTimestamp).getTime()

  if (Number.isNaN(timestamp)) {
    return null
  }

  return Math.floor((Date.now() - timestamp) / (60 * 60 * 1000))
}

function vehicleAlertItems(vehicle: Vehicle): VehicleAlertItem[] {
  const alerts: VehicleAlertItem[] = vehicle.alerts.map((alert) => ({
    id: alert.kind,
    title: alert.title,
    description: `Do: ${formatDateLabel(alert.dueDate)}`,
    dateLabel: formatDateLabel(alert.dueDate),
    daysLabel: formatDaysLeft(alert.daysLeft),
    daysLeft: alert.daysLeft,
    variant: resolveDaysVariant(alert.daysLeft),
    repairId: null,
    placeName: '',
    createdByName: '',
    faults: [],
  }))

  const repairAlerts = (activeRepairsByVehicleId.value.get(String(vehicle.backendId)) || []).map((repair) => ({
    id: `repair-${repair.id}`,
    title: `Naprawa #${repair.id}`,
    description: repair.placeName || repair.place?.name || 'Brak przypisanego miejsca',
    dateLabel: '',
    daysLabel: repairStatusLabel(repair.status),
    daysLeft: null,
    variant: 'info' as BadgeVariant,
    repairId: repair.id,
    placeName: repair.placeName || repair.place?.name || 'Brak przypisanego miejsca',
    createdByName: repairCreatedByName(repair),
    faults: repair.faults.map((fault) => fault.description).filter(Boolean),
  }))

  alerts.push(...repairAlerts)

  const ageHours = positionAgeHours(vehicle)

  if (ageHours === null || ageHours >= 24) {
    const signalAge = formatSignalAge(vehicle)

    alerts.unshift({
      id: 'gps-offline',
      title: 'Brak sygnału GPS',
      description: signalAge ? `${signalAge} temu` : 'Brak aktualnej pozycji',
      dateLabel: '',
      daysLabel: signalAge || '>24h',
      daysLeft: null,
      variant: 'error',
      repairId: null,
      placeName: '',
      createdByName: '',
      faults: [],
    })
  }

  return alerts
}

function repairStatusLabel(status: Repair['status']) {
  const normalized = String(status || '').trim().toLowerCase()
  const labels: Record<string, string> = {
    new: 'Nowa',
    planned: 'Zaplanowana',
    ready_to_be_repaired: 'Gotowa',
    at_location: 'W lokalizacji',
    in_field: 'W terenie',
    infield: 'W terenie',
  }

  return labels[normalized] || 'Aktywna'
}

function repairCreatedByName(repair: Repair) {
  if (repair.createdByUsername) {
    return repair.createdByUsername
  }

  if (repair.createdBy && typeof repair.createdBy === 'object' && repair.createdBy.username) {
    return repair.createdBy.username
  }

  return 'Brak danych'
}

function alertDeadlineClasses(alert: VehicleAlertItem) {
  if (alert.variant === 'error') {
    return 'font-semibold text-danger-600 dark:text-danger-400'
  }

  if (alert.variant === 'warning') {
    return 'font-semibold text-amber-300'
  }

  return 'text-white/55'
}

function vehicleAlertSeverity(vehicle: Vehicle) {
  const alerts = vehicleAlertItems(vehicle)

  if (alerts.some((alert) => alert.variant === 'error')) {
    return 'error'
  }

  if (alerts.some((alert) => alert.variant === 'warning')) {
    return 'warning'
  }

  return 'neutral'
}

function vehicleAlertIconClasses(vehicle: Vehicle) {
  const severity = vehicleAlertSeverity(vehicle)

  if (severity === 'warning') {
    return 'text-amber-500 dark:text-amber-300'
  }

  if (severity === 'error') {
    return 'text-danger-600 dark:text-danger-400'
  }

  return 'text-slate-600 dark:text-slate-300'
}

function vehicleAlertCountClasses(vehicle: Vehicle) {
  const severity = vehicleAlertSeverity(vehicle)

  if (severity === 'warning') {
    return 'bg-amber-400 text-slate-950 dark:bg-amber-300 dark:text-app-dark'
  }

  if (severity === 'error') {
    return 'bg-danger-600 text-white dark:bg-danger-400 dark:text-app-dark'
  }

  return 'bg-slate-200 text-slate-700 dark:bg-app-elevated dark:text-slate-100'
}

function showAlertTooltip(vehicle: Vehicle, event: MouseEvent | FocusEvent, pinned = false) {
  cancelAlertTooltipHide()
  const target = event.currentTarget as HTMLElement | null

  if (!target) {
    return
  }

  const rect = target.getBoundingClientRect()
  const tooltipY = Math.min(Math.max(rect.top + rect.height / 2, 96), window.innerHeight - 96)

  activeAlertTooltip.value = {
    vehicleId: vehicle.id,
    items: vehicleAlertItems(vehicle),
    x: rect.right + 8,
    y: tooltipY,
    pinned,
  }
}

function toggleAlertTooltip(vehicle: Vehicle, event: MouseEvent) {
  if (activeAlertTooltip.value?.vehicleId === vehicle.id && activeAlertTooltip.value.pinned) {
    activeAlertTooltip.value = null
    return
  }

  showAlertTooltip(vehicle, event, true)
}

function hideAlertTooltip() {
  if (!activeAlertTooltip.value?.pinned) {
    activeAlertTooltip.value = null
  }
}

function scheduleAlertTooltipHide() {
  cancelAlertTooltipHide()

  if (activeAlertTooltip.value?.pinned) {
    return
  }

  alertTooltipHideTimer = window.setTimeout(() => {
    hideAlertTooltip()
    alertTooltipHideTimer = null
  }, 140)
}

function cancelAlertTooltipHide() {
  if (alertTooltipHideTimer !== null) {
    window.clearTimeout(alertTooltipHideTimer)
    alertTooltipHideTimer = null
  }
}

function openAlertRepair(alert: VehicleAlertItem) {
  if (!alert.repairId) {
    return
  }

  activeAlertTooltip.value = null
  void router.push({ name: 'repair-detail', params: { id: alert.repairId } })
}

function hidePinnedOverlays() {
  cancelAlertTooltipHide()
  activeAlertTooltip.value = null
  layersMenuOpen.value = false
  placesMenuOpen.value = false
  if (routeInfoWindowPinned) {
    closeRouteInfoWindow()
  }
}

function toggleLayersMenu() {
  layersMenuOpen.value = !layersMenuOpen.value
  placesMenuOpen.value = false
}

function togglePlacesMenu() {
  placesMenuOpen.value = !placesMenuOpen.value
  layersMenuOpen.value = false
}

function openPlacesPanel() {
  activeMode.value = 'places'
  vehiclePanelCollapsed.value = false
  selectedVehicleId.value = null
  vehicleDetailsDrawerOpen.value = false
  clearTodayRoute()
  clearPositionHistoryData()
  layersMenuOpen.value = false
  placesMenuOpen.value = false
}

function finishPlaceEditing() {
  isPlacePlacementMode.value = false
  applyPlacePlacementCursor()
  activeMode.value = 'list'
}

function applyPlacePlacementCursor() {
  googleMap.value?.setOptions?.({
    draggableCursor: isPlacePlacementMode.value ? 'crosshair' : null,
  })
}

function togglePlacePlacementMode() {
  isPlacePlacementMode.value = !isPlacePlacementMode.value
  placeFormError.value = ''

  if (isPlacePlacementMode.value) {
    mapSettings.map.showPlaces = true
    layersMenuOpen.value = false
    collapseVehiclePanelOnMobile()
  }

  applyPlacePlacementCursor()
}

function openCreatePlaceAt(latitude: number, longitude: number) {
  Object.assign(placeForm, emptyPlaceForm(), { latitude, longitude })
  placeFormError.value = ''
  isPlacePlacementMode.value = false
  placeFormTab.value = 'data'
  isPlaceFormOpen.value = true
  applyPlacePlacementCursor()
}

function openEditPlace(place: Place) {
  Object.assign(placeForm, {
    id: place.id,
    name: place.name,
    phone: place.phone || '',
    radiusMeters: String(place.radiusMeters),
    color: place.color || '#7093ff',
    latitude: place.latitude,
    longitude: place.longitude,
    visible: place.visible,
    city: place.city || '',
    email: place.email || '',
    description: place.description || '',
  })
  placeFormError.value = ''
  placeFormTab.value = 'data'
  isPlacePlacementMode.value = false
  isPlaceFormOpen.value = true
  applyPlacePlacementCursor()
}

function closePlaceForm() {
  if (isPlaceMutating.value) return
  isPlaceFormOpen.value = false
  placeFormError.value = ''
}

function nullablePlaceValue(value: string) {
  const normalized = value.trim()
  return normalized || null
}

async function submitPlaceForm() {
  const name = placeForm.name.trim()
  const radiusMeters = Number(placeForm.radiusMeters)

  if (!name) {
    placeFormError.value = 'Podaj nazwę miejsca.'
    return
  }

  if (placeForm.latitude === null || placeForm.longitude === null) {
    placeFormError.value = 'Wskaż punkt miejsca na mapie.'
    return
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    placeFormError.value = 'Promień musi być liczbą większą od zera.'
    return
  }

  const payload: PlacePayload = {
    name,
    phone: nullablePlaceValue(placeForm.phone),
    radiusMeters,
    color: placeForm.color,
    latitude: placeForm.latitude,
    longitude: placeForm.longitude,
    visible: placeForm.visible,
    city: nullablePlaceValue(placeForm.city),
    email: nullablePlaceValue(placeForm.email),
    description: nullablePlaceValue(placeForm.description),
  }

  try {
    if (placeForm.id) {
      await placeStore.updatePlace(placeForm.id, payload)
      uiStore.addToast({ type: 'success', title: 'Miejsce zaktualizowane', message: 'Zapisano zmiany miejsca.' })
    } else {
      await placeStore.createPlace(payload)
      uiStore.addToast({ type: 'success', title: 'Miejsce dodane', message: 'Nowa strefa jest dostępna na mapie.' })
    }

    isPlaceFormOpen.value = false
    mapSettings.map.showPlaces = true
    void repairStore.loadDictionaries()
  } catch {
    // Global API interceptor displays the backend error.
  }
}

async function confirmDeletePlace() {
  if (!placeToDelete.value) return

  const placeId = placeToDelete.value.id

  try {
    await placeStore.deletePlace(placeId)
    placeToDelete.value = null
    uiStore.addToast({ type: 'success', title: 'Miejsce usunięte', message: 'Usunięto miejsce i jego strefę z mapy.' })
    void repairStore.loadDictionaries()
  } catch {
    // Keep the confirmation open; the global interceptor displays the API error.
  }
}

function formatPlaceCoordinates(place: Place) {
  return `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`
}

function focusPlace(place: Place) {
  if (!googleMap.value) return
  googleMap.value.panTo({ lat: place.latitude, lng: place.longitude })
  collapseVehiclePanelOnMobile()
}

async function movePlace(place: Place, latitude: number, longitude: number) {
  try {
    await placeStore.updatePlace(place.id, { latitude, longitude })
    uiStore.addToast({
      type: 'success',
      title: 'Położenie zapisane',
      message: `Zaktualizowano środek strefy „${place.name}”.`,
    })
  } catch {
    await placeStore.loadPlaces({ silent: true }).catch(() => undefined)
    renderPlaceOverlays()
  }
}

function resolveDaysVariant(daysLeft: number | null): BadgeVariant {
  if (daysLeft === null) {
    return 'neutral'
  }

  if (daysLeft < 15) {
    return 'error'
  }

  if (daysLeft < 30) {
    return 'warning'
  }

  return 'neutral'
}

function setFuelUnit(value: string) {
  mapSettings.map.fuelUnit = value as FuelUnit
}

function mapOptionClasses(isActive: boolean) {
  return isActive
    ? 'bg-white text-slate-950 shadow-sm dark:bg-app-dark dark:text-slate-50'
    : 'text-slate-500 hover:text-slate-950 dark:text-app-muted dark:hover:text-slate-50'
}

function setMapTheme(theme: MapTheme) {
  mapSettings.map.mapTheme = theme
}

function setMapType(mapType: GoogleMapType) {
  mapSettings.map.mapType = mapType
}

function applyGoogleMapOptions() {
  if (!googleMap.value || !window.google?.maps) {
    return
  }

  googleMap.value.setMapTypeId(mapSettings.map.mapType)
  googleMap.value.setOptions({
    styles: mapSettings.map.mapTheme === 'dark' && mapSettings.map.mapType === 'roadmap'
      ? DARK_STYLES
      : null,
  })

  if (!googleTrafficLayer.value) {
    googleTrafficLayer.value = new window.google.maps.TrafficLayer()
  }

  googleTrafficLayer.value.setMap(mapSettings.map.trafficLayer ? googleMap.value : null)
  refreshRouteInfoWindowContent()
}

function clearPlaceOverlays() {
  placeCircles.forEach((circle) => {
    window.google?.maps?.event?.clearInstanceListeners?.(circle)
    circle.setMap(null)
  })
  placeMarkers.forEach((marker) => {
    window.google?.maps?.event?.clearInstanceListeners?.(marker)
    marker.setMap(null)
  })
  placeCircles.clear()
  placeMarkers.clear()
}

function renderPlaceOverlays() {
  clearPlaceOverlays()

  if (!googleMap.value || !window.google?.maps || !mapSettings.map.showPlaces) return

  const isEditingPlaces = activeMode.value === 'places'

  places.value.forEach((place) => {
    if (!place.visible || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return

    const center = { lat: place.latitude, lng: place.longitude }
    const circle = new window.google.maps.Circle({
      map: googleMap.value,
      center,
      radius: Math.max(1, place.radiusMeters),
      strokeColor: place.color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: place.color,
      fillOpacity: 0.16,
      clickable: isEditingPlaces,
    })
    const marker = new window.google.maps.Marker({
      map: googleMap.value,
      position: center,
      title: place.name,
      clickable: isEditingPlaces,
      draggable: isEditingPlaces,
      cursor: isEditingPlaces ? 'grab' : 'default',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: place.color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 2,
      },
      zIndex: 20,
    })

    if (isEditingPlaces) {
      circle.addListener('click', () => openEditPlace(place))
      marker.addListener('click', () => openEditPlace(place))
      marker.addListener('drag', (event: any) => {
        if (event.latLng) circle.setCenter(event.latLng)
      })
      marker.addListener('dragend', (event: any) => {
        if (!event.latLng) return
        void movePlace(place, event.latLng.lat(), event.latLng.lng())
      })
    }
    placeCircles.set(place.id, circle)
    placeMarkers.set(place.id, marker)
  })
}

function clearMarkers() {
  googleMarkers.value.forEach((marker) => {
    window.google?.maps?.event?.clearInstanceListeners?.(marker)
    marker.setMap(null)
  })
  googleMarkers.value = markRaw([])
}

function cancelRouteAnimation() {
  routeAnimationId += 1

  if (routeAnimationFrameId !== null) {
    window.cancelAnimationFrame(routeAnimationFrameId)
    routeAnimationFrameId = null
  }

  isHistoryRendering.value = false
}

function closeRouteInfoWindow() {
  routeInfoWindow?.close?.()
  routeInfoWindowPinned = false
  routeInfoWindowRecordIndex = null
}

function disposeRouteInfoWindow() {
  closeRouteInfoWindow()

  if (routeInfoWindow) {
    window.google?.maps?.event?.clearInstanceListeners?.(routeInfoWindow)
  }

  routeInfoWindowContent?.removeEventListener('click', handleRouteInfoWindowAction)
  routeInfoWindowContent = null
  routeInfoWindow = null
}

function clearRoutePointMarkers() {
  todayRoutePointMarkers.forEach((marker) => {
    if (typeof marker.destroy === 'function') {
      marker.destroy()
    } else {
      window.google?.maps?.event?.clearInstanceListeners?.(marker)
      marker.setMap(null)
    }
  })
  todayRoutePointMarkers.clear()
}

function clearRoutePolyline() {
  if (!todayRoutePolyline) {
    return
  }

  todayRoutePolyline.setPath([])
  todayRoutePolyline.setMap(null)
  todayRoutePolyline.unbindAll?.()
  window.google?.maps?.event?.clearInstanceListeners?.(todayRoutePolyline)
  todayRoutePolyline = null
}

function clearTodayRoute(invalidateRequest = true) {
  cancelRouteAnimation()

  if (invalidateRequest) {
    todayRouteRequestId += 1
  }

  if (routeZoomRefreshFrameId !== null) {
    window.cancelAnimationFrame(routeZoomRefreshFrameId)
    routeZoomRefreshFrameId = null
  }

  clearRoutePointMarkers()
  clearRoutePolyline()
  closeRouteInfoWindow()
  renderedRoutePositionCount = 0
  isRouteRenderComplete = false
  historyRenderProgress.value = 0
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

  if (mapSettings.map.showMarkerAlerts && vehicle.alerts.length) {
    return 'alert'
  }

  return 'idle'
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

function markerLabelHtml(vehicle: Vehicle) {
  if (!mapSettings.map.showMarkerLabels) {
    return ''
  }

  const driver = vehicleDriverLabel(vehicle)
  const driverHtml = mapSettings.map.showMarkerDriver && driver
    ? `<span class="rw-map-marker-driver">${escapeHtml(driver)}</span>`
    : ''

  return `<span class="rw-map-marker-plate"><span class="rw-map-marker-plate-number">${escapeHtml(vehicle.plateNumber)}</span>${driverHtml}</span>`
}

function markerIconHtml(vehicle: Vehicle) {
  const state = markerState(vehicle)

  return `
    <span class="rw-map-marker-icon rw-map-marker-${state}" style="--rw-marker-heading: ${vehicle.heading ?? 0}deg">
      ${markerIconSvg(vehicle)}
    </span>
  `
}

function markerHtml(vehicle: Vehicle) {
  const plateNumber = escapeHtml(vehicle.plateNumber)

  return `
    <button type="button" class="rw-map-marker-button" title="${plateNumber}" aria-label="Pokaz pojazd ${plateNumber}">
      ${markerIconHtml(vehicle)}
    </button>
    ${markerLabelHtml(vehicle)}
  `
}

function createVehicleMarker(vehicle: Vehicle) {
  const overlay = new window.google.maps.OverlayView()
  let element: HTMLDivElement | null = null
  let button: HTMLButtonElement | null = null

  overlay.onAdd = () => {
    element = document.createElement('div')
    element.className = `rw-map-vehicle-marker rw-map-vehicle-marker-${vehicle.vehicleType}`
    element.title = vehicle.plateNumber
    element.innerHTML = markerHtml(vehicle)
    button = element.querySelector<HTMLButtonElement>('.rw-map-marker-button')
    button?.addEventListener('click', (event) => {
      event.stopPropagation()
      selectVehicle(vehicle.id)
    })
    overlay.getPanes()?.overlayMouseTarget.appendChild(element)
  }

  overlay.draw = () => {
    if (!element) {
      return
    }

    const projection = overlay.getProjection()
    const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(vehicle.latitude, vehicle.longitude))

    if (!point) {
      return
    }

    element.style.left = `${point.x}px`
    element.style.top = `${point.y}px`
  }

  overlay.onRemove = () => {
    element?.remove()
    element = null
    button = null
  }

  overlay.setMap(googleMap.value)
  return overlay
}

function isTrailerRoutePoint(point: ApiPositionHistoryPoint) {
  if (point.vehicleId === null) {
    return false
  }

  return fleetStore.vehicles
    .find((vehicle) => vehicle.backendId === point.vehicleId)
    ?.vehicleType === 'trailer'
}

let routeInfoCopyIconHtml = ''
let routeInfoMapsIconHtml = ''
let routeInfoCloseIconHtml = ''

function routeInfoActionIcon(action: 'copy' | 'maps' | 'close') {
  const currentIcon = action === 'copy'
    ? routeInfoCopyIconHtml
    : action === 'maps'
      ? routeInfoMapsIconHtml
      : routeInfoCloseIconHtml

  if (currentIcon) {
    return currentIcon
  }

  const iconContainer = document.createElement('span')
  const icon = action === 'copy' ? Copy : action === 'maps' ? LocateFixed : X
  render(h(icon, {
    class: 'rw-route-info-action-icon',
    'aria-hidden': 'true',
    strokeWidth: 2.2,
  }), iconContainer)

  if (action === 'copy') routeInfoCopyIconHtml = iconContainer.innerHTML
  if (action === 'maps') routeInfoMapsIconHtml = iconContainer.innerHTML
  if (action === 'close') routeInfoCloseIconHtml = iconContainer.innerHTML
  return iconContainer.innerHTML
}

function routeInfoWindowHtml(point: ApiPositionHistoryPoint, pinned: boolean) {
  const showVehicleData = !isTrailerRoutePoint(point)
  const vehicleLabel = escapeHtml(selectedVehicle.value?.plateNumber || 'Pozycja GPS')
  const driverRow = showVehicleData
    ? `<div class="rw-route-info-row"><span>Kierowca</span><strong>${escapeHtml(routePointDriverLabel(point))}</strong></div>`
    : ''
  const fuelRow = showVehicleData
    ? `<div class="rw-route-info-row"><span>Paliwo</span><strong>${escapeHtml(routePointFuel(point))}</strong></div>`
    : ''
  const closeButton = pinned
    ? `<button type="button" class="rw-route-info-action" data-route-action="close" aria-label="Zamknij szczegóły punktu" title="Zamknij">${routeInfoActionIcon('close')}</button>`
    : ''

  return `
    <div class="rw-route-info-window">
      <div class="rw-route-info-header">
        <strong>${vehicleLabel}</strong>
        <div class="rw-route-info-header-meta">
          <span>${escapeHtml(routePointTimestamp(point))}</span>
          ${closeButton}
        </div>
      </div>
      <div class="rw-route-info-body">
        ${driverRow}
        <div class="rw-route-info-row">
          <span>GPS</span>
          <div class="rw-route-info-value-actions">
            <strong>${escapeHtml(routePointCoordinates(point))}</strong>
            <button type="button" class="rw-route-info-action" data-route-action="copy" aria-label="Kopiuj koordynaty" title="Kopiuj koordynaty">${routeInfoActionIcon('copy')}</button>
            <button type="button" class="rw-route-info-action" data-route-action="maps" aria-label="Otwórz w Google Maps" title="Otwórz w Google Maps">${routeInfoActionIcon('maps')}</button>
          </div>
        </div>
        <div class="rw-route-info-row"><span>Prędkość</span><strong>${escapeHtml(routePointSpeed(point))}</strong></div>
        ${fuelRow}
      </div>
    </div>
  `
}

function handleRouteInfoWindowAction(event: Event) {
  event.stopPropagation()
  const target = event.target as HTMLElement | null
  const action = target?.closest<HTMLButtonElement>('[data-route-action]')?.dataset.routeAction

  if (!action || routeInfoWindowRecordIndex === null) {
    return
  }

  const point = positionHistory.records.value[routeInfoWindowRecordIndex]

  if (!point) {
    return
  }

  if (action === 'close') {
    closeRouteInfoWindow()
  } else if (action === 'copy') {
    copyRoutePointCoordinates(point)
  } else if (action === 'maps') {
    openRoutePointInGoogleMaps(point)
  }
}

function ensureRouteInfoWindow() {
  if (routeInfoWindow || !window.google?.maps) {
    return
  }

  routeInfoWindowContent = document.createElement('div')
  routeInfoWindowContent.addEventListener('click', handleRouteInfoWindowAction)
  routeInfoWindow = markRaw(new window.google.maps.InfoWindow({
    content: routeInfoWindowContent,
    disableAutoPan: false,
    headerDisabled: true,
    pixelOffset: new window.google.maps.Size(0, -8),
  }))
  routeInfoWindow.addListener('closeclick', () => {
    routeInfoWindowPinned = false
    routeInfoWindowRecordIndex = null
  })
}

function showRoutePointInfo(recordIndex: number, position: RouteLatLng, pinned = false) {
  if (routeInfoWindowPinned && !pinned) {
    return
  }

  const point = positionHistory.records.value[recordIndex]

  if (!point || !googleMap.value) {
    return
  }

  ensureRouteInfoWindow()

  if (!routeInfoWindow || !routeInfoWindowContent) {
    return
  }

  routeInfoWindowRecordIndex = recordIndex
  routeInfoWindowPinned = pinned
  routeInfoWindowContent.innerHTML = routeInfoWindowHtml(point, pinned)
  routeInfoWindow.setPosition(position)
  routeInfoWindow.open({ map: googleMap.value, shouldFocus: false })
}

function refreshRouteInfoWindowContent() {
  if (routeInfoWindowRecordIndex === null || !routeInfoWindowContent) {
    return
  }

  const point = positionHistory.records.value[routeInfoWindowRecordIndex]

  if (point) {
    routeInfoWindowContent.innerHTML = routeInfoWindowHtml(point, routeInfoWindowPinned)
  }
}

function hideRoutePointInfo() {
  if (!routeInfoWindowPinned) {
    closeRouteInfoWindow()
  }
}

let routeFlagIconHtml = ''

function routePointIconSvg(kind: RoutePointMarkerKind) {
  if (kind !== 'point') {
    if (!routeFlagIconHtml) {
      const iconContainer = document.createElement('span')
      render(h(Flag, {
        class: 'rw-route-endpoint-flag',
        'aria-hidden': 'true',
        strokeWidth: 2.4,
      }), iconContainer)
      routeFlagIconHtml = iconContainer.innerHTML
    }

    return routeFlagIconHtml
  }

  return '<svg class="rw-route-point-heading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16"></path><path d="m6 10 6-6 6 6"></path></svg>'
}

function createRoutePointMarker(position: RouteLatLng, recordIndex: number, kind: RoutePointMarkerKind) {
  const overlay = new window.google.maps.OverlayView()
  let element: HTMLButtonElement | null = null
  let disposed = false

  overlay.onAdd = () => {
    if (disposed) {
      return
    }

    element = document.createElement('button')
    element.type = 'button'
    element.className = `rw-route-point-marker rw-route-point-marker-${kind}`
    element.setAttribute('aria-label', 'Szczegóły pozycji GPS')
    element.style.setProperty('--rw-route-heading', `${positionHistory.records.value[recordIndex]?.heading ?? 0}deg`)
    element.innerHTML = routePointIconSvg(kind)
    element.addEventListener('mouseenter', () => showRoutePointInfo(recordIndex, position))
    element.addEventListener('mouseleave', hideRoutePointInfo)
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      showRoutePointInfo(recordIndex, position, true)
    })
    overlay.getPanes()?.overlayMouseTarget.appendChild(element)
  }

  overlay.draw = () => {
    if (disposed || !element) {
      return
    }

    const projection = overlay.getProjection()
    const projectedPoint = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(position.lat, position.lng))

    if (!projectedPoint) {
      return
    }

    element.style.left = `${projectedPoint.x}px`
    element.style.top = `${projectedPoint.y}px`
  }

  overlay.onRemove = () => {
    element?.remove()
    element = null
  }

  ;(overlay as any).destroy = () => {
    disposed = true
    element?.remove()
    element = null
    window.google?.maps?.event?.clearInstanceListeners?.(overlay)
    overlay.setMap(null)
  }

  overlay.setMap(googleMap.value)
  return overlay
}

function renderMarkers() {
  if (!googleMap.value || !window.google?.maps) {
    return
  }

  clearMarkers()

  googleMarkers.value = markRaw(mapMarkerVehicles.value.map((vehicle) => createVehicleMarker(vehicle)))
}

function routeMarkerInterval() {
  const totalRecordCount = positionHistory.records.value.length

  if (totalRecordCount < 100) {
    return 1
  }

  if (!mapSettings.map.historyMarkersByZoom) {
    return ROUTE_DETAIL_POINT_INTERVAL
  }

  const zoom = googleMap.value?.getZoom?.() ?? 10

  if (zoom <= 6) return 50
  if (zoom <= 8) return 30
  if (zoom <= 10) return 20
  if (zoom <= 13) return 10
  return 5
}

function syncRoutePointMarkers(
  renderedPositionCount = renderedRoutePositionCount,
  isComplete = isRouteRenderComplete,
) {
  const availablePositionCount = Math.min(renderedPositionCount, positionHistory.path.value.length)
  const markerInterval = routeMarkerInterval()
  const markerDescriptors: Array<{
    position: RouteLatLng
    recordIndex: number
    kind: RoutePointMarkerKind
  }> = []

  for (let pathIndex = 0; pathIndex < availablePositionCount; pathIndex += 1) {
    const recordIndex = positionHistory.pathRecordIndexes.value[pathIndex]
    const isStart = pathIndex === 0
    const isEnd = isComplete && pathIndex === availablePositionCount - 1

    if (!isStart && !isEnd && recordIndex % markerInterval !== 0) {
      continue
    }

    const showHistoryEndpoints = activeMode.value === 'history'
    const kind: RoutePointMarkerKind = showHistoryEndpoints && isStart
      ? 'start'
      : showHistoryEndpoints && isEnd
        ? 'end'
        : 'point'

    markerDescriptors.push({
      position: positionHistory.path.value[pathIndex],
      recordIndex,
      kind,
    })
  }

  const markerKey = (recordIndex: number, kind: RoutePointMarkerKind) => `${kind}:${recordIndex}`
  const nextKeys = new Set(markerDescriptors.map(({ recordIndex, kind }) => markerKey(recordIndex, kind)))

  todayRoutePointMarkers.forEach((marker, key) => {
    if (nextKeys.has(key)) {
      return
    }

    if (typeof marker.destroy === 'function') {
      marker.destroy()
    } else {
      marker.setMap(null)
    }

    todayRoutePointMarkers.delete(key)
  })

  markerDescriptors.forEach(({ position, recordIndex, kind }) => {
    const key = markerKey(recordIndex, kind)

    if (todayRoutePointMarkers.has(key)) {
      return
    }

    const marker = createRoutePointMarker(position, recordIndex, kind)

    if (marker) {
      todayRoutePointMarkers.set(key, marker)
    }
  })
}

function syncRoutePolyline(renderedPositionCount: number) {
  const fullPath = positionHistory.path.value

  if (!fullPath.length || !googleMap.value || !window.google?.maps) {
    return
  }

  const visiblePath = renderedPositionCount >= fullPath.length
    ? fullPath
    : fullPath.slice(0, renderedPositionCount)

  if (!todayRoutePolyline) {
    todayRoutePolyline = markRaw(new window.google.maps.Polyline({
      map: googleMap.value,
      path: visiblePath,
      clickable: false,
      geodesic: false,
      strokeColor: '#7093ff',
      strokeOpacity: 0.9,
      strokeWeight: 6,
      zIndex: 5,
    }))
    return
  }

  todayRoutePolyline.setPath(visiblePath)
}

function syncTodayRouteRender() {
  renderedRoutePositionCount = positionHistory.path.value.length
  isRouteRenderComplete = true
  syncRoutePolyline(renderedRoutePositionCount)
  syncRoutePointMarkers()
  historyRenderProgress.value = 100
}

function animateHistoryRouteRender() {
  cancelRouteAnimation()
  const routePositionCount = positionHistory.path.value.length

  if (!routePositionCount) {
    historyRenderProgress.value = 0
    return
  }

  if (routePositionCount === 1) {
    syncTodayRouteRender()
    return
  }

  const animationId = routeAnimationId
  let animationStartedAt: number | null = null
  let previousRenderedCount = 0
  isHistoryRendering.value = true
  historyRenderProgress.value = 0
  renderedRoutePositionCount = 1
  isRouteRenderComplete = false
  syncRoutePointMarkers(1, false)

  const renderNextBatch = (timestamp: number) => {
    if (animationId !== routeAnimationId || activeMode.value !== 'history') {
      return
    }

    animationStartedAt ??= timestamp
    const progress = Math.min(1, (timestamp - animationStartedAt) / HISTORY_RENDER_DURATION_MS)
    renderedRoutePositionCount = Math.min(
      routePositionCount,
      Math.max(2, Math.ceil(routePositionCount * progress)),
    )
    historyRenderProgress.value = progress * 100

    if (renderedRoutePositionCount !== previousRenderedCount) {
      syncRoutePolyline(renderedRoutePositionCount)
      previousRenderedCount = renderedRoutePositionCount
    }

    if (progress >= 1) {
      isRouteRenderComplete = true
      syncRoutePointMarkers(renderedRoutePositionCount, true)
      historyRenderProgress.value = 100
      isHistoryRendering.value = false
      routeAnimationFrameId = null
      return
    }

    routeAnimationFrameId = window.requestAnimationFrame(renderNextBatch)
  }

  routeAnimationFrameId = window.requestAnimationFrame(renderNextBatch)
}

function scheduleRouteMarkersForZoom() {
  if (!mapSettings.map.historyMarkersByZoom || !positionHistory.path.value.length) {
    return
  }

  if (routeZoomRefreshFrameId !== null) {
    window.cancelAnimationFrame(routeZoomRefreshFrameId)
  }

  routeZoomRefreshFrameId = window.requestAnimationFrame(() => {
    routeZoomRefreshFrameId = null
    syncRoutePointMarkers()
  })
}

function routeHistoryErrorCode(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status ? String(status) : 'brak kodu'
}

function routeHistoryErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message
  }

  return `Kod błędu: ${routeHistoryErrorCode(error)}`
}

function showRouteHistoryErrorToast(error: unknown) {
  uiStore.addToast({
    type: 'error',
    title: 'Nie udało się pobrać historii',
    message: routeHistoryErrorMessage(error),
  })
}

async function searchPositionHistory() {
  historyFormError.value = ''
  const vehicle = fleetStore.vehicles.find((item) => item.id === historyFilters.vehicleId)
  const from = new Date(historyFilters.dateFrom)
  const to = new Date(historyFilters.dateTo)

  if (!vehicle) {
    historyFormError.value = 'Wybierz pojazd.'
    return
  }

  if (!vehicle.assignedDeviceId) {
    historyFormError.value = 'Pojazd nie ma przypisanego urządzenia GPS.'
    return
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    historyFormError.value = 'Wybierz poprawny zakres dat.'
    return
  }

  if (from.getTime() > to.getTime()) {
    historyFormError.value = 'Data „Od” nie może być późniejsza niż data „Do”.'
    return
  }

  const requestId = todayRouteRequestId + 1
  todayRouteRequestId = requestId
  clearTodayRoute(false)
  positionHistory.clear()
  selectedVehicleId.value = vehicle.id
  vehicleDetailsDrawerOpen.value = false

  try {
    const points = await fleetStore.fetchPositionHistory(vehicle, from, to, { silent: true })

    if (
      activeMode.value === 'history' &&
      requestId === todayRouteRequestId &&
      selectedVehicleId.value === vehicle.id &&
      fleetStore.currentPositionHistoryVehicleId === vehicle.id
    ) {
      positionHistory.replace(points)
      collapseVehiclePanelOnMobile()
      focusPositionHistory()
      animateHistoryRouteRender()
    }
  } catch (error) {
    if (requestId === todayRouteRequestId) {
      clearTodayRoute(false)
      clearPositionHistoryData()
      showRouteHistoryErrorToast(error)
    }
  }
}

async function renderTodayRoute(options: { append?: boolean } = {}) {
  const shouldAppend = options.append === true
  const vehicle = selectedVehicle.value
  const vehicleId = vehicle?.id || null
  const requestId = shouldAppend ? todayRouteRequestId : todayRouteRequestId + 1

  if (!shouldAppend) {
    todayRouteRequestId = requestId
    clearTodayRoute(false)
    positionHistory.clear()
  }

  if (!googleMap.value || !window.google?.maps || !mapSettings.map.todayRoute || !vehicle?.assignedDeviceId) {
    if (!shouldAppend) {
      clearPositionHistoryData()
    }
    return
  }

  try {
    const points = shouldAppend
      ? await fleetStore.appendTodayRouteHistory(vehicle, positionHistory.lastTimestamp(), { silent: true })
      : await fleetStore.fetchTodayRouteHistory(vehicle, { silent: true })

    if (requestId !== todayRouteRequestId || selectedVehicleId.value !== vehicleId || fleetStore.currentPositionHistoryVehicleId !== vehicleId) {
      return
    }

    if (shouldAppend) {
      positionHistory.append(points)
    } else {
      positionHistory.replace(points)
    }

    syncTodayRouteRender()
  } catch (error) {
    if (requestId === todayRouteRequestId) {
      if (!shouldAppend) {
        clearTodayRoute(false)
        clearPositionHistoryData()
      }
      showRouteHistoryErrorToast(error)
    }
  }
}

function focusVehicle(vehicle: Vehicle) {
  if (!googleMap.value || !vehicle.hasPosition || !mapSettings.map.zoomOnSelect) {
    return
  }

  googleMap.value.panTo({ lat: vehicle.latitude, lng: vehicle.longitude })
}

function focusPositionHistory() {
  const routePath = positionHistory.path.value

  if (!googleMap.value || !window.google?.maps || !routePath.length) {
    return
  }

  if (routePath.length === 1) {
    googleMap.value.panTo(routePath[0])

    if ((googleMap.value.getZoom?.() ?? 0) > 16) {
      googleMap.value.setZoom(16)
    }
    return
  }

  const bounds = new window.google.maps.LatLngBounds()
  routePath.forEach((position) => bounds.extend(position))
  googleMap.value.fitBounds(bounds, 48)
}

function selectVehicle(vehicleId: string) {
  if (selectedVehicleId.value !== vehicleId) {
    clearTodayRoute()
    clearPositionHistoryData()
  }

  selectedVehicleId.value = vehicleId
  vehicleDetailsDrawerOpen.value = true
  const vehicle = fleetStore.vehicles.find((item) => item.id === vehicleId)

  if (vehicle) {
    focusVehicle(vehicle)
  }

  collapseVehiclePanelOnMobile()
}

function closeVehicleDrawer() {
  selectedVehicleId.value = null
  vehicleDetailsDrawerOpen.value = false
  clearTodayRoute()
  clearPositionHistoryData()
}

async function initializeGoogleMap() {
  if (!googleMapsApiKey || !mapElement.value) {
    return
  }

  try {
    mapState.value = 'loading'
    const google = await loadGoogleMaps(googleMapsApiKey)
    googleMap.value = markRaw(new google.maps.Map(mapElement.value, {
      center: { lat: 52.1, lng: 19.4 },
      zoom: 6,
      gestureHandling: 'greedy',
      mapTypeId: mapSettings.map.mapType,
      mapTypeControl: false,
      zoomControl: false,
      fullscreenControl: false,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
    }))
    placeMapClickListener = googleMap.value.addListener('click', (event: any) => {
      if (!isPlacePlacementMode.value || !event.latLng) {
        hidePinnedOverlays()
        return
      }

      openCreatePlaceAt(event.latLng.lat(), event.latLng.lng())
    })
    routeZoomListener = googleMap.value.addListener('zoom_changed', scheduleRouteMarkersForZoom)
    applyGoogleMapOptions()
    applyPlacePlacementCursor()

    mapState.value = 'ready'
    renderMarkers()
    renderPlaceOverlays()
    void renderTodayRoute()
  } catch {
    mapState.value = 'error'
  }
}

async function refreshLastPositions() {
  await fleetStore.fetchLastPositions({ silent: true })
  renderMarkers()

  if (fleetStore.currentPositionHistoryMode === 'today') {
    void renderTodayRoute({ append: true })
  }

  if (mapSettings.map.followVehicle && selectedVehicle.value) {
    focusVehicle(selectedVehicle.value)
  }
}

function startPositionRefresh() {
  if (positionRefreshTimer.value !== null) {
    window.clearInterval(positionRefreshTimer.value)
  }

  positionRefreshTimer.value = window.setInterval(() => {
    void refreshLastPositions()
  }, 30000)
}

watch(filteredVehicles, (vehicles) => {
  renderMarkers()

  if (selectedVehicleId.value && !vehicles.some((vehicle) => vehicle.id === selectedVehicleId.value)) {
    selectedVehicleId.value = null
    vehicleDetailsDrawerOpen.value = false
  }
})

watch(activeMode, (mode, previousMode) => {
  clearTodayRoute()
  positionHistory.clear()

  if (mode !== 'places' && isPlacePlacementMode.value) {
    isPlacePlacementMode.value = false
    applyPlacePlacementCursor()
  }

  if (mode === 'places') {
    selectedVehicleId.value = null
    vehicleDetailsDrawerOpen.value = false
  }

  renderPlaceOverlays()

  if (mode === 'history') {
    fleetStore.clearPositionHistory()
    vehicleDetailsDrawerOpen.value = false
    renderMarkers()
    return
  }

  if (previousMode === 'history') {
    selectedVehicleId.value = null
    vehicleDetailsDrawerOpen.value = false
    fleetStore.clearPositionHistory()
    renderMarkers()
    return
  }

  renderMarkers()
  void renderTodayRoute()
})

watch(selectedVehicleId, (vehicleId) => {
  renderMarkers()

  if (!vehicleId) {
    vehicleDetailsDrawerOpen.value = false
  }

  if (activeMode.value !== 'history') {
    void renderTodayRoute()
    return
  }

  if (fleetStore.currentPositionHistoryVehicleId && fleetStore.currentPositionHistoryVehicleId !== vehicleId) {
    clearTodayRoute()
    clearPositionHistoryData()
  }
})

watch(mapSettings, (value) => {
  localStorage.setItem(MAP_SETTINGS_KEY, JSON.stringify(value))
  applyGoogleMapOptions()
  renderMarkers()
}, { deep: true })

watch([places, () => mapSettings.map.showPlaces], () => {
  renderPlaceOverlays()
}, { deep: true })

watch(selectedFleetId, (fleetId) => {
  localStorage.setItem(selectedFleetStorageKey(), fleetId)

  if (fleetId !== 'all') {
    void fleetStore.fetchVehicleGroup(fleetId)
  }
}, { immediate: true })

watch(() => historyFilters.fleetId, (fleetId) => {
  if (fleetId !== 'all') {
    void fleetStore.fetchVehicleGroup(fleetId)
  }
})

watch(() => historyFilters.preset, (preset) => {
  if (preset) {
    applyHistoryPreset(preset)
  }
})

watch(() => mapSettings.map.followVehicle, (shouldFollow) => {
  if (!shouldFollow || !selectedVehicleId.value) {
    return
  }

  const vehicle = fleetStore.vehicles.find((item) => item.id === selectedVehicleId.value)

  if (vehicle) {
    focusVehicle(vehicle)
  }
})

watch(() => mapSettings.map.todayRoute, () => {
  if (activeMode.value !== 'history') {
    void renderTodayRoute()
  }
})

watch(() => mapSettings.map.historyMarkersByZoom, () => {
  if (positionHistory.path.value.length) {
    syncRoutePointMarkers()
  }
})

onMounted(() => {
  void initializeGoogleMap()
  void placeStore.loadPlaces({ silent: true }).catch(() => undefined)
  void repairStore.loadRepairs({ silent: true }).catch(() => undefined)
  startPositionRefresh()
})

onBeforeUnmount(() => {
  cancelAlertTooltipHide()

  if (positionRefreshTimer.value !== null) {
    window.clearInterval(positionRefreshTimer.value)
    positionRefreshTimer.value = null
  }

  clearMarkers()
  clearPlaceOverlays()
  clearTodayRoute()
  positionHistory.clear()
  routeZoomListener?.remove?.()
  routeZoomListener = null
  placeMapClickListener?.remove?.()
  placeMapClickListener = null
  disposeRouteInfoWindow()
  googleTrafficLayer.value?.setMap(null)
  window.google?.maps?.event?.clearInstanceListeners?.(googleTrafficLayer.value)
  googleTrafficLayer.value = null
  window.google?.maps?.event?.clearInstanceListeners?.(googleMap.value)
  googleMap.value = null
  fleetStore.clearPositionHistory()
})
</script>

<style>
.rw-list-scroll {
  scrollbar-width: none;
}

.rw-list-scroll::-webkit-scrollbar {
  display: none;
}

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

.rw-map-marker-button:hover .rw-map-marker-icon {
  filter: drop-shadow(0 6px 10px rgba(15, 23, 42, 0.18));
}

.rw-route-point-marker {
  position: absolute;
  z-index: 10;
  display: grid;
  height: 12px;
  width: 12px;
  place-items: center;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  background: #7093ff;
  color: #ffffff;
  cursor: pointer;
  padding: 0;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 1px 2px rgba(15, 23, 42, 0.55));
}

.rw-route-point-marker svg {
  height: 7px;
  width: 7px;
}

.rw-route-point-marker-start,
.rw-route-point-marker-end {
  z-index: 12;
  height: 26px;
  width: 26px;
  border-radius: 7px;
  transform: translate(-50%, -88%);
}

.rw-route-point-marker-start {
  background: #16a34a;
}

.rw-route-point-marker-end {
  background: #dc2626;
}

.rw-route-point-marker-start svg,
.rw-route-point-marker-end svg {
  height: 15px;
  width: 15px;
}

.rw-route-point-heading {
  transform: rotate(var(--rw-route-heading));
  transform-origin: center;
}

.rw-route-info-window {
  width: min(18rem, calc(100vw - 2rem));
  overflow: hidden;
  border: 1px solid rgb(var(--rw-app-border));
  border-radius: 3px;
  background: rgb(var(--rw-app-panel));
  color: rgb(var(--rw-app-muted));
  font-size: 11px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.24), 0 6px 12px rgba(0, 0, 0, 0.16), 0 9px 18px 8px rgba(0, 0, 0, 0.10);
}

.rw-route-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid rgb(var(--rw-app-border));
}

.rw-route-info-header strong,
.rw-route-info-row strong {
  color: rgb(var(--rw-app-text));
}

.rw-route-info-header strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-route-info-header-meta {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

.rw-route-info-header-meta > span {
  color: rgb(var(--rw-app-muted));
}

.rw-route-info-header-meta > span {
  white-space: nowrap;
}

.rw-route-info-body {
  display: grid;
  gap: 6px;
  padding: 8px 14px;
}

.rw-route-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rw-route-info-row strong {
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-route-info-value-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}

.rw-route-info-action {
  display: inline-flex;
  height: 20px;
  width: 20px;
  flex: 0 0 20px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgb(var(--rw-app-muted));
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.rw-route-info-action:hover {
  background: rgb(var(--rw-app-hover));
  color: rgb(var(--rw-app-text));
}

.rw-route-info-action-icon {
  height: 12px;
  width: 12px;
}

.gm-style .gm-style-iw-c:has(.rw-route-info-window) {
  overflow: visible;
  border-radius: 3px;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.gm-style .gm-style-iw-d:has(.rw-route-info-window) {
  overflow: visible !important;
}

.gm-style .gm-style-iw-t:has(.rw-route-info-window) .gm-style-iw-tc {
  display: none;
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
