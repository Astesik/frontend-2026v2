# Serwis pojazdu i odczyty naczepy

Widok pojazdu zawiera zakladki Informacje, Serwis oraz Dokumenty i zdjecia.
Historia napraw, dodawanie usterki, edycja pojazdu, przypisanie urzadzenia i galeria
korzystaja z istniejacych serwisow API oraz ich uprawnien.

## Mockup

`vehicleMaintenanceStore` przechowuje odczyty i wybrane kolo osobno dla kazdego
pojazdu. Dane kol, przebieg i interwaly sa demonstracyjne, nie sa zaleceniami
producenta. Schemat wyswietla sie tylko dla typu TRAILER. Dokumenty pozostaja mockupem.
Stan czyszczony jest przy wylogowaniu i zmianie firmy razem z innymi danymi API.

Kwadrat i panel pokazuja identyczny stan okladziny `liningRemainingPct`
(pozostaly procent), bez przeliczania na zuzycie. Progi demo: <=15% alarm, <=30% ostrzezenie,
powyzej 30% OK. Brak danych ma stan neutralny, nie jest traktowany jako OK.

## Podlaczenie API

Nie dodano nieistniejacego endpointu. Po ustaleniu kontraktu backendu nalezy
zmapowac odpowiedz na `TrailerWheelReading[]` i uzyc:

```ts
await maintenanceStore.loadWheelReadings(vehicleId, async id => {
  const data = await confirmedWheelService.getReadings(id)
  return mapReadings(data)
})
```

Mozna tez przekazac snapshot bezposrednio przez
`maintenanceStore.setWheelReadings(vehicleId, readings)` (domyslne zrodlo: API).
Komponent `TrailerAxleDiagram` otrzymuje dane przez props i emituje `select-wheel`.
Zmiana danych aktualizuje SVG i panel bez utraty wyboru kola. Brakujace pozycje
uzupelniane sa wartosciami null; nieprawidlowe zakresy sa odrzucane. Loader
chroni przed spoznionymi odpowiedziami oraz odpowiedziami ze starej sesji.

Testy: `npm run test:vehicle-maintenance`.

## Podglad lokalizacji

`VehicleLocationPreview` korzysta ze wspolnego `fleetStore.lastPositions` i
`GET /api/positions/last`. Odpytywanie co 10 sekund jest aktywne tylko dla
widocznej zakladki i uprawnienia positions.read (lub administratora firmy).
Jednoczesne odczyty pozycji wspoldziela store; reset sesji odrzuca stare odpowiedzi.
Mapa uzywa istniejacego VITE_GOOGLE_MAPS_API_KEY oraz jasnego stylu glownej mapy,
jest nieruchoma, bez kontrolek i zawsze centruje pojedynczy marker z rejestracja.
SVG i style markerow sa wspolne z MapView (fleetMarker.ts i fleet-markers.css).
Brak lub nieprawidlowa pozycja nie jest
zastepowana domyslnymi wspolrzednymi pojazdu.
