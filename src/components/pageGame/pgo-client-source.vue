<!-- 添加客户端来源浮层：自动发现或手动选择已安装客户端 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭客户端来源选择"
    contentMaxHeight="none"
    panelWidth="720px"
    topOffset="64px"
  >
    <template #header>
      <div class="source-heading">
        <h2 :id="titleId">添加新客户端</h2>
        <p>选择已有安装，或下载一个新的国服客户端。</p>
      </div>
    </template>

    <div aria-label="客户端来源" class="source-options" role="radiogroup">
      <button
        :aria-checked="selectedSource === 'existing'"
        :class="{ selected: selectedSource === 'existing' }"
        class="source-option"
        role="radio"
        type="button"
        @click="selectedSource = 'existing'"
      >
        <span aria-hidden="true" class="source-option-icon">
          <v-icon icon="mdi-folder-search-outline" />
        </span>
        <span class="source-option-copy">
          <strong>定位已有安装</strong>
          <span>自动识别，或手动指定国服 YuanShen.exe</span>
        </span>
        <v-icon
          :icon="selectedSource === 'existing' ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
          class="source-option-state"
        />
      </button>
      <button
        :aria-checked="selectedSource === 'new'"
        :class="{ selected: selectedSource === 'new' }"
        class="source-option"
        role="radio"
        type="button"
        @click="selectedSource = 'new'"
      >
        <span aria-hidden="true" class="source-option-icon">
          <v-icon icon="mdi-download-box-outline" />
        </span>
        <span class="source-option-copy">
          <strong>新增客户端</strong>
          <span>选择渠道、安装位置和需要的语音包</span>
        </span>
        <v-icon
          :icon="selectedSource === 'new' ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
          class="source-option-state"
        />
      </button>
    </div>

    <template #footer>
      <span class="source-footer-hint">下一步不会立即修改现有游戏</span>
      <div class="source-actions">
        <v-btn variant="text" @click="onCancel">取消</v-btn>
        <v-btn
          :disabled="selectedSource === null"
          class="source-confirm"
          color="var(--tgc-od-orange)"
          variant="flat"
          @click="onContinue"
        >
          {{ continueLabel }}
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import { computed, ref, useId, watch } from "vue";

type ClientSource = "existing" | "new";

const emit = defineEmits<{ createNew: []; locateExisting: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const selectedSource = ref<ClientSource | null>(null);

const continueLabel = computed<string>(() => {
  if (selectedSource.value === "existing") return "定位已有安装";
  if (selectedSource.value === "new") return "继续";
  return "选择来源";
});

function onCancel(): void {
  visible.value = false;
}

function onContinue(): void {
  const source = selectedSource.value;
  if (source === null) return;
  visible.value = false;
  if (source === "existing") {
    emit("locateExisting");
    return;
  }
  emit("createNew");
}

watch(visible, (open) => {
  // 组件常驻挂载后，每次打开都回到未选择状态，与之前的卸载重挂行为一致
  if (open) selectedSource.value = null;
});
</script>

<style lang="scss" scoped>
.source-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.source-options {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.source-option {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  cursor: pointer;
  gap: 12px;
  text-align: left;

  &:hover {
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-orange);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--tgc-od-orange);
    background: var(--box-bg-2);
  }
}

.source-option-icon {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.source-option-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.source-option-state {
  flex-shrink: 0;
  color: var(--box-text-2);
}

.source-option.selected .source-option-state {
  color: var(--tgc-od-orange);
}

.source-footer-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.source-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.source-confirm {
  color: var(--box-text-1);
}

@media (width <= 640px) {
  .source-options {
    grid-template-columns: 1fr;
  }
}
</style>
