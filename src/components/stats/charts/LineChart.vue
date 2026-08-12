<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { SeriesPoint } from '@/types/stats'

const props = defineProps<{
  data: SeriesPoint[]
  height?: number
  color?: string
  unit?: string
  maxLabels?: number
}>()

const W = 320
const H = computed(() => props.height ?? 176)
const M = { top: 18, right: 10, bottom: 22, left: 10 }
const color = computed(() => props.color ?? 'var(--cy-primary)')
const unit = computed(() => props.unit ?? '')

const maxVal = computed(() => {
  const m = Math.max(...props.data.map((d) => d.value), 0)
  return m === 0 ? 1 : m
})

const innerW = computed(() => W - M.left - M.right)
const innerH = computed(() => H.value - M.top - M.bottom)

function point(i: number): [number, number] {
  const n = Math.max(props.data.length - 1, 1)
  const x = M.left + (i / n) * innerW.value
  const y = M.top + innerH.value - (props.data[i].value / maxVal.value) * innerH.value
  return [x, y]
}
const line = computed(() => props.data.map((_, i) => point(i).join(',')).join(' '))
const area = computed(() => {
  if (!props.data.length) return ''
  const [x0] = point(0)
  const [xn] = point(props.data.length - 1)
  return `${x0},${M.top + innerH.value} ${line.value} ${xn},${M.top + innerH.value}`
})

const labelStep = computed(() => {
  const n = props.data.length
  const max = props.maxLabels ?? Math.min(n, 7)
  return Math.max(1, Math.ceil(n / max))
})

const active = ref(-1)
const gradId = useId().replace(/:/g, '')
</script>

<template>
  <div class="line-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" class="line-chart__svg">
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <polygon :points="area" :fill="`url(#${gradId})`" />
      <polyline :points="line" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <g v-for="(d, i) in data" :key="i">
        <circle
          :cx="point(i)[0]"
          :cy="point(i)[1]"
          r="3"
          :fill="active === i ? color : 'var(--cy-card)'"
          :stroke="color"
          stroke-width="1.5"
          @click="active = active === i ? -1 : i"
        >
          <title>{{ d.label }}：{{ d.value }}{{ unit }}</title>
        </circle>
      </g>
      <g v-if="active >= 0">
        <rect :x="point(active)[0] - 16" :y="point(active)[1] - 24" width="38" height="16" rx="4" fill="#1a1a1a" />
        <text :x="point(active)[0] + 3" :y="point(active)[1] - 12" text-anchor="middle" font-size="10" fill="#fff">
          {{ data[active].value }}{{ unit }}
        </text>
      </g>
      <text
        v-for="(d, i) in data"
        :key="'l' + i"
        v-show="i % labelStep === 0 || i === data.length - 1"
        :x="point(i)[0]"
        :y="H - 6"
        text-anchor="middle"
        font-size="9"
        fill="var(--cy-text-tertiary)"
      >{{ d.label }}</text>
    </svg>
  </div>
</template>

<style scoped>
.line-chart {
  width: 100%;
}
.line-chart__svg {
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
}
</style>
