<script setup lang="ts">
import ArticleCard from '../ArticleCard.vue';
</script>

<template>
    <div class="grid">
        <div class="col-start-1 row-start-1">
            <ArticleCard
                url="https://images.tagesschau.de/image/5a2557eb-50d5-4161-b8d0-c976bade922a/AAABh_9ZeCk/AAABibBx3ic/20x9-960/symbol-vereinte-nationen-100.webp" />
        </div>
        <div class="col-start-1 row-start-1 mt-3">
            <ArticleCard
                url="https://images.tagesschau.de/image/36e09173-873a-44e7-8422-c8a7621ee13a/AAABi9YFCHM/AAABibBx3ic/20x9-960/biden-pk-san-francisco-100.webp" />
        </div>
        <div class="col-start-1 row-start-1 mt-6">
            <ArticleCard url="https://www.buchreport.de/wp-content/uploads/2020/11/Papst-Franziskus_550x415.jpg" />
        </div>
    </div>
</template>
