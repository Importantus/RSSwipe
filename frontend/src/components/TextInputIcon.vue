<script lang="ts" setup>
import { User } from 'lucide-vue-next';

const props = defineProps({
    modelValue: String,
    placeholder: String,
    icon: {
        default: User,
        required: true
    },
    type: {
        type: String,
        default: 'text'
    },
    required: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (event: any) => {
    emit('update:modelValue', event.target.value)
}
</script>

<template>
    <div class="relative">
        <input :type="type" :value="modelValue" @input="updateValue" :placeholder="placeholder" :required="required"
            class="w-full h-14 bg-neutral-700 bg-opacity-60 rounded-lg border border-neutral-700 backdrop-blur-sm pl-12 placeholder:text-neutral-700" />
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <props.icon :size="24" color="rgb(64 64 64 / var(--tw-text-opacity)" />
        </div>
    </div>
</template>