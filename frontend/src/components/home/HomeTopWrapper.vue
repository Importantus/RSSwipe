<script setup lang="ts">
import FeedSettingsButton from '@/components/FeedSettingsButton.vue';
import GreetingBanner from '@/components/GreetingBanner.vue';
import UserSettingsButton from '@/components/UserSettingsButton.vue';
import FeedFilterList from '@/components/FeedFilterList.vue';
</script>

<template>
    <div class=" flex flex-col">
        <div class="flex flex-row items-center my-2">
            <div class="flex-none basis 1/4">
                <UserSettingsButton />
            </div>
            <div class="flex-1 basis 2/4">
                <GreetingBanner greeting="Let's Choose" />
            </div>
            <div class="flex-none basis 1/4">
                <FeedSettingsButton />
            </div>
        </div>
        <FeedFilterList />
    </div>
</template>