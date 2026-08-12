<script setup lang="ts">
defineOptions({ name: 'HomeView' })
</script>

<template>
  <div class="page-body">
    <h2 class="page-title">首页</h2>
    <p class="placeholder">搜索功能将在 M2 里程碑接入。</p>
  </div>
</template>

<style scoped>
.page-title {
  font-size: var(--cy-font-xl);
  margin-bottom: var(--cy-space-md);
}
.placeholder {
  color: var(--cy-text-tertiary);
  font-size: var(--cy-font-md);
}
</style>
