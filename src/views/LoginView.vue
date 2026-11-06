<template>
  <div class="w-full max-w-md">
    <AppCard>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <AppInput
          v-model="form.login"
          label="Login"
          autocomplete="username"
          placeholder="operator@routewise.pl"
          required
        />
        <AppPasswordInput
          v-model="form.password"
          label="Hasło"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />

        <p v-if="formError" class="rounded-[var(--rw-radius-control)] border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-danger-400/40 dark:bg-danger-400/10 dark:text-danger-400">
          {{ formError }}
        </p>

        <AppButton type="submit" full-width size="lg" :loading="authStore.isLoading" :disabled="remaining > 0">
          {{ remaining > 0 ? `Spróbuj za ${remaining} s` : 'Zaloguj' }}
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPasswordInput from '@/components/ui/AppPasswordInput.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  login: '',
  password: '',
})

const formError = ref('')
const blockedUntil = ref(0)
const now = ref(Date.now())
const remaining = computed(() => Math.max(0, Math.ceil((blockedUntil.value - now.value) / 1000)))
const timer = window.setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => window.clearInterval(timer))

function getRedirectPath() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/map'
}

async function handleSubmit() {
  if (remaining.value > 0) return
  formError.value = ''

  try {
    await authStore.login({
      login: form.login,
      password: form.password,
    })
    await router.push(getRedirectPath())
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      const seconds = Number(error.response.headers['retry-after'] || error.response.data?.retryAfterSeconds || 60)
      blockedUntil.value = Date.now() + Math.max(1, seconds) * 1000
      formError.value = 'Zbyt wiele prób logowania. Poczekaj do zakończenia blokady.'
    } else {
      formError.value = 'Nie udało się zalogować. Sprawdź login i hasło.'
    }
  }
}
</script>
