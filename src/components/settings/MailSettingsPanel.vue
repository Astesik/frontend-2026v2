<template>
  <AppCard title="Email / SMTP" compact class="max-w-4xl">
    <div v-if="isLoadingMail" class="py-8 ui-body-sm text-ui-mutedText">Pobieranie konfiguracji...</div>

    <div v-else class="space-y-4">
      <form
        class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted p-4"
        @submit.prevent="saveSettings"
      >
        <div class="mb-4 flex flex-col gap-3 border-b border-ui-divider pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="ui-card-title">Konfiguracja poczty</h3>
          </div>
          <AppSwitch v-model="form.enabled" label="Wysyłanie włączone" />
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <AppInput v-model="form.host" label="Host SMTP" placeholder="smtp.example.com" size="sm" />
          <AppInput v-model="form.port" label="Port" type="number" placeholder="587" size="sm" />
          <AppInput v-model="form.username" label="Nazwa użytkownika" placeholder="alerts@example.com" size="sm" />
          <AppInput v-model="form.fromEmail" label="Adres nadawcy" type="email" placeholder="alerts@example.com" size="sm" />
          <div class="md:col-span-2">
            <AppInput
              v-model="form.password"
              label="Hasło SMTP"
              type="password"
              size="sm"
              :placeholder="mailSettings?.passwordConfigured ? 'Pozostaw puste, aby zachować obecne hasło' : 'Hasło SMTP'"
            />
            <div v-if="mailSettings?.passwordConfigured" class="mt-2">
              <AppBadge variant="success">Hasło jest zapisane</AppBadge>
            </div>
          </div>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <AppSwitch v-model="form.authEnabled" label="Uwierzytelnianie SMTP" />
          <AppSwitch v-model="form.starttlsEnabled" label="STARTTLS" />
        </div>

        <div class="mt-4 flex justify-end">
          <AppButton type="submit" :loading="isMutating">Zapisz konfigurację</AppButton>
        </div>
      </form>

      <section class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-surface p-4 shadow-soft">
        <div class="mb-3">
          <h3 class="ui-card-title">Wiadomość testowa</h3>
        </div>
        <EmailChipInput v-model="testRecipients" label="Odbiorcy" />
        <div class="mt-3 flex justify-end">
          <AppButton variant="secondary" :loading="isMutating" :disabled="!mailSettings?.enabled || !testRecipients.length" @click="sendTest">
            <Send class="h-4 w-4" />
            Wyślij test
          </AppButton>
        </div>
      </section>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Send } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import EmailChipInput from '@/components/ui/EmailChipInput.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUiStore } from '@/stores/uiStore'

const notificationStore = useNotificationStore()
const uiStore = useUiStore()
const { mailSettings, isLoadingMail, isMutating } = storeToRefs(notificationStore)
const testRecipients = ref<string[]>([])
const form = reactive({
  enabled: false,
  host: '',
  port: '587',
  username: '',
  password: '',
  fromEmail: '',
  authEnabled: true,
  starttlsEnabled: true,
})

function fillForm() {
  const settings = mailSettings.value
  Object.assign(form, {
    enabled: settings?.enabled ?? false,
    host: settings?.host || '',
    port: String(settings?.port || 587),
    username: settings?.username || '',
    password: '',
    fromEmail: settings?.fromEmail || '',
    authEnabled: settings?.authEnabled ?? true,
    starttlsEnabled: settings?.starttlsEnabled ?? true,
  })
}

async function saveSettings() {
  const port = Number(form.port)
  if (!Number.isInteger(port) || port <= 0 || (form.enabled && (!form.host.trim() || !form.fromEmail.trim()))) {
    uiStore.addToast({ type: 'warning', title: 'Niepełna konfiguracja', message: 'Dla aktywnego SMTP podaj host, poprawny port i adres nadawcy.' })
    return
  }

  try {
    await notificationStore.saveMailSettings({
      enabled: form.enabled,
      host: form.host.trim(),
      port,
      username: form.username.trim(),
      ...(form.password ? { password: form.password } : {}),
      fromEmail: form.fromEmail.trim(),
      authEnabled: form.authEnabled,
      starttlsEnabled: form.starttlsEnabled,
    })
    fillForm()
    uiStore.addToast({ type: 'success', title: 'SMTP zapisane', message: 'Konfiguracja poczty została zaktualizowana.' })
  } catch {
    // Global API interceptor displays the error.
  }
}

async function sendTest() {
  try {
    await notificationStore.testMailSettings(testRecipients.value)
    uiStore.addToast({ type: 'success', title: 'Test wysłany', message: 'Wiadomość testowa została przekazana do wysyłki.' })
  } catch {
    // Global API interceptor displays the error.
  }
}

onMounted(async () => {
  await notificationStore.loadMailSettings({ silent: true }).catch(() => undefined)
  fillForm()
})
</script>
