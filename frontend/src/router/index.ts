import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import UserDataView from '@/views/UserDataView.vue'
import { useAuthStore } from '@/stores/auth'
import pinia from '@/stores/index'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'Register',
      component: RegisterView
    },
    {
      path: '/account',
      name: 'Account',
      component: UserDataView
    }
  ]
})

const authStore = useAuthStore(pinia)

router.beforeEach((to, from, next) => {
  // Check if the user is logged in
  if (to.name !== 'Login' && to.name !== 'Register' && !authStore.isLoggedIn) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

router.afterEach((to, from) => {
  const toDepth = to.path.split('/').length
  const fromDepth = from.path.split('/').length
  to.meta.transition = toDepth < fromDepth ? 'slide-right' : 'slide-left'
})

export default router
