<!-- 设置分享阈值浮窗 -->
<template>
  <TopOverlay
    v-model="model"
    :outerClose="clickOuter"
    blurVal="10px"
    closeAriaLabel="关闭分享设置"
    contentMaxHeight="none"
    panelWidth="520px"
    :showShare="false"
    :titleId
    @close="onCancel"
  >
    <template #header>
      <div class="tcss-heading">
        <h2 :id="titleId">分享设置</h2>
        <p>设置为 0 时始终保存为文件，否则超过阈值后保存为文件</p>
      </div>
    </template>

    <div class="tcss-controls">
      <v-slider
        v-model="threshold"
        :max="SHARE_MAX"
        :min="SHARE_MIN"
        :step="1"
        class="tcss-slider"
        color="var(--tgc-od-blue)"
        hide-details
        thumb-color="var(--tgc-od-red)"
        thumb-label="always"
        @end="handleSliderEnd"
        @start="clickOuter = false"
      />
      <v-number-input
        v-model="threshold"
        :max="SHARE_MAX"
        :min="SHARE_MIN"
        :step="1"
        class="tcss-input"
        control-variant="split"
        density="compact"
        suffix="MB"
        type="number"
        variant="outlined"
        width="128px"
      />
    </div>

    <template #footer>
      <span class="tcss-hint">可设置范围 0–255 MB</span>
      <div class="tcss-actions">
        <v-btn class="tcss-cancel" variant="text" @click="onCancel">取消</v-btn>
        <v-btn class="tcss-confirm" prepend-icon="mdi-check" variant="flat" @click="onConfirm">
          确定
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { ref, useId, watch } from "vue";

const SHARE_MIN = 0;
const SHARE_MAX = 255;

const { shareDefaultFile } = storeToRefs(useAppStore());

const model = defineModel<boolean>({ default: false });
const threshold = ref<number>(shareDefaultFile.value);
const clickOuter = ref<boolean>(true);
const titleId = useId();

watch(model, (visible) => {
  clickOuter.value = true;
  if (visible) threshold.value = shareDefaultFile.value;
});

function onCancel(): void {
  model.value = false;
  threshold.value = shareDefaultFile.value;
  showSnackbar.cancel("已取消修改分享设置");
}

function onConfirm(): void {
  const value = threshold.value;
  if (value === null || !Number.isFinite(value)) {
    showSnackbar.error("阈值不能为空!");
    return;
  }
  if (value < SHARE_MIN || value !== Math.round(value)) {
    showSnackbar.warn("请输入非负整数");
    return;
  }
  if (value > SHARE_MAX) {
    showSnackbar.error(`阈值不能大于${SHARE_MAX}MB!`);
    return;
  }
  if (value === shareDefaultFile.value) {
    model.value = false;
    showSnackbar.cancel("未修改分享设置");
    return;
  }
  shareDefaultFile.value = value;
  model.value = false;
  showSnackbar.success(`成功修改分享设置!新阈值为${value}MB`);
}

async function handleSliderEnd(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  clickOuter.value = true;
}
</script>

<style lang="scss" scoped>
.tcss-heading {
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

.tcss-controls {
  display: flex;
  width: 100%;
  align-items: center;
  padding: 24px 8px 16px;
  gap: 20px;
}

.tcss-slider {
  min-width: 0;
  flex: 1;
}

.tcss-input {
  max-width: 128px;
  flex: 0 0 128px;

  :deep(.v-number-input__control .v-btn) {
    width: 32px;
    min-width: 32px;
    padding: 0;
  }

  :deep(.v-number-input__control .v-icon) {
    font-size: 18px;
  }

  :deep(.v-field__input) {
    font-size: 14px;
  }
}

.tcss-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.tcss-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.tcss-cancel,
.tcss-confirm {
  border-radius: 4px;
  font-family: var(--font-text);
}

.tcss-cancel {
  color: var(--box-text-2);
}

.tcss-confirm {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
