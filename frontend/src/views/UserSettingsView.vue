<script setup lang="ts">
import { ref, watch } from 'vue'
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue'
import AppModal from '@/components/global/AppModal.vue'
import AppButton from '@/components/global/AppButton.vue'
import SettingsSection from '@/components/global/SettingsSection.vue'
import SettingsRow from '@/components/global/SettingsRow.vue'
import FeedAvatar from '@/components/feeds/FeedAvatar.vue'
import { useUserdataStore } from '@/stores/userdata'
import { useSnackbarStore } from '@/stores/snackbar'
import TextInputIcon from '@/components/global/TextInputField.vue'
import { Mail, User, KeyRound, Trash2 } from 'lucide-vue-next'

const store = useUserdataStore()
const snackbar = useSnackbarStore()

const password = ref('')
const oldPassword = ref('')
const deletionPassword = ref('')
const showDeleteAccountModal = ref(false)

store.fetchUserData()

// Feedback comes from the store; show it as a snackbar instead of a banner that pushes the form down.
watch(
  () => store.success,
  (message) => {
    if (!message) return
    snackbar.show(message)
    store.success = '' // reset so an identical message triggers again
    password.value = ''
    oldPassword.value = ''
  }
)
watch(
  () => store.error,
  (message) => {
    if (!message) return
    snackbar.show(message)
    store.error = ''
  }
)
</script>

<template>
  <div class="overflow-y-scroll h-full">
    <AppModal :show="showDeleteAccountModal" title="Delete account?" @close="showDeleteAccountModal = false">
      <p class="text-sm text-background-300 mb-4">
        This permanently deletes your account and all your data. Enter your password to confirm.
      </p>
      <form class="flex flex-col gap-3" @submit.prevent="store.deleteUser(deletionPassword)">
        <TextInputIcon
          v-model="deletionPassword"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          :icon="KeyRound"
          :required="true"
        />
        <AppButton type="submit" variant="danger">Delete account</AppButton>
      </form>
    </AppModal>

    <div class="px-5 pb-10">
      <TitleNavigationBar title="Account" backNavigationPath="/settings" />

      <div class="flex flex-col gap-8">
        <div v-if="store.userdata.name" class="flex flex-col items-center gap-3 pt-1 pb-2">
          <FeedAvatar :title="store.userdata.name" :size="80" rounded="rounded-full" />
          <div class="text-center">
            <div class="text-xl font-title">{{ store.userdata.name }}</div>
            <div v-if="store.userdata.createdAt" class="text-xs font-text-detail text-background-400 mt-1">
              Member since {{ store.userdata.createdAt.toLocaleDateString() }}
            </div>
          </div>
        </div>

        <SettingsSection title="Profile">
          <form class="p-4 flex flex-col gap-3" @submit.prevent="store.updateUserDetails">
            <TextInputIcon v-model="store.userdata.name" placeholder="Name" autocomplete="name" :icon="User" :required="true" />
            <TextInputIcon
              v-model="store.userdata.email"
              type="email"
              placeholder="Email"
              autocomplete="email"
              :icon="Mail"
              :required="true"
            />
            <AppButton type="submit">Save changes</AppButton>
          </form>
        </SettingsSection>

        <SettingsSection title="Password" footer="Use at least 8 characters.">
          <form class="p-4 flex flex-col gap-3" @submit.prevent="store.updateUserPassword(password, oldPassword)">
            <TextInputIcon
              v-model="oldPassword"
              type="password"
              placeholder="Current password"
              autocomplete="current-password"
              :icon="KeyRound"
              :required="true"
            />
            <TextInputIcon
              v-model="password"
              type="password"
              placeholder="New password"
              autocomplete="new-password"
              :icon="KeyRound"
              :required="true"
            />
            <AppButton type="submit" :disabled="password.length < 8 || oldPassword.length < 8">
              Update password
            </AppButton>
          </form>
        </SettingsSection>

        <SettingsSection footer="Deleting your account removes all feeds, lists and statistics. This cannot be undone.">
          <SettingsRow button danger title="Delete account" :icon="Trash2" @click="showDeleteAccountModal = true" />
        </SettingsSection>
      </div>
    </div>
  </div>
</template>
