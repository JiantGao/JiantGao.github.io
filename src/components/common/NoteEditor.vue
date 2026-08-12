<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showToast } from 'vant'

const props = defineProps<{
  show: boolean
  note: string
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [note: string]
}>()

const showModel = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const text = ref('')
watch(
  () => props.show,
  (v) => {
    if (v) text.value = props.note
  },
)

function onSave() {
  emit('save', text.value.trim())
  showToast('笔记已保存')
}
</script>

<template>
  <van-popup
    v-model:show="showModel"
    position="bottom"
    round
    :style="{ padding: '20px 16px calc(16px + env(safe-area-inset-bottom))' }"
  >
    <div class="note-editor">
      <div class="note-editor__title">个人笔记</div>
      <textarea
        v-model="text"
        class="note-editor__input"
        rows="4"
        maxlength="500"
        placeholder="记录你的理解、用法、易错点…（离线保存）"
      />
      <div class="note-editor__foot">
        <van-button size="small" round plain type="default" @click="showModel = false">取消</van-button>
        <van-button size="small" round type="danger" @click="onSave">保存</van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.note-editor__title {
  font-size: var(--cy-font-md);
  font-weight: 700;
  margin-bottom: 12px;
}

.note-editor__input {
  width: 100%;
  border: 1px solid var(--cy-border);
  border-radius: var(--cy-radius-md);
  padding: 12px;
  font-size: var(--cy-font-md);
  line-height: 1.7;
  resize: none;
  background: var(--cy-bg);
  color: var(--cy-text-primary);
  box-sizing: border-box;
}

.note-editor__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
</style>
