<script lang="ts" setup>
import { User, EyeOff, Eye } from 'lucide-vue-next';
import { ref } from 'vue';

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
let showPassword = ref(false)
let inputType = ref(props.type)

function togglePassword() {
    showPassword.value = !showPassword.value
    if (showPassword.value) {
        inputType.value = 'text'
    } else {
        inputType.value = 'password'
    }
}

const updateValue = (event: any) => {
    emit('update:modelValue', event.target.value)
}
</script>

<template>
    <div class="relative">
        <input :type="inputType" :value="modelValue" @input="updateValue" :placeholder="placeholder" :required="required"
            class="w-full h-14 bg-neutral-700 bg-opacity-60 rounded-lg border border-neutral-700 backdrop-blur-sm pl-12 placeholder:text-neutral-600" />
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <props.icon :size="24" :class="{ 'stroke-white': modelValue, 'stroke-neutral-600': !modelValue }"
                class="transition-all" />
        </div>
        <div v-if="type == 'password'" class="absolute inset-y-0 right-0 flex items-center pr-3" @click="togglePassword">
            <div v-if="showPassword">
                <Eye :size="24" :class="{ 'stroke-white': modelValue, 'stroke-neutral-600': !modelValue }"
                    class="transition-all" />
            </div>
            <div v-else>
                <EyeOff :size="24" :class="{ 'stroke-white': modelValue, 'stroke-neutral-600': !modelValue }"
                    class="transition-all" />
            </div>
        </div>
    </div>
</template>