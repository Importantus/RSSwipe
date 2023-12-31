<script setup lang="ts">
import FeedList from '@/components/list/FeedList.vue';
import { Plus } from 'lucide-vue-next';
import { userFeedItem } from '@/stores/feeds';
import { ref } from 'vue';
import TitleNavigationBar from '@/components/TitleNavigationBar.vue'
import TextInputIcon from '@/components/TextInputIcon.vue'
import { Link } from 'lucide-vue-next';


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
    showModal.value = false;
    await store.addFeed(shortenedURL, openInApp.value);
    newFeedTitle.value = '';
    newFeedUrl.value = '';
    
  } else {
    alert('Bitte geben Sie eine gültige URL ein.');
    
  }
  
};
</script>

<template>
  <div>
    <div class="px-5  pb-1 relative z-10">
    <TitleNavigationBar title="Your Feeds" backNavigationPath="/" />
  </div>
  
    <div >
      
      <div class="bg-primary-600 rounded-full  absolute bottom-8 right-0 m-8 py-0 mr-8"> 
        
      <Plus :size="24"  @click="showModal = true"
        class=" text-white m-3" />
      </div>
      
      
      <div 
      v-if="showModal"
      class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-40 bg-black flex justify-center items-center"
    >
      <div  class="bg-secondary-900 p-4 rounded-lg shadow-lg justify-between">
        <h3 class="text-lg font-semibold mb-4">Add New Feed</h3>
        <TextInputIcon
          
          v-model="newFeedUrl"
          placeholder="URL"
          :icon="Link" 
          :required="true"
        />
          
        <button @click="addNewFeed"
          class="hover:bg-secondary-500 border border-scondary-400 text-white font-semibold p-2 rounded mb-4 mt-3">Add
          Feed</button>
        <button @click="toggleAddFeedPopup"
          class=" hover:bg-secondary-500 border border-scondary-400 text-white font-semibold p-2 rounded ml-3">Cancel</button>
        
      </div>
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
