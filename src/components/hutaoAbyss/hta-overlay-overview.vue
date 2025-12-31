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
        :cur="props.data.cur.ScheduleId"
        :last="props.data.last.ScheduleId"
        :show-diff="false"
      />
      <HtaOverviewLine
        label="上传记录总数"
        :cur="props.data.cur.RecordTotal"
        :last="props.data.last.RecordTotal"
      />
      <div class="hta-oob-title">深渊数据统计</div>
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
      <div class="hta-oob-extra">更新于 {{ timestampToDate(props.data.cur.Timestamp) }}</div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { ref } from "vue";

import HtaOverviewLine from "./hta-overview-line.vue";

import type { AbyssDataItem } from "@/pages/WIKI/Abyss.vue";

type HtaOverlayOverviewProps = { data: AbyssDataItem<TGApp.Plugins.Hutao.Abyss.OverviewData> };

const props = defineProps<HtaOverlayOverviewProps>();
const visible = defineModel<boolean>();
const loadShare = ref<boolean>(false);

console.log(props.data);

async function share(): Promise<void> {
  loadShare.value = true;
  const shareEl = document.querySelector<HTMLElement>(".hta-oo-box");
  if (shareEl === null) {
    showSnackbar.warn("分享失败");
    loadShare.value = false;
    return;
  }
  const fileName = `深渊数据统计_${timestampToDate(props.data.cur.Timestamp)}.png`;
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
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 8px;
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
