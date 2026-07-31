<template>
  <div ref="shareEl" class="hta-oo-box">
    <div class="hta-oob-header">
      <div class="hta-oob-heading">
        <v-icon icon="mdi-chart-box-outline" />
        <span>数据概况</span>
      </div>
      <v-btn
        :loading="loadShare"
        class="hta-oob-share"
        data-html2canvas-ignore
        icon="mdi-share-variant"
        size="28"
        title="分享数据概况"
        variant="text"
        @click="share()"
      />
    </div>
    <div class="hta-oob-section">
      <div class="hta-oob-title">数据收集</div>
      <HtaOverviewLine
        label="当期深渊ID"
        :cur="props.data.cur.ScheduleId"
        :last="props.data.last.ScheduleId"
        :show-diff="false"
      />
      <HtaOverviewLine
        label="上传记录总数"
        :cur="props.data.cur.RecordTotal"
        :last="props.data.last.RecordTotal"
      />
    </div>
    <div class="hta-oob-section">
      <div class="hta-oob-title">深渊统计</div>
      <HtaOverviewLine
        label="总计深渊记录"
        :cur="props.data.cur.SpiralAbyssTotal"
        :last="props.data.last.SpiralAbyssTotal"
      />
      <HtaOverviewLine
        label="通关深渊记录"
        :cur="props.data.cur.SpiralAbyssPassed"
        :last="props.data.last.SpiralAbyssPassed"
      />
      <HtaOverviewLine
        label="满星深渊记录"
        :cur="props.data.cur.SpiralAbyssFullStar"
        :last="props.data.last.SpiralAbyssFullStar"
      />
      <HtaOverviewLine
        label="平均获取渊星"
        :cur="props.data.cur.SpiralAbyssStarTotal / props.data.cur.SpiralAbyssTotal"
        :last="props.data.last.SpiralAbyssStarTotal / props.data.last.SpiralAbyssTotal"
      />
      <HtaOverviewLine
        label="平均战斗次数"
        :cur="props.data.cur.SpiralAbyssBattleTotal / props.data.cur.SpiralAbyssTotal"
        :last="props.data.last.SpiralAbyssBattleTotal / props.data.last.SpiralAbyssTotal"
      />
    </div>
    <div class="hta-oob-extra">
      <v-icon icon="mdi-clock-outline" size="14" />
      <span>更新于 {{ timestampToDate(props.data.cur.Timestamp) }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { ref } from "vue";

import HtaOverviewLine from "./hta-overview-line.vue";

type HtaOverlayOverviewProps = {
  data: TGApp.Plugins.Hutao.Abyss.PeriodData<TGApp.Plugins.Hutao.Abyss.OverviewData>;
};

const props = defineProps<HtaOverlayOverviewProps>();
const loadShare = ref<boolean>(false);
const shareEl = ref<HTMLElement>();

async function share(): Promise<void> {
  loadShare.value = true;
  if (shareEl.value === undefined) {
    showSnackbar.warn("分享失败");
    loadShare.value = false;
    return;
  }
  const fileName = `深渊数据统计_${timestampToDate(props.data.cur.Timestamp)}.png`;
  await generateShareImg(fileName, shareEl.value, 2);
  loadShare.value = false;
}
</script>
<style lang="css" scoped>
.hta-oo-box {
  display: flex;
  width: 340px;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  row-gap: 10px;
}

.hta-oob-header {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-2);
}

.hta-oob-heading {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  gap: 6px;
}

.hta-oob-share {
  color: var(--box-text-2);
}

.hta-oob-section {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--box-bg-2);
  row-gap: 6px;
}

.hta-oob-title {
  width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
}

.hta-oob-extra {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
}
</style>
