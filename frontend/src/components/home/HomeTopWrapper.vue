<script setup lang="ts">
import FeedSettingsButton from '@/components/FeedSettingsButton.vue';
import GreetingBanner from '@/components/GreetingBanner.vue';
import UserSettingsButton from '@/components/UserSettingsButton.vue';
import FeedFilterList from '@/components/FeedFilterList.vue';
</script>

<template>
    <div class=" flex flex-col">
        <div class="flex flex-row items-center">
            <UserSettingsButton class="flex-none basis 1/4" />
            <GreetingBanner class="flex-1 basis 2/4" greeting="Let's Choose" />
            <FeedSettingsButton class="flex-none basis 1/4" />
        </div>
        <FeedFilterList />
    </div>
</template>