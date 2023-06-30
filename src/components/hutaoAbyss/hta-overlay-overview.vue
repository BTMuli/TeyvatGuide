<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="0px">
    <div class="hta-oo-box">
      <div class="hta-oob-title">数据收集统计</div>
      <div class="hta-oob-item">
        <span>当期深渊ID</span>
        <span>{{ props.data.scheduleId }}</span>
        <span>上传记录总数</span>
        <span>{{ props.data.recordTotal }}</span>
      </div>
      <div class="hta-oob-title">深渊数据统计</div>
      <div class="hta-oob-item">
        <span>总计深渊记录</span>
        <span>{{ props.data.spiralAbyssTotal }}</span>
        <span>通关深渊记录</span>
        <span>{{ props.data.spiralAbyssPassed }}</span>
        <span>满星深渊记录</span>
        <span>{{ props.data.spiralAbyssFullStar }}</span>
        <span>平均获取渊星</span>
        <span>{{
          (props.data.spiralAbyssStarTotal / props.data.spiralAbyssTotal).toFixed(2)
        }}</span>
        <span>平均战斗次数</span>
        <span>{{
          (props.data.spiralAbyssBattleTotal / props.data.spiralAbyssTotal).toFixed(2)
        }}</span>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TOverlay from "../main/t-overlay.vue";

interface HtaOverlayOverviewProps {
  modelValue: boolean;
  data: TGApp.Plugins.Hutao.Abyss.OverviewData;
}

interface HtaOverlayOverviewEmits {
  (e: "update:modelValue", value: boolean): void;
  (e: "cancel"): void;
}

const props = defineProps<HtaOverlayOverviewProps>();
const emits = defineEmits<HtaOverlayOverviewEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});

function onCancel() {
  visible.value = false;
  emits("cancel");
}
</script>
<style lang="css" scoped>
.hta-oo-box {
  width: 300px;
  padding: 10px;
  border-radius: 5px;
  background: rgb(255 255 255/50%);
}

.hta-oo-box:nth-child(3) {
  margin-top: 10px;
}

.hta-oob-title {
  font-family: var(--font-title);
  font-size: 20px;
  color: #393b40;
  border-bottom: 1px solid #393b40;
}

.hta-oob-item {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 5px;
  justify-content: space-between;
  align-items: center;
}

.hta-oob-item :nth-child(2n-1) {
  text-align: left;
  font-family: var(--font-title);
  color: var(--common-color-blue);
  font-size: 16px;
}

.hta-oob-item :nth-child(2n) {
  text-align: right;
  color: var(--common-color-white);
  text-shadow: 0 0 10px rgb(0 0 0/50%);
  font-size: 14px;
}
</style>
