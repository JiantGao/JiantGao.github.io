<script setup lang="ts">
import { computed } from 'vue'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  segments: DonutSegment[]
  size?: number
}>()

const size = computed(() => props.size ?? 140)
const r = 56
const stroke = 22
const C = 2 * Math.PI * r
const total = computed(() => props.segments.reduce((s, seg) => s + seg.value, 0))

const arcs = computed(() => {
  let acc = 0
  return props.segments.map((seg) => {
    const len = total.value === 0 ? 0 : (seg.value / total.value) * C
    const arc = { seg, len, offset: acc }
    acc += len
    return arc
  })
})
</script>

<template>
  <div class="donut">
    <svg :viewBox="`0 0 ${size} ${size}`" class="donut__svg">
      <g transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" :r="r" fill="none" stroke="var(--cy-bg)" :stroke-width="stroke" />
        <circle
          v-for="(a, i) in arcs"
          :key="i"
          cx="70"
          cy="70"
          :r="r"
          fill="none"
          :stroke="a.seg.color"
          :stroke-width="stroke"
          :stroke-dasharray="`${a.len} ${C - a.len}`"
          :stroke-dashoffset="a.offset"
        >
          <title>{{ a.seg.label }}：{{ a.seg.value }}</title>
        </circle>
      </g>
      <text x="70" y="64" text-anchor="middle" font-size="22" font-weight="700" fill="var(--cy-text-primary)">{{ total }}</text>
      <text x="70" y="84" text-anchor="middle" font-size="10" fill="var(--cy-text-tertiary)">成语总数</text>
    </svg>
    <div class="donut__legend">
      <div v-for="seg in segments" :key="seg.label" class="donut__legend-item">
        <span class="donut__dot" :style="{ background: seg.color }"></span>
        <span class="donut__label">{{ seg.label }}</span>
        <span class="donut__val">{{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut {
  display: flex;
  align-items: center;
  gap: 18px;
}
.donut__svg {
  flex-shrink: 0;
  width: 128px;
  height: 128px;
}
.donut__legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.donut__legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--cy-font-sm);
}
.donut__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.donut__label {
  flex: 1;
  color: var(--cy-text-secondary);
}
.donut__val {
  font-weight: 600;
  color: var(--cy-text-primary);
}
</style>
