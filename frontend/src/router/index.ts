import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import UserDataView from '@/views/UserDataView.vue'
import ReaderView from '@/views/ReaderView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import FeedView from '@/views/FeedView.vue'
import SettingsView from '@/views/SettingsView.vue'
import ReadinglistSettingsView from '@/views/ReadinglistSettingsView.vue'
import { useAuthStore } from '@/stores/auth'
import pinia from '@/stores/index'
import ReadinglistViewVue from '@/views/ReadinglistView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

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
      component: ReadinglistViewVue,
    },
    {
      path: '/readinglist/settings',
      name: 'Reading List Settings',
      component: ReadinglistSettingsView
    },
    {
      path: '/settings/account',
      name: 'Account',
      component: UserDataView
    },
    {
      path: '/settings/statistics',
      name: 'Statistics',
      component: StatisticsView
    },
    {
      path: '/article/:id',
      name: 'Article',
      component: ReaderView
    },
    {
      path: '/settings',
      name: 'Settings',
      component: SettingsView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'Not Found',
      component: NotFoundView
    },
    {
      path: '/feeds',
      name: 'Feeds',
      component: FeedView
    },

  ]
})

const authStore = useAuthStore(pinia)
let readingListNavigation: string[] = []

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

  if (to.name === 'Article' && from.name === 'Article') {
    if (to.params.id === readingListNavigation[readingListNavigation.length - 1]) {
      to.meta.transition = 'slide-down'
      readingListNavigation.pop()
      return
    } else {
      to.meta.transition = 'slide-up'
      readingListNavigation.push(from.params.id as string)
      return
    }
  } else {
    readingListNavigation = []
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
