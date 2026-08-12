<script setup lang="ts">
defineOptions({ name: 'ReviewView' })
</script>

<template>
  <div class="page-body">
    <h2 class="page-title">复习</h2>
    <p class="placeholder">复习闪卡将在 M4 里程碑接入。</p>
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
