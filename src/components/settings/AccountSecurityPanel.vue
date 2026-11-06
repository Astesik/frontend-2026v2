<template>
  <div class="min-w-0 space-y-3">
    <div class="grid min-w-0 items-stretch gap-3 xl:grid-cols-2">
      <AppCard title="Dane użytkownika" :icon="UserRound" compact content-class="!p-0">
        <div class="flex items-center gap-4 border-b border-ui-divider p-4">
          <div class="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted" role="img" :aria-label="`Miejsce na zdjęcie użytkownika: ${displayName}`">
            <span class="text-2xl font-semibold text-ui-mutedText">{{ initials }}</span>
            <span class="absolute -bottom-1 -right-1 rounded-md border border-ui-border bg-ui-surface p-1.5"><Camera class="h-3.5 w-3.5 text-ui-icon" /></span>
          </div>
          <div class="min-w-0">
            <p class="break-words text-base font-semibold text-ui-text">{{ displayName }}</p>
            <p class="mt-1 break-all text-sm text-ui-mutedText">{{ auth.user?.email || 'Brak adresu email' }}</p>
          </div>
        </div>
        <dl class="divide-y divide-ui-divider text-sm">
          <div class="flex items-center justify-between gap-4 px-4 py-3"><dt class="text-ui-mutedText">Nazwa użytkownika</dt><dd class="min-w-0 break-words text-right font-medium text-ui-text">{{ auth.user?.username || auth.user?.login || '—' }}</dd></div>
          <div class="flex items-center justify-between gap-4 px-4 py-3"><dt class="text-ui-mutedText">Email</dt><dd class="min-w-0 break-all text-right font-medium text-ui-text">{{ auth.user?.email || '—' }}</dd></div>
        </dl>
      </AppCard>

      <AppCard title="Zmień hasło" :icon="KeyRound" compact>
        <form class="space-y-3" :aria-busy="passwordBusy" @submit.prevent="changePassword">
          <AppPasswordInput v-model="currentPassword" label="Obecne hasło" autocomplete="current-password" size="sm" :disabled="passwordBusy" required />
          <div class="grid gap-3 sm:grid-cols-2">
            <AppPasswordInput v-model="password" label="Nowe hasło" autocomplete="new-password" size="sm" :disabled="passwordBusy" required />
            <AppPasswordInput v-model="repeat" label="Powtórz nowe hasło" autocomplete="new-password" size="sm" :disabled="passwordBusy" required />
          </div>
          <p class="ui-caption">{{ newPasswordHint }}</p>
          <p v-if="passwordError" role="alert" class="rounded-[var(--rw-radius-control)] border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600 dark:text-danger-400">{{ passwordError }}</p>
          <div class="flex justify-end"><AppButton type="submit" size="sm" :loading="passwordBusy">Zmień hasło</AppButton></div>
        </form>
      </AppCard>
    </div>

    <AppCard title="Urządzenia i sesje" :icon="MonitorSmartphone" compact content-class="!p-0">
      <template v-if="isGlobalAdmin" #actions>
        <label class="flex items-center gap-2 text-xs text-ui-mutedText"><AppCheckbox v-model="all" :disabled="sessionsBusy || eventsBusy || Boolean(revokingId)" />Wszyscy użytkownicy</label>
      </template>
      <p v-if="sessionsError" role="alert" class="px-4 py-3 text-sm text-danger-600 dark:text-danger-400">{{ sessionsError }}</p>
      <div class="overflow-x-auto" :aria-busy="sessionsBusy">
        <table class="ui-table min-w-[850px]" aria-label="Aktywne sesje">
          <thead class="ui-table-head"><tr><th>Użytkownik</th><th>IP</th><th>Urządzenie</th><th>Ostatnia aktywność</th><th>Wygasa</th><th class="w-28 text-right">Akcje</th></tr></thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.id" class="ui-table-row">
              <td class="font-medium text-ui-text">{{ session.username }}<AppBadge v-if="session.current" class="ml-2" variant="info">Ta sesja</AppBadge></td>
              <td><IpLocationCell :ip="session.last_ip_address || session.ip_address" :location="session.ip_location" /></td>
              <td :title="session.user_agent">{{ session.device || '—' }}</td>
              <td class="whitespace-nowrap tabular-nums">{{ date(session.last_seen_at) }}</td>
              <td class="whitespace-nowrap tabular-nums">{{ date(session.expires_at) }}</td>
              <td class="text-right"><AppButton size="sm" variant="danger" :loading="revokingId === session.id" :disabled="sessionsBusy || Boolean(revokingId) || passwordBusy" @click="revoke(session)"><LogOut class="h-3.5 w-3.5" />Wyloguj</AppButton></td>
            </tr>
            <tr v-if="!sessions.length"><td colspan="6" class="py-8 text-center text-ui-mutedText">{{ sessionsBusy ? 'Pobieranie sesji…' : sessionsError ? 'Sesje są niedostępne.' : 'Brak aktywnych sesji.' }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-ui-divider px-4 py-3">
        <span class="ui-caption">Strona {{ sessionPage + 1 }}</span>
        <div class="flex gap-2"><AppButton size="sm" variant="secondary" :disabled="sessionPage === 0 || sessionsBusy || Boolean(revokingId)" @click="changeSessionPage(-1)">Poprzednia</AppButton><AppButton size="sm" variant="secondary" :disabled="sessions.length < pageSize || sessionsBusy || Boolean(revokingId)" @click="changeSessionPage(1)">Następna</AppButton></div>
      </div>
    </AppCard>

    <AppCard title="Historia logowania" :icon="History" compact content-class="!p-0">
      <p v-if="eventsError" role="alert" class="px-4 py-3 text-sm text-danger-600 dark:text-danger-400">{{ eventsError }}</p>
      <div class="overflow-x-auto" :aria-busy="eventsBusy">
        <table class="ui-table min-w-[760px]" aria-label="Historia logowania">
          <thead class="ui-table-head"><tr><th>Użytkownik</th><th>IP</th><th>Urządzenie</th><th>Czas</th><th>Wynik</th></tr></thead>
          <tbody>
            <tr v-for="event in events" :key="event.id" class="ui-table-row">
              <td class="font-medium text-ui-text">{{ event.username || 'Nieustalone konto' }}</td>
              <td><IpLocationCell :ip="event.ip_address" :location="event.ip_location" /></td>
              <td :title="event.user_agent">{{ event.device || '—' }}</td>
              <td class="whitespace-nowrap tabular-nums">{{ date(event.occurred_at) }}</td>
              <td><AppBadge :variant="eventVariant(event.event)">{{ eventNames[event.event] || event.event }}</AppBadge></td>
            </tr>
            <tr v-if="!events.length"><td colspan="5" class="py-8 text-center text-ui-mutedText">{{ eventsBusy ? 'Pobieranie historii…' : eventsError ? 'Historia jest niedostępna.' : 'Brak zdarzeń.' }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-ui-divider px-4 py-3">
        <span class="ui-caption">Strona {{ eventPage + 1 }}</span>
        <div class="flex gap-2"><AppButton size="sm" variant="secondary" :disabled="eventPage === 0 || eventsBusy" @click="changeEventPage(-1)">Poprzednia</AppButton><AppButton size="sm" variant="secondary" :disabled="events.length < pageSize || eventsBusy" @click="changeEventPage(1)">Następna</AppButton></div>
      </div>
    </AppCard>
    <p class="px-1 text-xs text-ui-mutedText">Przybliżona lokalizacja IP · <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="underline underline-offset-2 hover:text-ui-text">IP Geolocation by DB-IP</a></p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { Camera, History, KeyRound, LogOut, MonitorSmartphone, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceDirty } from '@/composables/useWorkspace'
import { newPasswordError, newPasswordHint } from '@/utils/passwordRules'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppPasswordInput from '@/components/ui/AppPasswordInput.vue'
import IpLocationCell from '@/components/settings/IpLocationCell.vue'
import type { IpLocation } from '@/types/auth'

type Session = { id: string; username: string; device: string; user_agent: string; ip_address: string; last_ip_address: string; last_seen_at: string; expires_at: string; current: boolean; ip_location?: IpLocation | null }
type Event = { id: number; occurred_at: string; username: string | null; event: string; ip_address: string | null; device: string; user_agent: string; ip_location?: IpLocation | null }
const auth = useAuthStore(), router = useRouter()
const sessions = ref<Session[]>([]), events = ref<Event[]>([])
const all = ref(false), sessionsBusy = ref(false), eventsBusy = ref(false), passwordBusy = ref(false)
const sessionsError = ref(''), eventsError = ref(''), passwordError = ref(''), revokingId = ref<string | null>(null)
const sessionPage = ref(0), eventPage = ref(0), pageSize = 50
const currentPassword = ref(''), password = ref(''), repeat = ref('')
let sessionRequest = 0, eventRequest = 0, disposed = false
const isGlobalAdmin = computed(() => auth.user?.sysAdmin === true || auth.user?.globalRoles?.includes('GLOBAL_ADMIN'))
const displayName = computed(() => [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim() || auth.user?.name || auth.user?.username || auth.user?.login || 'Użytkownik')
const initials = computed(() => displayName.value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())
const eventNames: Record<string, string> = { LOGIN_SUCCESS: 'Udane logowanie', LOGIN_FAILED: 'Nieprawidłowe dane', LOGIN_BLOCKED: 'Próba zablokowana', LOGIN_REJECTED: 'Logowanie odrzucone', SESSION_REVOKED: 'Sesja wylogowana', PASSWORD_RESET_REQUESTED: 'Wysłano link resetujący', PASSWORD_RESET_COMPLETED: 'Hasło zmienione' }
function eventVariant(event: string) { return event === 'LOGIN_SUCCESS' || event === 'PASSWORD_RESET_COMPLETED' ? 'success' : ['LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGIN_REJECTED'].includes(event) ? 'error' : 'neutral' }
function date(value: string) { return value ? new Date(value).toLocaleString('pl-PL') : '—' }
function context() { return `${auth.user?.userId ?? auth.user?.id}:${auth.activeCompanyId}:${all.value}` }
async function loadSessions() {
  const scope = context(), request = ++sessionRequest
  sessionsBusy.value = true; sessionsError.value = ''; sessions.value = []
  try {
    const result = await api.get<Session[]>('/api/auth/sessions', { params: { all: all.value, limit: pageSize, offset: sessionPage.value * pageSize }, skipErrorToast: true })
    if (!disposed && scope === context() && request === sessionRequest) sessions.value = result.data
  } catch {
    if (!disposed && scope === context() && request === sessionRequest) sessionsError.value = 'Nie udało się pobrać sesji.'
  } finally { if (!disposed && request === sessionRequest) sessionsBusy.value = false }
}
async function loadEvents() {
  const scope = context(), request = ++eventRequest
  eventsBusy.value = true; eventsError.value = ''; events.value = []
  try {
    const result = await api.get<Event[]>('/api/auth/login-events', { params: { all: all.value, limit: pageSize, offset: eventPage.value * pageSize }, skipErrorToast: true })
    if (!disposed && scope === context() && request === eventRequest) events.value = result.data
  } catch {
    if (!disposed && scope === context() && request === eventRequest) eventsError.value = 'Nie udało się pobrać historii logowania.'
  } finally { if (!disposed && request === eventRequest) eventsBusy.value = false }
}
async function reload() {
  sessionPage.value = 0; eventPage.value = 0
  await Promise.all([loadSessions(), loadEvents()])
}
function changeSessionPage(delta: number) { sessionPage.value += delta; void loadSessions() }
function changeEventPage(delta: number) { eventPage.value += delta; void loadEvents() }
async function revoke(session: Session) {
  if (revokingId.value || !window.confirm(`Wylogować sesję: ${session.username} — ${session.device}?`)) return
  const scope = context()
  revokingId.value = session.id; sessionsError.value = ''
  try {
    await api.delete(`/api/auth/sessions/${session.id}`, { params: { all: all.value }, skipErrorToast: true })
    if (disposed || scope !== context()) return
    if (session.current) { await auth.logout(); await router.push('/login') } else await reload()
  } catch {
    if (!disposed && scope === context()) sessionsError.value = 'Nie udało się wylogować sesji. Spróbuj ponownie.'
  } finally { revokingId.value = null }
}
async function changePassword() {
  if (passwordBusy.value) return
  passwordError.value = newPasswordError(password.value)
  if (passwordError.value) return
  if (password.value !== repeat.value) { passwordError.value = 'Nowe hasła nie są takie same.'; return }
  const scope = context()
  passwordBusy.value = true
  try {
    await api.post('/api/users/me/password', { currentPassword: currentPassword.value, newPassword: password.value }, { skipErrorToast: true })
    if (disposed || scope !== context()) return
    currentPassword.value = ''; password.value = ''; repeat.value = ''
    await auth.logout(); await router.push('/login')
  } catch (error) {
    if (!disposed && scope === context()) {
      const data = isAxiosError(error) ? error.response?.data : null
      passwordError.value = typeof data?.message === 'string' ? data.message : typeof data?.detail === 'string' ? data.detail : 'Nie udało się zmienić hasła. Sprawdź obecne hasło i spróbuj ponownie.'
    }
  } finally { passwordBusy.value = false }
}
watch([currentPassword, password, repeat], () => { passwordError.value = '' })
watch(all, () => { void reload() })
watch(() => [auth.user?.userId ?? auth.user?.id, auth.activeCompanyId], () => {
  currentPassword.value = ''; password.value = ''; repeat.value = ''; passwordError.value = ''
  if (all.value) all.value = false
  else void reload()
})
onMounted(reload)
onBeforeUnmount(() => { disposed = true; sessionRequest++; eventRequest++ })
useWorkspaceDirty(computed(() => Boolean(currentPassword.value || password.value || repeat.value)))
</script>
