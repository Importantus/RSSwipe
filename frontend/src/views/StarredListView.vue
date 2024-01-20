<script setup lang="ts">
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import StarredlistList from '@/components/lists/starredList/StarredListList.vue';
import { useStarredListStore } from '@/stores/starredList';
import UndoSnackbar from '@/components/lists/UndoSnackbar.vue';
import { ref } from 'vue';

const store = useStarredListStore();

const showRemoveTile = ref(false)
const showUnstarredTile = ref(false)
</script>

<template>
    <div>
        <div class="px-5 overflow-y-scroll pb-10 h-full relative z-20">
            <TitleNavigationBar title="Starred List" backNavigationPath="/readinglist" class="" />
            <StarredlistList />
            <UndoSnackbar message="Removed article" :show="showRemoveTile" :undo="store.undoRemove"
                :watch="store.removedArticles.length" />
            <UndoSnackbar message="Unstarred article" :show="showUnstarredTile" :undo="store.undoUnstarred"
                :watch="store.unstarredArticles.length" />
        </div>
        <img src="/images/starredlistbg.svg" alt="Person laying on the ground and scrolling trough their phone"
            class="absolute bottom-0 right-0 h-54  w-[80vw] object-cover pointer-events-none">
    </div>
</template>
