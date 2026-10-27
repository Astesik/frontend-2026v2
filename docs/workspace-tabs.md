# Workspace Tabs

Desktop (od 768 px) korzysta z paska zakładek nad treścią. Na telefonie pozostaje
dotychczasowy RouterView i nawigacja przez sidebar. Mapa jest pierwszą, stałą
zakładką, jeżeli użytkownik ma dostęp do pozycji GPS.

## Architektura

- `src/workspace/registry.ts`: katalog widoków, nazwy, ikony i wymagane uprawnienia.
- `src/stores/workspaceTabsStore.ts`: otwarte zakładki, kolejność, przypięcia, MRU,
  bezpieczne ustawienia widoków, przewinięcie i informacja o niezapisanych zmianach.
- `src/components/workspace/WorkspaceTabs.vue`: pasek, przypinanie, zamykanie,
  poziome przeciąganie całej zakładki z animowanym podglądem kolejności i obsługa klawiatury.
  Przypięte zakładki mają stałą ikonę pinezki i podkreślenie. Przypinanie jest w menu pod prawym
  przyciskiem myszy (także Shift+F10). Strzałki zmieniają zakładkę, Ctrl+Shift+strzałka
  przesuwa ją w obrębie grupy przypiętych/nieprzypiętych. Delete lub środkowy przycisk
  myszy zamyka zakładkę poza Mapą, z potwierdzeniem niezapisanych zmian. Kursor pointer
  zmienia się na grabbing dopiero po rozpoczęciu gestu przesuwania.
- `src/composables/useHorizontalTabDrag.ts`: gest pointer, próg rozpoczęcia, podgląd
  wyłącznie w osi X, automatyczne przewijanie paska i zatwierdzenie kolejności po
  puszczeniu. Escape, pointercancel, utrata fokusu lub zmiana kontekstu anulują gest.
- `WorkspaceOutlet.vue`: KeepAlive z osobną nazwą komponentu i kluczem dla każdej
  zakładki. Usunięcie nazwy z include usuwa instancję z cache, a zmiana firmy lub
  użytkownika zmienia klucz całego cache. Limit wynosi 20 otwartych zakładek;
  aplikacja nie wyrzuca po cichu formularzy, aby zwolnić miejsce.
- `WorkspacePage.vue`: osobny kontekst useRoute, przewijanie oraz kontener portali.
  Nieaktywne portale są ukryte razem z widokiem. Dialogi pozostawiają dostęp do
  paska zakładek i menu. Mapy i formularze nie są inicjalizowane przy każdym powrocie.
  Wysokość widoków pochodzi od dostępnego miejsca pod paskiem, nie od 100dvh.
  Tabele i kolumny kanbanu przewijają się wewnętrznie; na telefonie pozostaje zwykły
  układ dokumentu bez paska zakładek.

Router pozostaje jedynym źródłem adresu URL. Sidebar i linki do szczegółów nadal
korzystają z RouterLink/router.push. Identyfikator zakładki to nazwa trasy, a dla
szczegółów `nazwa-trasy:id`; filtry i query nie tworzą duplikatów.

Po odświeżeniu sessionStorage przywraca wyłącznie przypięte zakładki i Mapę, ich kolejność
oraz jawnie zarejestrowane ustawienia. Nieprzypięte zakładki i ich zapamiętane ustawienia
nie są serializowane; stare zapisy również są filtrowane podczas odczytu. Odświeżenie
adresu nieprzypiętej zakładki przekierowuje do zapamiętanej przypiętej zakładki lub Mapy.
Bezpośrednie otwarcie linku do nowego widoku nadal działa. Nieaktywne przywrócone
zakładki są ładowane dopiero po otwarciu. Klucz storage jest osobny dla użytkownika
i firmy. Wylogowanie usuwa zapis bieżącej sesji. Dane API, hasła, obrazy i robocze
formularze nie są serializowane. Niezapisane formularze pozostają wyłącznie w żywych
instancjach i przepadają po odświeżeniu przeglądarki.

`useWorkspaceTitle()` aktualizuje etykietę zakładki na podstawie danych jej własnego
widoku: `Pojazd - REJESTRACJA`, `Urządzenie - NAZWA`, `Naprawa - REJESTRACJA`. ID pozostaje
kluczem zakładki, więc zmiana rejestracji nie tworzy nowej instancji widoku.

## Nowy Moduł

1. Dodaj normalną trasę do Vue Router i definicję o tej samej nazwie do registry.
   Podaj path, title, icon i uprawnienia. Dla szczegółów użyj parametru `:id`.
2. Linkuj normalnie przez RouterLink/router.push. Layout otwiera zakładkę bez
   dodatkowego mechanizmu routingu.
3. Lokalne ref/reactive są zachowywane automatycznie. Dla bezpiecznych filtrów po
   odświeżeniu zarejestruj `useWorkspaceViewState({ searchQuery, currentPage, ... })`.
   Nie rejestruj danych formularzy, tokenów ani danych API.
4. Zarejestruj stan edycji przez `useWorkspaceDirty(computed(() => editMode.value))`.
   Samo przełączanie nie pokazuje potwierdzenia. Zamknięcie brudnej zakładki tak.
5. Odpytujące komponenty powinny wstrzymywać timery w onDeactivated i uruchamiać je
   w onActivated, bez ponownego resetowania danych. `useWorkspaceActive()` pozwala
   blokować też pracę watcherów i obsługę globalnych zdarzeń w tle.
6. Własny Teleport kieruj do `useWorkspacePortal()`. Standardowe modale, drawery,
   dropdowny i wybór źródła zdjęcia są już zintegrowane. Globalne toasty pozostają
   globalne. Pozycjonowanie dropdownów nadal używa współrzędnych viewportu.
7. Szczegóły rekordów odczytuj z kolekcji indeksowanej ID. Wspólne pole currentRecord
   nie może być źródłem danych wielu niezależnych zakładek.

## Zintegrowane Pliki

Poza nowymi plikami powyżej zmiany obejmują:

- `src/layouts/AppLayout.vue`, `src/router/index.ts`, `src/stores/authStore.ts`,
  `src/components/layout/AppSidebar.vue`.
- `src/components/ui/AppModal.vue`, `AppDrawer.vue`, `AppDropdown.vue`,
  `PhotoSourceMenu.vue`: izolacja portali i zdarzeń.
- `src/components/vehicles/VehiclePhotoGallery.vue`,
  `src/components/settings/CompanyManagementPanel.vue`, `MailSettingsPanel.vue`,
  `CountryNotificationsPanel.vue`, `src/components/fuel-stations/FuelStationFormModal.vue`,
  `src/components/repairs/RepairCreateModal.vue`,
  `src/components/places/PlaceDetailsModal.vue`: portale, formularze i timery.
- `src/stores/deviceStore.ts`: szczegóły urządzeń indeksowane ID.
- `src/views/DriversView.vue`, `VehiclesView.vue`, `DevicesView.vue`, `RepairsView.vue`,
  `SettingsView.vue`, `FuelStationsView.vue`: zachowanie bezpiecznych filtrów i stanów edycji.
- `src/views/VehicleDetailView.vue`, `DeviceDetailView.vue`, `RepairDetailView.vue`:
  niezależne szczegóły i ostrzeganie przy zamknięciu edycji.
- `src/views/MapView.vue`, `DashboardView.vue`, `TripsView.vue`, `RefuelingView.vue`,
  `RouteCalculatorView.vue`: cykl życia widoków i odświeżanie map.
- `scripts/test-workspace-tabs.mjs`, `scripts/test-vehicle-photo-picker.mjs`,
  `package.json`: testy i komenda `npm run test:workspace-tabs`.

Test workspace korzysta z prawdziwych Vue Router, Pinia, KeepAlive i komponentów
workspace, uruchomionych przez renderer testowy Vue. Sprawdza niezależność instancji,
tras rekordów, formularzy, zaznaczeń, filtrów i paginacji; ukrywanie portali,
usuwanie cache, historię Wstecz/Dalej, uprawnienia i izolację sesji.
