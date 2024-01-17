<script setup lang="ts">
import FeedSettingsButton from '@/components/FeedSettingsButton.vue';
import GreetingBanner from '@/components/GreetingBanner.vue';
import UserSettingsButton from '@/components/UserSettingsButton.vue';
import FeedFilterList from '@/components/FeedFilterList.vue';
import CategoryList from '../categories/CategoryList.vue';
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-row items-center">
      <UserSettingsButton class="flex-none basis 1/4" />
      <GreetingBanner class="flex-1 basis 2/4" />
      <FeedSettingsButton class="flex-none basis 1/4" />
    </div>
    <div class="mt-5 flex flex-col gap-2">
      <CategoryList />
      <FeedFilterList />
    </div>
  </div>
</template>
