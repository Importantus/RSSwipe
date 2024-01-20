<script setup lang="ts">
const props = defineProps<{
    date: Date;
    maxVal: number;
    val: number;
    val2?: number;
}>();
</script>

<template>
    <div class="flex flex-col items-center gap-3 w-full max-w-[1.75rem]">
        <div class="h-full w-full flex flex-col justify-end items-center text-sm text-background-300 gap-1">
            {{ props.val }}
            <div class="w-full rounded-t overflow-hidden flex flex-col items-center bg-primary-600" :style="{
                height: 5 + (props.val / props.maxVal * 95) + '%'
            }">

                <div v-if="val2" class="w-full bg-primary-300" :style="{
                    height: (props.val2! / props.val * 100) + '%',
                }">
                </div>
            </div>
        </div>
        <div class="">
            {{ props.date.toLocaleDateString(undefined, { weekday: 'short' }) }}
        </div>
    </div>
</template>
