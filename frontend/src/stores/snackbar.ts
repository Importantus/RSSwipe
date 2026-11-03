import { defineStore } from 'pinia'

const DURATION_MS = 5000

export const useSnackbarStore = defineStore('snackbar', {
    state: () => ({
        message: '',
        undo: null as (() => void | Promise<void>) | null,
        visible: false
    }),

    actions: {
        show(message: string, undo?: () => void | Promise<void>) {
            this.message = message
            this.undo = undo ?? null
            this.visible = true
            this.restartTimer()
        },
        restartTimer() {
            clearTimeout(timer)
            timer = setTimeout(() => this.hide(), DURATION_MS)
        },
        pauseTimer() {
            clearTimeout(timer)
        },
        hide() {
            clearTimeout(timer)
            this.visible = false
        },
        async runUndo() {
            const undo = this.undo
            this.hide()
            if (undo) await undo()
        }
    }
})

let timer: ReturnType<typeof setTimeout> | undefined
