<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import type { SeriesPoint } from '@/types/stats'
import {
  getMasteryGrowth,
  getReviewSeries,
  getStudySeries,
  getTodayMastered,
  getTodaySeconds,
  getTotalNew,
  getTotalReviews,
} from '@/modules/stats/aggregate'
import { MASTERY_LABELS, type MasteryLevel } from '@/types/library'
import StatCard from '@/components/stats/StatCard.vue'
import BarChart from '@/components/stats/charts/BarChart.vue'
import LineChart from '@/components/stats/charts/LineChart.vue'
import DonutChart, { type DonutSegment } from '@/components/stats/charts/DonutChart.vue'

defineOptions({ name: 'StatsView' })

const library = useLibraryStore()

const kpi = ref({ todayMin: 0, mastered: 0, totalReviews: 0, totalNew: 0 })
const studyPeriod = ref<7 | 30>(7)
const studyData = ref<SeriesPoint[]>([])
const reviewPeriod = ref<7 | 14>(7)
const reviewData = ref<SeriesPoint[]>([])
const growthPeriod = ref<7 | 30>(30)
const growthData = ref<SeriesPoint[]>([])
const dist = ref<DonutSegment[]>([])

onMounted(() => {
  void loadAll()
})
onActivated(() => {
  void loadAll()
})

async function loadAll() {
  const [todaySec, mastered, totalReviews, totalNew, study, review, growth] = await Promise.all([
    getTodaySeconds(),
    getTodayMastered(),
    getTotalReviews(),
    getTotalNew(),
    getStudySeries(studyPeriod.value),
    getReviewSeries(reviewPeriod.value),
    getMasteryGrowth(growthPeriod.value),
  ])
  kpi.value = {
    todayMin: Math.round(todaySec / 60),
    mastered,
    totalReviews,
    totalNew,
  }
  studyData.value = study
  reviewData.value = review
  growthData.value = growth

  await library.ensureLoaded()
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const i of library.items) {
    if (!i.isRemoved) counts[i.mastery] = (counts[i.mastery] ?? 0) + 1
  }
  dist.value = (Object.keys(MASTERY_LABELS) as unknown as MasteryLevel[]).map((lv) => ({
    label: MASTERY_LABELS[lv],
    value: counts[lv] ?? 0,
    color: `var(--cy-mastery-${lv})`,
  }))
}

function switchStudy(p: 7 | 30) {
  studyPeriod.value = p
  void getStudySeries(p).then((d) => (studyData.value = d))
}
function switchReview(p: 7 | 14) {
  reviewPeriod.value = p
  void getReviewSeries(p).then((d) => (reviewData.value = d))
}
function switchGrowth(p: 7 | 30) {
  growthPeriod.value = p
  void getMasteryGrowth(p).then((d) => (growthData.value = d))
}
</script>

<template>
  <div class="stats">
    <header class="stats__head">
      <span class="stats__title">学习统计</span>
      <span class="stats__sub">你的坚持，看得见</span>
    </header>

    <!-- KPI -->
    <div class="stats__kpi">
      <StatCard label="今日学习" :value="kpi.todayMin" unit="分钟" icon="clock-o" />
      <StatCard label="已掌握" :value="kpi.mastered" unit="个" icon="medal-o" color="#43a047" />
      <StatCard label="累计复习" :value="kpi.totalReviews" unit="次" icon="replay" color="#5c9ce6" />
      <StatCard label="累计学习" :value="kpi.totalNew" unit="个成语" icon="bookmark-o" color="#f9a825" />
    </div>

    <van-empty v-if="library.totalCount === 0" description="学习库还是空的，搜索成语开始记录你的进度" />

    <template v-else>
      <!-- 学习时长 -->
      <section class="card">
        <div class="card__head">
          <h3 class="card__title">每日学习时长</h3>
          <div class="period">
            <button :class="{ active: studyPeriod === 7 }" @click="switchStudy(7)">7天</button>
            <button :class="{ active: studyPeriod === 30 }" @click="switchStudy(30)">30天</button>
          </div>
        </div>
        <BarChart :data="studyData" unit="分" />
      </section>

      <!-- 复习频率 -->
      <section class="card">
        <div class="card__head">
          <h3 class="card__title">复习频率</h3>
          <div class="period">
            <button :class="{ active: reviewPeriod === 7 }" @click="switchReview(7)">7天</button>
            <button :class="{ active: reviewPeriod === 14 }" @click="switchReview(14)">14天</button>
          </div>
        </div>
        <BarChart :data="reviewData" unit="次" color="#5c9ce6" />
      </section>

      <!-- 掌握增长 -->
      <section class="card">
        <div class="card__head">
          <h3 class="card__title">已掌握数量</h3>
          <div class="period">
            <button :class="{ active: growthPeriod === 7 }" @click="switchGrowth(7)">7天</button>
            <button :class="{ active: growthPeriod === 30 }" @click="switchGrowth(30)">30天</button>
          </div>
        </div>
        <LineChart :data="growthData" unit="个" color="#43a047" />
      </section>

      <!-- 掌握分布 -->
      <section class="card">
        <h3 class="card__title">掌握程度分布</h3>
        <DonutChart :segments="dist" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats {
  padding: 18px 12px 20px;
}

.stats__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0 4px 12px;
}

.stats__title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
}

.stats__sub {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}

.stats__kpi {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.card {
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: var(--cy-shadow-sm);
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card__title {
  font-size: var(--cy-font-md);
  font-weight: 700;
  display: flex;
  align-items: center;
}
.card__title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--cy-primary);
  margin-right: 8px;
}

.period {
  display: flex;
  gap: 6px;
}
.period button {
  border: 1px solid var(--cy-border);
  background: var(--cy-card);
  color: var(--cy-text-secondary);
  font-size: var(--cy-font-xs);
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.period button.active {
  background: var(--cy-primary);
  border-color: var(--cy-primary);
  color: #fff;
}
</style>
