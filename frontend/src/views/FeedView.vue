<script setup lang="ts">
import FeedList from '@/components/list/FeedList.vue';
import { PlusCircle } from 'lucide-vue-next';
import { userFeedItem } from '@/stores/feeds';
import { ref } from 'vue';

const newFeedUrl = ref('');
const openInApp = ref(true);
const newFeedTitle = ref('');
const store = userFeedItem();
const showModal = ref(false);
const toggleAddFeedPopup = () => {
  showModal.value = !showModal.value;
};

const addNewFeed = async () => {
  const shortenedURL = newFeedUrl.value.trim();
  if (shortenedURL) {
    await store.addFeed(shortenedURL, openInApp.value);

    await store.addFeed(newFeedUrl.value, true);
    newFeedTitle.value = '';
    newFeedUrl.value = '';
    showModal.value = false;
  } else {
    alert('Bitte geben Sie eine gültige URL ein.');
  }
};
</script>

<template>
  <div>
    <div>
      <PlusCircle size="50" @click="showModal = true"
        class="bg-orange-500 text-white  rounded-full h-12 w-12 absolute bottom-8 right-0 m-8 py-0" />
      <div v-if="showModal" class="bg-secondary-900 p-4 rounded-lg shadow-lg justify-between">
        <h3 class="text-lg font-semibold mb-4">Add New Feed</h3>
        <input v-model="newFeedTitle" type="text" placeholder="Title"
          class="p-2 border border-secondary-800 rounded mb-2 w-full" />
        <input v-model="newFeedUrl" type="text" placeholder="URL"
          class="p-2 border border-secondary-800 rounded mb-4 w-full" />
        <button @click="addNewFeed"
          class="hover:bg-secondary-500 border border-scondary-400 text-white font-semibold p-2 rounded ">Add
          Feed</button>
        <button @click="toggleAddFeedPopup"
          class=" hover:bg-secondary-500 border border-scondary-400 text-white font-semibold p-2 rounded ml-3">Cancel</button>
      </div>

    </div>

    <FeedList />
  </div>
</template>

<style scoped>
.gradient {
  background: radial-gradient(114.56% 50% at 50% 50%, #3d3d3d 0%, #101010 81.77%);
}
</style>
