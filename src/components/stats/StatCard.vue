<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  unit?: string
  icon?: string
  color?: string
}>()
</script>

<template>
  <div class="stat-card">
    <div class="stat-card__label">
      <van-icon v-if="icon" :name="icon" :style="{ color: color ?? 'var(--cy-primary)' }" />
      <span>{{ label }}</span>
    </div>
    <div class="stat-card__value">
      {{ value }}<span v-if="unit" class="stat-card__unit">{{ unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  padding: 14px 16px;
  box-shadow: var(--cy-shadow-sm);
}
.stat-card__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-secondary);
}
.stat-card__value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--cy-text-primary);
  line-height: 1;
}
.stat-card__unit {
  font-size: var(--cy-font-sm);
  font-weight: 400;
  color: var(--cy-text-tertiary);
  margin-left: 2px;
}
</style>
