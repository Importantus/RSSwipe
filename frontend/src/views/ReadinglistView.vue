<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ReadinglistList from '@/components/list/ReadinglistList.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Settings } from 'lucide-vue-next';
import { Undo2, Star } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const store = useReadingListStore();
const showTile = ref(false)

watch(() => store.removedArticles.length, (newValue, oldValue) => {
    if (newValue > oldValue) {
        showTile.value = true
        setTimeout(() => {
            showTile.value = false;
        }, 5000);
    }
});

console.log(store.hasStarredArticles)

</script>
<template>
    <div class="px-5 overflow-y-scroll h-screen">
        <TitleNavigationBar title="Reading List" backNavigationPath="/" class="mb-5">
            <div class="gap-2 flex flex-row">
                <RouterLink to="/starredlist" class="text-white">
                    <Star size="26" class="text-white" />
                </RouterLink>
                <RouterLink to="/readinglist/settings" class="text-white">
                    <Settings size="26" class="text-white" />
                </RouterLink>
            </div>
        </TitleNavigationBar>
        <ReadinglistList :isStarred="false" />
        <Transition name="fade">
            <div :onclick="() => {
                showTile = false
                store.undo();
            }" v-if="showTile"
                class="fixed bottom-5 left-5 right-5 flex flex-row gap-5 bg-black p-5 rounded-md shadow-sm">
                <div class="flex-grow font-semibold">
                    Removed Article
                </div>
                <Undo2 size="24" class=" text-primary-600" />
            </div>
        </Transition>
    </div>
</template>