<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ReadinglistList from '@/components/list/ReadinglistList.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Settings } from 'lucide-vue-next';
import { Undo2 } from 'lucide-vue-next';
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
</script>
<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Reading List" backNavigationPath="/" class="mb-5">
            <RouterLink to="/readinglist/settings" class="text-white">
                <Settings size="24" class="text-white" />
            </RouterLink>
        </TitleNavigationBar>
        <ReadinglistList />
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