<script setup lang="ts">
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import ReadingListList from '@/components/lists/readingList/ReadingListList.vue';
import UndoSnackbar from '@/components/lists/UndoSnackbar.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Settings, ListX, X, Star } from 'lucide-vue-next';
import { ref } from 'vue';

const store = useReadingListStore();

const showTile = ref(false)
const showClearListModal = ref(false);
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
                    <RouterLink to="/starredlist" class="text-white">
                        <Star size="24" class="text-white" />
                    </RouterLink>
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
            <ReadingListList />
            <UndoSnackbar message="Removed article" :show="showTile" :undo="store.undo"
                :watch="store.removedArticles.length" />
        </div>
    </div>
</template>
