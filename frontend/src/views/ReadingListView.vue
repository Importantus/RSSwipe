<script setup lang="ts">
import AppModal from '@/components/global/AppModal.vue';
import AppButton from '@/components/global/AppButton.vue';
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
        <AppModal :show="showClearListModal" title="Clear list?" @close="showClearListModal = false">
            <p class="text-sm text-background-300 mb-4">Which articles do you want to remove?</p>
            <div class="flex flex-col gap-3">
                <AppButton variant="primary" title="remove only read articles"
                    @click="store.clear(true); showClearListModal = false">
                    Remove read articles
                </AppButton>
                <AppButton variant="danger-outline" title="remove all articles"
                    @click="store.clear(false); showClearListModal = false">
                    Remove all articles
                </AppButton>
            </div>
        </AppModal>
        <div class="px-5 overflow-y-scroll pb-10 h-full" id="scrolling-container">
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
