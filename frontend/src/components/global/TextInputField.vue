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
    },
    autocomplete: String
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)
const updateValue = (event: any) => {
    emit('update:modelValue', event.target.value)
}
</script>

<template>
    <div class="relative group">
        <input :type="type === 'password' && showPassword ? 'text' : type" :value="modelValue" @input="updateValue"
            :placeholder="placeholder" :aria-label="placeholder" :required="required" :autocomplete="autocomplete"
            class="w-full h-14 bg-white/[0.07] rounded-xl border border-white/10 backdrop-blur-sm pl-12 transition focus:border-primary-500 focus:bg-white/10 placeholder:text-secondary-400"
            :class="type === 'password' ? 'pr-12' : 'pr-4'" />
        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <props.icon :size="20" :class="modelValue ? 'text-white' : 'text-secondary-400'"
                class="transition-colors group-focus-within:text-primary-400" />
        </div>
        <button v-if="type === 'password'" type="button" tabindex="-1"
            :title="showPassword ? 'Hide password' : 'Show password'"
            class="absolute inset-y-0 right-0 w-12 flex items-center justify-center"
            @click="showPassword = !showPassword">
            <component :is="showPassword ? Eye : EyeOff" :size="20"
                :class="modelValue ? 'text-white' : 'text-secondary-400'" class="transition-colors" />
        </button>
    </div>
</template>
