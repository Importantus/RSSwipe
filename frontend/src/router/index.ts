import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import UserSettingsView from '@/views/UserSettingsView.vue'
import ReaderView from '@/views/ReaderView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import FeedsView from '@/views/FeedsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import ReadinglistSettingsView from '@/views/ReadingListSettingsView.vue'
import ReadinglistView from '@/views/ReadingListView.vue'
import StarredlistView from '@/views/StarredListView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
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
      component: ReadinglistSettingsView
    },
    {
      path: '/settings/account',
      name: 'Account',
      component: UserSettingsView
    },
    {
      path: '/settings/statistics',
      name: 'Statistics',
      component: StatisticsView
    },
    {
      path: '/:list?/article/:id',
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
      component: FeedsView
    }

  ]
})

const authStore = useAuthStore(pinia)
const settingsStore = useSettingsStore(pinia)
let readingListNavigation: string[] = []

router.beforeEach((to, from, next) => {
  // Check if the user is logged in
  if (to.name !== 'Login' && to.name !== 'Register' && (!settingsStore.getBackendUrl() || !authStore.isLoggedIn)) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
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
