<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { useLibraryStore } from '@/stores/library'
import { useSearchStore } from '@/stores/search'
import { useDictStore } from '@/stores/dict'
import { exportAll, downloadJSON, backupFilename } from '@/modules/backup/export'
import { importAll, resetAll } from '@/modules/backup/import'
import { canInstall, promptInstall } from '@/modules/pwa'

defineOptions({ name: 'SettingsView' })

const library = useLibraryStore()
const search = useSearchStore()
const dict = useDictStore()

const fileInput = ref<HTMLInputElement>()
const meta = ref<{ version: string; total: number; curatedCount: number } | null>(null)
const installable = ref(false)
const importing = ref(false)

onMounted(() => {
  installable.value = canInstall()
  void dict.loadMeta().then((m) => (meta.value = m))
})

async function onExport() {
  try {
    const payload = await exportAll()
    downloadJSON(payload, backupFilename())
    showSuccessToast('已导出备份文件')
  } catch (e) {
    showToast('导出失败')
  }
}

function onImportClick() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const summary = await importAll(payload)
    await library.loadItems()
    await search.loadHistory()
    showSuccessToast(`导入成功：学习库 ${summary.library} · 事件 ${summary.events}`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '导入失败，请检查文件')
  } finally {
    importing.value = false
  }
}

async function onClearHistory() {
  try {
    await showConfirmDialog({
      title: '清空搜索历史',
      message: '确定清空全部搜索历史？',
      confirmButtonText: '清空',
      confirmButtonColor: '#c62828',
    })
    await search.clearHistory()
    showSuccessToast('搜索历史已清空')
  } catch {
    /* 取消 */
  }
}

async function onReset() {
  try {
    await showConfirmDialog({
      title: '重置全部数据',
      message: '将删除学习库、学习记录、统计与历史，且不可恢复。建议先导出备份。',
      confirmButtonText: '重置',
      confirmButtonColor: '#c62828',
    })
    await resetAll()
    await library.loadItems()
    await search.loadHistory()
    showSuccessToast('已重置全部数据')
  } catch {
    /* 取消 */
  }
}

async function onInstall() {
  const ok = await promptInstall()
  if (ok) showSuccessToast('安装成功')
  installable.value = canInstall()
}
</script>

<template>
  <div class="settings">
    <header class="settings__head">
      <span class="settings__title">设置</span>
    </header>

    <van-cell-group inset title="安装">
      <van-cell
        v-if="installable"
        title="安装应用到手机"
        label="添加到主屏幕，离线也可用"
        icon="apps-o"
        is-link
        @click="onInstall"
      />
      <van-cell title="离线可用" label="词典已内置，断网也能搜索与学习" icon="shield-o" />
    </van-cell-group>

    <van-cell-group inset title="数据管理">
      <van-cell title="导出学习数据" label="备份学习库 / 笔记 / 统计为 JSON" icon="down" is-link @click="onExport" />
      <van-cell title="导入学习数据" label="从备份文件恢复（覆盖当前数据）" icon="upgrade" is-link :loading="importing" @click="onImportClick" />
      <van-cell title="清空搜索历史" icon="delete-o" is-link @click="onClearHistory" />
      <van-cell title="重置全部数据" label="清空学习库与统计（建议先导出）" icon="replay" is-link @click="onReset" />
    </van-cell-group>

    <van-cell-group inset title="关于">
      <van-cell title="应用" value="成语学习 · 离线 PWA" />
      <van-cell title="数据版本" :value="meta?.version ?? '…'" />
      <van-cell title="词典规模" :value="meta ? `${meta.total.toLocaleString()} 条成语` : '…'" />
      <van-cell title="精选精编" :value="meta ? `${meta.curatedCount} 条` : '…'" />
    </van-cell-group>

    <p class="settings__foot">基于搜索行为构建个性化成语学习库 · 数据仅存于本机</p>

    <input ref="fileInput" type="file" accept="application/json,.json" style="display: none" @change="onFileChange" />
  </div>
</template>

<style scoped>
.settings {
  padding: 18px 0 20px;
}

.settings__head {
  padding: 0 20px 12px;
}

.settings__title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
}

.settings__foot {
  text-align: center;
  margin-top: 24px;
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}
</style>
