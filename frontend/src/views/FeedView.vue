<script setup lang="ts">
import FeedList from '@/components/list/FeedList.vue';
import { useFeedStore } from '@/stores/feeds';
import { ref } from 'vue';
import TitleNavigationBar from '@/components/TitleNavigationBar.vue'
import TextInputIcon from '@/components/TextInputIcon.vue'
import { Link, X, Plus } from 'lucide-vue-next';

const newFeedUrl = ref('');
const openInApp = ref(true);
const store = useFeedStore();
const showModal = ref(false);
const vFocus = {
  mounted: (el:HTMLElement) => el.querySelector("input")?.focus()
}
const toggleAddFeedPopup = () => {
  showModal.value = !showModal.value;
};
const addNewFeed = async () => {
  const shortenedURL = newFeedUrl.value.trim();
  showModal.value = false;
  await store.addFeed(shortenedURL, openInApp.value);
  newFeedUrl.value = '';
};


</script>

<template>
  <div class="px-5 overflow-y-scroll pb-10 h-full">
    <TitleNavigationBar title="Your Feeds" backNavigationPath="/" class="z-20" />
    <div class="fixed bottom-0 left-0 right-0 max-w-xl m-auto">
      <div @click="showModal = true" name="popup"
        class="bg-primary-600 rounded-full absolute bottom-10 right-5 p-2 cursor-pointer z-20" title="add new Feed ">
        <Plus :size="28" class=" text-white m-3" />
      </div>
    </div>
    <Transition name="popup-fade">
      <div v-if="showModal"
        class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-40 bg-black flex justify-center items-center">

        <div class="w-[90%] max-w-lg bg-secondary-900 rounded-xl p-5 relative  justify-between">
          <X class="absolute mb-3 top-5 right-5 cursor-pointer" size="32" @click="toggleAddFeedPopup" />
          <h3 class="text-lg font-semibold mb-3 top-5">Add New Feed</h3>
          <form @submit.prevent="addNewFeed" >
            <TextInputIcon v-focus  v-model="newFeedUrl" placeholder="URL" :icon="Link" :required="true"  />
            <button type="submit"
              class="w-full h-14 bg-amber-600 rounded-lg hover:bg-amber-700 transition mb-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="newFeedUrl.length === 0">
              Add Feed
            </button>
          </form>
        </div>
      </div>
    </Transition>
    <div v-if="store.error">
      <div v-if="store.error" class="w-full bg-red-500 rounded-lg p-3 z-10 mb-5">{{ store.error }}</div>
    </div>
    <FeedList />


  </div>
</template>

<style scoped>
.gradient {
  background: radial-gradient(114.56% 50% at 50% 50%, #3d3d3d 0%, #101010 81.77%);
}
</style>
