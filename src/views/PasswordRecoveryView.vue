<template>
  <div class="w-full max-w-md">
    <AppCard :title="confirming ? 'Ustaw nowe hasło' : 'Odzyskaj dostęp'">
      <form v-if="!done" class="space-y-5" @submit.prevent="submit">
        <template v-if="confirming">
          <AppPasswordInput v-model="password" label="Nowe hasło" autocomplete="new-password" required />
          <AppPasswordInput v-model="repeat" label="Powtórz nowe hasło" autocomplete="new-password" required />
          <p class="text-sm text-ui-mutedText">{{ newPasswordHint }}</p>
        </template>
        <template v-else>
          <AppInput v-model="email" type="email" label="Email przypisany do konta" autocomplete="email" :maxlength="255" required />
          <p class="text-sm text-ui-mutedText">Jeżeli konto istnieje, otrzymasz link ważny przez 30 minut.</p>
        </template>
        <p v-if="error" role="alert" class="text-sm text-danger-600">{{ error }}</p>
        <AppButton type="submit" full-width :loading="busy">{{ confirming ? 'Zapisz nowe hasło' : 'Wyślij link' }}</AppButton>
      </form>
      <p v-else role="status" class="text-sm">{{ confirming ? 'Hasło zostało zmienione. Zaloguj się ponownie na każdym urządzeniu.' : 'Jeżeli konto istnieje, otrzymasz wiadomość z linkiem do zmiany hasła. Sprawdź również folder spam.' }}</p>
      <RouterLink to="/login" class="mt-5 block text-sm underline">Wróć do logowania</RouterLink>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { api, invalidateAuthRequests, setAuthToken } from '@/services/api'
import { newPasswordError, newPasswordHint } from '@/utils/passwordRules'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPasswordInput from '@/components/ui/AppPasswordInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const route = useRoute()
const confirming = route.name === 'reset-password'
// The secret is in the fragment: browsers do not send it in HTTP requests or referrers.
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
if (confirming) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
const email = ref(''), password = ref(''), repeat = ref(''), error = ref('')
const busy = ref(false), done = ref(false)
async function submit() {
  error.value = confirming ? newPasswordError(password.value) : ''
  if (error.value) return
  if (confirming && password.value !== repeat.value) {
    error.value = 'Nowe hasła nie są takie same.'
    return
  }
  if (confirming && !token) { error.value = 'Brakuje tokenu. Otwórz ponownie link z wiadomości lub poproś o nowy.'; return }
  busy.value = true
  try {
    await api.post(confirming ? '/api/password-reset/confirm' : '/api/password-reset', confirming ? { token, newPassword: password.value } : { email: email.value }, { skipErrorToast: true })
    done.value = true
    if (confirming) { invalidateAuthRequests(); setAuthToken(null); password.value = ''; repeat.value = '' }
  } catch (e) {
    const response = axios.isAxiosError(e) ? e.response : undefined
    if (response?.status === 429) {
      error.value = `Zbyt wiele prób. Spróbuj za ${response.headers['retry-after'] || 60} sekund.`
    } else if (response?.status === 503) {
      error.value = 'Odzyskiwanie hasła jest chwilowo niedostępne. Spróbuj później lub skontaktuj się z administratorem.'
      if (typeof response.data?.errorId === 'string') error.value += ` Identyfikator błędu: ${response.data.errorId}`
    } else if (confirming && response?.status === 400) {
      error.value = 'Link jest nieprawidłowy, wykorzystany lub wygasł. Poproś o nowy link.'
    } else {
      error.value = 'Nie udało się wysłać żądania. Spróbuj ponownie później.'
    }
  } finally { busy.value = false }
}
</script>
