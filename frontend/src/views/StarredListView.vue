<script setup lang="ts">
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import StarredlistList from '@/components/lists/starredList/StarredListList.vue';
import { useStarredListStore } from '@/stores/starredList';
import { Undo2 } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const store = useStarredListStore();

const showRemoveTile = ref(false)
const shoowUnstarredTile = ref(false)

watch(() => store.removedArticles.length, (newValue, oldValue) => {
    if (newValue > oldValue) {
        showRemoveTile.value = true
        setTimeout(() => {
            showRemoveTile.value = false;
        }, 5000);
    }
});

watch(() => store.unstarredArticles.length, (newValue, oldValue) => {
    if (newValue > oldValue) {
        shoowUnstarredTile.value = true
        setTimeout(() => {
            shoowUnstarredTile.value = false;
        }, 5000);
    }
});
</script>

<template>
    <div>
        <div class="px-5 overflow-y-scroll pb-10 h-full relative z-20">
            <TitleNavigationBar title="Starred List" backNavigationPath="/readinglist" class="" />
            <StarredlistList />
            <Transition name="fade">
                <div :onclick="() => {
                    showRemoveTile = false
                    store.undoRemove();
                }" v-if="showRemoveTile"
                    class="fixed bottom-5 left-5 right-5 flex flex-row gap-5 bg-black p-5 rounded-md shadow-sm">
                    <div class="flex-grow font-semibold">
                        Removed Article
                    </div>
                    <Undo2 size="24" class=" text-primary-600" />
                </div>
            </Transition>
            <Transition name="fade">
                <div :onclick="() => {
                    shoowUnstarredTile = false
                    store.undoUnstarred();
                }" v-if="shoowUnstarredTile"
                    class="fixed bottom-5 left-5 right-5 flex flex-row gap-5 bg-black p-5 rounded-md shadow-sm">
                    <div class="flex-grow font-semibold">
                        Unstarred Article
                    </div>
                    <Undo2 size="24" class=" text-primary-600" />
                </div>
            </Transition>
        </div>
        <img src="/images/starredlistbg.svg" alt="Person laying on the ground and scrolling trough their phone"
            class="absolute bottom-0 right-0 h-54  w-[80vw] object-cover pointer-events-none">
    </div>
</template>
