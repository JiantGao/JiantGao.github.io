<script setup lang="ts">
import { computed } from 'vue'
import type { MasteryLevel } from '@/types/library'
import { MASTERY_LABELS } from '@/types/library'

const props = defineProps<{
  show: boolean
  current: MasteryLevel
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  confirm: [level: MasteryLevel]
}>()

const showModel = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const levels = Object.entries(MASTERY_LABELS) as Array<[string, string]>

function pick(level: MasteryLevel) {
  emit('confirm', level)
}
</script>

<template>
  <van-popup
    v-model:show="showModel"
    position="bottom"
    round
    :style="{ padding: '20px 16px calc(20px + env(safe-area-inset-bottom))' }"
  >
    <div class="mastery-pick">
      <div class="mastery-pick__title">标记掌握程度</div>
      <div class="mastery-pick__grid">
        <button
          v-for="([lv, label], i) in levels"
          :key="lv"
          class="mastery-btn"
          :class="{ 'is-active': current === Number(lv) }"
          :style="{ '--mc': `var(--cy-mastery-${i})` }"
          @click="pick(Number(lv) as MasteryLevel)"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.mastery-pick__title {
  font-size: var(--cy-font-md);
  font-weight: 700;
  text-align: center;
  margin-bottom: 14px;
}

.mastery-pick__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mastery-btn {
  padding: 12px 0;
  border: 1.5px solid var(--cy-border);
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  font-size: var(--cy-font-md);
  color: var(--cy-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.mastery-btn.is-active {
  border-color: var(--mc, var(--cy-primary));
  color: var(--mc, var(--cy-primary));
  background: var(--cy-primary-soft);
  font-weight: 600;
}
</style>
