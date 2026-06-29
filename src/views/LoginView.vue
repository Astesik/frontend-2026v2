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
        <AppInput
          v-model="form.password"
          label="Haslo"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />

        <p v-if="formError" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-app-border dark:bg-app-elevated dark:text-slate-300">
          {{ formError }}
        </p>

        <AppButton type="submit" full-width size="lg" :loading="authStore.isLoading">
          Zaloguj
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  login: '',
  password: '',
})

const formError = ref('')

function getRedirectPath() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
}

async function handleSubmit() {
  formError.value = ''

  try {
    await authStore.login({
      login: form.login,
      password: form.password,
    })
    await router.push(getRedirectPath())
  } catch {
    formError.value = 'Nie udalo sie zalogowac. Sprawdz login i haslo.'
  }
}
</script>
