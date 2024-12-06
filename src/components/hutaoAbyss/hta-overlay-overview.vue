<template>
  <TOverlay v-model="visible">
    <div class="hta-oo-box">
      <v-btn
        :loading="loadShare"
        class="hta-oob-share"
        @click="share()"
        data-html2canvas-ignore
        variant="flat"
        icon="mdi-share-variant"
        size="24px"
      />
      <div class="hta-oob-title">数据收集统计</div>
      <HtaOverviewLine
        label="当期深渊ID"
        :cur="dataCur.ScheduleId"
        :last="dataLast.ScheduleId"
        :show-diff="false"
      />
      <HtaOverviewLine
        label="上传记录总数"
        :cur="dataCur.RecordTotal"
        :last="dataLast.RecordTotal"
      />
      <div class="hta-oob-title">深渊数据统计</div>
      <HtaOverviewLine
        label="总计深渊记录"
        :cur="dataCur.SpiralAbyssTotal"
        :last="dataLast.SpiralAbyssTotal"
      />
      <HtaOverviewLine
        label="通关深渊记录"
        :cur="dataCur.SpiralAbyssPassed"
        :last="dataLast.SpiralAbyssPassed"
      />
      <HtaOverviewLine
        label="满星深渊记录"
        :cur="dataCur.SpiralAbyssFullStar"
        :last="dataLast.SpiralAbyssFullStar"
      />
      <HtaOverviewLine
        label="平均获取渊星"
        :cur="dataCur.SpiralAbyssStarTotal / dataCur.SpiralAbyssTotal"
        :last="dataLast.SpiralAbyssStarTotal / dataLast.SpiralAbyssTotal"
      />
      <HtaOverviewLine
        label="平均战斗次数"
        :cur="dataCur.SpiralAbyssBattleTotal / dataCur.SpiralAbyssTotal"
        :last="dataLast.SpiralAbyssBattleTotal / dataLast.SpiralAbyssTotal"
      />
      <div class="hta-oob-extra">更新于 {{ timestampToDate(props.data.cur.Timestamp) }}</div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";

import { AbyssDataItem } from "../../pages/WIKI/Abyss.vue";
import { generateShareImg } from "../../utils/TGShare.js";
import { timestampToDate } from "../../utils/toolFunc.js";
import TOverlay from "../app/t-overlay.vue";
import showSnackbar from "../func/snackbar.js";

import HtaOverviewLine from "./hta-overview-line.vue";

type HtaOverlayOverviewProps = {
  modelValue: boolean;
  data: AbyssDataItem<TGApp.Plugins.Hutao.Abyss.OverviewData>;
};
type HtaOverlayOverviewEmits = (e: "update:modelValue", v: boolean) => void;

const props = defineProps<HtaOverlayOverviewProps>();
const emits = defineEmits<HtaOverlayOverviewEmits>();
const loadShare = ref<boolean>(false);
const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (v) => emits("update:modelValue", v),
});
const dataCur = computed(() => props.data.cur);
const dataLast = computed(() => props.data.last);

async function share(): Promise<void> {
  loadShare.value = true;
  const shareEl = document.querySelector<HTMLElement>(".hta-oo-box");
  if (shareEl === null) {
    showSnackbar.warn("分享失败");
    loadShare.value = false;
    return;
  }
  const fileName = `深渊数据统计_${timestampToDate(dataCur.value.Timestamp)}.png`;
  await generateShareImg(fileName, shareEl, 2);
  loadShare.value = false;
}
</script>
<style lang="css" scoped>
.hta-oo-box {
  position: relative;
  display: flex;
  width: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 8px;
}

.hta-oob-share {
  position: absolute;
  top: 8px;
  right: 8px;
}

.hta-oob-title {
  width: 100%;
  border-bottom: 1px solid var(--common-shadow-4);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.hta-oob-extra {
  position: absolute;
  z-index: -1;
  right: 4px;
  bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
}
</style>
