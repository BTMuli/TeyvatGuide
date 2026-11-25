<!-- 设置图片质量浮窗 -->
<template>
  <TopOverlay
    v-model="model"
    :outerClose="clickOuter"
    blurVal="10px"
    closeAriaLabel="关闭图片质量调整"
    contentMaxHeight="none"
    panelWidth="520px"
    :showShare="false"
    :titleId
    @close="onCancel"
  >
    <template #header>
      <div class="toi-heading">
        <h2 :id="titleId">调整图片质量</h2>
        <p>设置图片质量，数值越大图片越清晰，但也会占用更多空间</p>
      </div>
    </template>

    <div class="toi-controls">
      <UcLevelSlider
        v-model="quality"
        :current="QUALITY_MIN"
        :levels="QUALITY_LEVELS"
        :max="QUALITY_MAX"
        :min="QUALITY_MIN"
        class="toi-level-slider"
        compact
        single
        targetLabel="质量"
        valuePrefix=""
        valueSuffix="%"
        @end="handleSliderEnd"
        @start="clickOuter = false"
      />
      <v-number-input
        v-model="quality"
        :max="QUALITY_MAX"
        :min="QUALITY_SELECTABLE_MIN"
        :step="1"
        class="toi-input"
        control-variant="split"
        density="compact"
        type="number"
        variant="outlined"
        width="128px"
      />
    </div>

    <template #footerStart>可调范围 5%–100%</template>

    <template #footer>
      <v-btn variant="text" @click="onCancel">取消</v-btn>
      <v-btn prepend-icon="mdi-check" variant="flat" @click="onConfirm">确定</v-btn>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { ref, useId } from "vue";

const QUALITY_MIN = 0;
const QUALITY_SELECTABLE_MIN = 5;
const QUALITY_MAX = 100;
const QUALITY_LEVELS = Array.from(
  { length: QUALITY_MAX - QUALITY_SELECTABLE_MIN + 1 },
  (_, index) => QUALITY_SELECTABLE_MIN + index,
);

const { imageQualityPercent } = storeToRefs(useAppStore());

const model = defineModel<boolean>({ default: false });
const quality = ref<number>(imageQualityPercent.value);
const clickOuter = ref<boolean>(true);
const titleId = useId();

function onCancel(): void {
  model.value = false;
  quality.value = imageQualityPercent.value;
}

function onConfirm(): void {
  if (quality.value === imageQualityPercent.value) {
    model.value = false;
    showSnackbar.info(`图片质量未修改`);
    return;
  }
  imageQualityPercent.value = quality.value;
  model.value = false;
  showSnackbar.success(`图片质量已修改为 ${quality.value}%`);
}

async function handleSliderEnd(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  clickOuter.value = true;
}
</script>
<style lang="scss" scoped>
.toi-heading {
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

.toi-controls {
  display: flex;
  width: 100%;
  align-items: center;
  padding: 24px 8px 16px;
  gap: 20px;
}

.toi-level-slider {
  min-width: 0;
  flex: 1;
}

.toi-input {
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
</style>
