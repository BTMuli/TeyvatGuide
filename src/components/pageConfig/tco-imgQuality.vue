<!-- 设置图片质量浮窗 -->
<template>
  <TOverlay v-model="model" :outer-close="clickOuter" blur-val="10px">
    <div class="toi-box">
      <div class="toi-top">
        <div class="toi-title">调整图片质量</div>
        <div class="toi-desc">设置图片质量，数值越大图片越清晰，但也会占用更多空间</div>
      </div>
      <div class="toi-mid">
        <v-slider
          v-model="quality"
          :max="100"
          :min="5"
          :step="1"
          color="var(--tgc-od-blue)"
          hide-details
          thumb-color="var(--tgc-od-red)"
          thumb-label="always"
          @end="handleSliderEnd"
          @start="() => (clickOuter = false)"
        />
        <v-number-input
          v-model="quality"
          :max="100"
          :min="5"
          :step="1"
          class="toi-input"
          control-variant="stacked"
          density="compact"
          type="number"
          variant="outlined"
          width="100px"
        />
      </div>
      <div class="toi-bottom">
        <v-btn class="toi-btn no-btn" variant="flat" @click="onCancel()">取消</v-btn>
        <v-btn class="toi-btn ok-btn" variant="elevated" @click="onConfirm()">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";

const { imageQualityPercent } = storeToRefs(useAppStore());

const model = defineModel<boolean>({ default: false });
const quality = ref<number>(imageQualityPercent.value);
const clickOuter = ref<boolean>(true);

function onCancel(): void {
  model.value = false;
  quality.value = imageQualityPercent.value;
}

async function onConfirm(): Promise<void> {
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
.toi-box {
  display: flex;
  width: 400px;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 12px;
}

.toi-top {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  row-gap: 4px;
  text-align: center;

  .toi-title {
    color: var(--common-text-title);
    font-size: 20px;
  }

  .toi-desc {
    font-family: var(--font-text);
    font-size: 12px;
  }
}

.toi-mid {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding-left: 12px;
  margin-top: 24px;
  margin-bottom: 24px;
  column-gap: 24px;

  .toi-input {
    max-width: 100px;
    height: 48px;
  }
}

.toi-bottom {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.toi-btn {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px 20px;
  border-radius: 24px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  cursor: pointer;
  font-family: var(--font-title);
}
</style>
