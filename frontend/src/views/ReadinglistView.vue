<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ReadinglistList from '@/components/list/ReadinglistList.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Settings } from 'lucide-vue-next';
import { Undo2, BookText, Star } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const store = useReadingListStore();
const showTile = ref(false)
let typeStarredList = ref(false);

watch(() => store.removedArticles.length, (newValue, oldValue) => {
    if (newValue > oldValue) {
        showTile.value = true
        setTimeout(() => {
            showTile.value = false;
        }, 5000);
    }
});

function switchListTypeStarred(starList: boolean) {
    if (starList) {
        typeStarredList.value = true;
    } else {
        typeStarredList.value = false;
    }
}

console.log(store.hasStarredArticles)

</script>
<template>
    <div class="px-5 overflow-y-scroll h-screen">
        <TitleNavigationBar title="Reading List" backNavigationPath="/" class="mb-5">
            <RouterLink to="/readinglist/settings" class="text-white">
                <Settings size="24" class="text-white" />
            </RouterLink>
        </TitleNavigationBar>
        <div>
            <ReadinglistList v-if="typeStarredList" :isStarred="true" />
            <ReadinglistList v-if="!typeStarredList" :isStarred="false" />
        </div>
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
        <div v-if="store.hasStarredArticles" class="sticky bottom-0 pt-5">
            <div class="flex flex-col">
                <div class="flex flex-row justify-between items-center w-full m-auto px-[20%] bg-background-950 p-4">
                    <button @click=" switchListTypeStarred(false)" class="shrink-0">
                        <BookText size="24" class=""
                            :class="{ 'text-primary-600': !typeStarredList, 'opacity-40': typeStarredList }" />
                    </button>
                    <button @click="switchListTypeStarred(true)" class="shrink-0">
                        <Star size="24" class=""
                            :class="{ 'text-primary-600': typeStarredList, 'opacity-40': !typeStarredList }" />
                    </button>
                </div>
                <div class="flex flex-row">
                    <div class="h-1 w-1/2 rounded-full"
                        :class="{ 'bg-primary-600': !typeStarredList, 'bg-background-950': typeStarredList }">
                    </div>
                    <div class="h-1 w-1/2 rounded-full"
                        :class="{ 'bg-background-950': !typeStarredList, 'bg-primary-600': typeStarredList }">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>