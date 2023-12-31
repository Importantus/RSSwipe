import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import UserDataView from '@/views/UserDataView.vue'
import ReaderView from '@/views/ReaderView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { useAuthStore } from '@/stores/auth'
import pinia from '@/stores/index'
import ReadinglistView from '@/views/ReadinglistView.vue'
import StarredlistView from '@/views/StarredlistView.vue'

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
      path: '/readinglist',
      name: 'Reading List',
      component: ReadinglistView,
    },
    {
      path: '/starredlist',
      name: 'Starred List',
      component: StarredlistView,
    },
    {
      path: '/readinglist/settings',
      name: 'Reading List Settings',
      component: () => import('@/views/ReadinglistSettingsView.vue')
    },
    {
      path: '/account',
      name: 'Account',
      component: UserDataView
    },
    {
      path: '/article/:id',
      name: 'Article',
      component: ReaderView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'Not Found',
      component: NotFoundView
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
  const toDepth = to.path.split('/').filter(Boolean);
  const fromDepth = from.path.split('/').filter(Boolean)

  const toDepthLength = toDepth.length;
  const fromDepthLength = fromDepth.length

  if (!from.name) {
    to.meta.transition = 'fade';
    return
  }

  if (toDepthLength === fromDepthLength) {
    const toLastDepthLength = toDepth[toDepthLength - 1]?.length || 0;
    const fromLastDepthLength = fromDepth[fromDepthLength - 1]?.length || 0

    if (!toLastDepthLength || !fromLastDepthLength) {
      to.meta.transition = toLastDepthLength > fromLastDepthLength ? 'slide-right' : 'slide-left'
    } else {
      to.meta.transition = 'fade'
    }
  } else {
    to.meta.transition = toDepthLength > fromDepthLength ? 'slide-right' : 'slide-left'
  }
})

export default router
