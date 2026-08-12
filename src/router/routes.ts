import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', tabbar: true },
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('@/views/LibraryView.vue'),
    meta: { title: '学习库', tabbar: true },
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('@/views/ReviewView.vue'),
    meta: { title: '复习', tabbar: true },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: '学习统计', tabbar: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置', tabbar: true },
  },
  {
    path: '/idiom/:word',
    name: 'idiom-detail',
    component: () => import('@/views/IdiomDetailView.vue'),
    meta: { title: '成语详情', tabbar: false },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
