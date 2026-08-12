<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SeriesPoint } from '@/types/stats'

const props = defineProps<{
  data: SeriesPoint[]
  height?: number
  color?: string
  unit?: string
  /** 最多显示的 x 轴标签数 */
  maxLabels?: number
}>()

const W = 320
const H = computed(() => props.height ?? 176)
const M = { top: 18, right: 6, bottom: 22, left: 6 }
const color = computed(() => props.color ?? 'var(--cy-primary)')
const unit = computed(() => props.unit ?? '')

const maxVal = computed(() => {
  const m = Math.max(...props.data.map((d) => d.value), 0)
  return m === 0 ? 1 : m
})

const innerW = computed(() => W - M.left - M.right)
const innerH = computed(() => H.value - M.top - M.bottom)

function barX(i: number): number {
  const n = props.data.length
  const slot = innerW.value / n
  return M.left + slot * i + slot * 0.12
}
function barW(): number {
  const n = props.data.length
  const slot = innerW.value / n
  return Math.max(slot * 0.76, 2)
}
function barH(v: number): number {
  return Math.max((v / maxVal.value) * innerH.value, 1)
}
function barY(v: number): number {
  return M.top + innerH.value - barH(v)
}

const labelStep = computed(() => {
  const n = props.data.length
  const max = props.maxLabels ?? Math.min(n, 7)
  return Math.max(1, Math.ceil(n / max))
})

const active = ref(-1)
</script>

<template>
  <div class="bar-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" class="bar-chart__svg">
      <!-- 基线 -->
      <line :x1="M.left" :y1="M.top + innerH" :x2="W - M.right" :y2="M.top + innerH" stroke="var(--cy-border)" stroke-width="1" />
      <!-- 柱 -->
      <rect
        v-for="(d, i) in data"
        :key="i"
        :x="barX(i)"
        :y="barY(d.value)"
        :width="barW()"
        :height="barH(d.value)"
        :rx="3"
        :fill="color"
        :opacity="active === -1 || active === i ? 1 : 0.35"
        @click="active = active === i ? -1 : i"
      >
        <title>{{ d.label }}：{{ d.value }}{{ unit }}</title>
      </rect>
      <!-- 选中值标签 -->
      <g v-if="active >= 0">
        <rect
          :x="barX(active) - 14"
          :y="barY(data[active].value) - 20"
          width="34"
          height="16"
          rx="4"
          fill="#1a1a1a"
        />
        <text
          :x="barX(active) + 3"
          :y="barY(data[active].value) - 8"
          text-anchor="middle"
          font-size="10"
          fill="#fff"
        >{{ data[active].value }}{{ unit }}</text>
      </g>
      <!-- x 轴标签 -->
      <text
        v-for="(d, i) in data"
        :key="'l' + i"
        v-show="i % labelStep === 0 || i === data.length - 1"
        :x="barX(i) + barW() / 2"
        :y="H - 6"
        text-anchor="middle"
        font-size="9"
        fill="var(--cy-text-tertiary)"
      >{{ d.label }}</text>
    </svg>
  </div>
</template>

<style scoped>
.bar-chart {
  width: 100%;
}
.bar-chart__svg {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
}
</style>
