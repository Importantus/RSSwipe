<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ReadinglistList from '@/components/list/ReadinglistList.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Settings } from 'lucide-vue-next';
import { ListX, X } from 'lucide-vue-next';
import { Undo2 } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const store = useReadingListStore();

const showTile = ref(false)

const showClearListModal = ref(false);

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
    <div>
        <Transition name="popup-fade">
            <div v-if="showClearListModal" @click="showClearListModal = false"
                class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-70 bg-black flex justify-center items-center">
                <div class="w-[90%] max-w-lg bg-background-950 rounded-xl p-5 relative">
                    <X class="absolute top-5 right-5 cursor-pointer" size="26" @click="showClearListModal = false"
                        title="close window" />
                    <div class="text-xl font-semibold">Clear List?</div>
                    <div class="text-background-400 mb-5">Which articles do you want to remove?</div>
                    <div class="flex flex-col gap-5">
                        <button @click="() => {
                            store.clear(false)
                            showClearListModal = false
                        }" class="w-full h-14 bg-primary-950 rounded-lg transition font-semibold"
                            title="remove all articles">Remove all
                            articles</button>
                        <button @click="() => {
                            store.clear(true)
                            showClearListModal = false
                        }" class="w-full h-14 bg-primary-600 rounded-lg transition font-semibold"
                            title="remove only read articles">Remove only
                            read articles</button>
                    </div>
                </div>
            </div>
        </Transition>
        <div class="px-5 overflow-y-scroll pb-10 h-full">
            <TitleNavigationBar title="Reading List" backNavigationPath="/" class="mb-5">
                <div class="flex gap-4">
                    <div title="close window">
                        <ListX v-if="store.articles.length > 0" size="24" class="text-white cursor-pointer"
                            @click="showClearListModal = true" />
                    </div>
                    <div title="readinglist settings">
                        <RouterLink to="/readinglist/settings" class="text-white">
                            <Settings size="24" class="text-white" title="List setting" />
                        </RouterLink>
                    </div>
                </div>
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
    </div>
</template>