<script setup lang="ts">
import { ref } from 'vue'
import TitleNavigationBar from '@/components/TitleNavigationBar.vue'
import router from '@/router'
import { useUserdataStore } from '@/stores/userdata'
import { useAuthStore } from '@/stores/auth'
import TextInputIcon from '@/components/TextInputIcon.vue'
import { User } from 'lucide-vue-next'
import { KeyRound, X } from 'lucide-vue-next'

import { Mail } from 'lucide-vue-next'

const store = useUserdataStore()
const authStore = useAuthStore()

const password = ref('')
const oldPassword = ref('')
const deletionPassword = ref('')

const showDeleteAccountModal = ref(false)

store.fetchUserData()

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="overflow-y-scroll h-full">
    <div v-if="showDeleteAccountModal"
      class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-40 bg-black flex justify-center items-center">
      <div class="w-[90%] max-w-lg bg-background-950 rounded-xl p-5 relative">
        <X class="absolute top-5 right-5 cursor-pointer" size="32" @click="showDeleteAccountModal = false" />
        <div class="text-xl">Delete Account?</div>
        <div class="text-background-600 mb-5">Please enter your password to confirm.</div>
        <form @submit.prevent="store.deleteUser(deletionPassword)" class="flex flex-col gap-3">
          <TextInputIcon type="password" v-model="deletionPassword" placeholder="Password" :icon="KeyRound"
            :required="true" />
          <button type="submit" class="w-full h-14 bg-red-500 rounded-lg hover:bg-red-600 transition">
            Delete Account
          </button>
        </form>
      </div>
    </div>
    <div class="px-5 pb-10 z-10">
      <TitleNavigationBar title="Account" backNavigationPath="/settings" />

      <Transition name="fade">
        <div v-if="store.error || store.success">
          <div v-if="store.error" class="w-full bg-red-500 rounded-lg p-3 z-10 mb-5">{{ store.error }}</div>
          <div v-if="store.success" class="w-full bg-green-500 rounded-lg p-3 z-10 mb-5">
            {{ store.success }}
          </div>
        </div>
      </Transition>

      <h2 class="mb-5 mt-5 text-xl">Update Data</h2>
      <form @submit.prevent="store.updateUserDetails" class="flex flex-col gap-3">
        <TextInputIcon v-model="store.userdata.name" placeholder="Name" :icon="User" :required="true" />
        <TextInputIcon v-model="store.userdata.email" placeholder="Email" :icon="Mail" :required="true" />
        <button type="submit" class="w-full h-14 bg-amber-600 rounded-lg hover:bg-amber-700 transition">
          Update Details
        </button>
      </form>
      <h2 class="mb-5 mt-10 text-xl">Change Password</h2>
      <form @submit.prevent="store.updateUserPassword(password, oldPassword)" class="flex flex-col gap-3">
        <TextInputIcon type="password" v-model="oldPassword" placeholder="Old Password" :icon="KeyRound"
          :required="true" />
        <TextInputIcon type="password" v-model="password" placeholder="Password" :icon="KeyRound" :required="true" />
        <button :disabled="password.length < 8 || oldPassword.length < 8" type="submit"
          class="disabled:opacity-50 w-full h-14 bg-amber-600 rounded-lg hover:bg-amber-700 transition">
          Update Password
        </button>
      </form>
      <h2 class="mb-5 mt-10 text-xl">Danger Zone</h2>
      <div class="flex flex-col gap-2">
        <button @click="handleLogout"
          class="w-full h-14 border-amber-600 border-solid border-2 rounded-lg hover:bg-amber-700 transition">
          Logout
        </button>
        <button @click="showDeleteAccountModal = true"
          class="w-full h-14 border-red-500 border-2 rounded-lg hover:bg-red-600 transition">
          Delete Account
        </button>
      </div>
    </div>
  </div>
</template>
