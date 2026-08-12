<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showRefresh = ref(false)

window.addEventListener('sw-need-refresh', () => {
  showRefresh.value = true
})

const refreshNow = () => window.location.reload()
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['HomeView', 'LibraryView', 'StatsView']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <transition name="fade">
      <div v-if="showRefresh" class="update-banner" @click="refreshNow">
        <span>新版本已就绪</span>
        <span class="update-banner__action">点击刷新</span>
      </div>
    </transition>

    <van-tabbar
      v-if="route.meta.tabbar"
      fixed
      route
      placeholder
      :safe-area-inset-bottom="true"
      active-color="#c62828"
    >
      <van-tabbar-item to="/" icon="search" replace>首页</van-tabbar-item>
      <van-tabbar-item to="/library" icon="bookmark-o" replace>学习库</van-tabbar-item>
      <van-tabbar-item to="/review" icon="completed" replace>复习</van-tabbar-item>
      <van-tabbar-item to="/stats" icon="bar-chart-o" replace>统计</van-tabbar-item>
      <van-tabbar-item to="/settings" icon="setting-o" replace>设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  overflow-y: auto;
}

.update-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: var(--cy-primary);
  color: #fff;
  font-size: var(--cy-font-md);
  box-shadow: var(--cy-shadow-md);
}

.update-banner__action {
  font-weight: 600;
  text-decoration: underline;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
