<script setup lang="ts">
defineOptions({ name: 'StatsView' })
</script>

<template>
  <div class="page-body">
    <h2 class="page-title">学习统计</h2>
    <p class="placeholder">统计图表将在 M5 里程碑接入。</p>
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
