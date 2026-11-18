<template>
  <div ref="shareRef" class="hta-oo-box">
    <header class="hta-oob-header">
      <div aria-hidden="true" class="hta-oob-icon">
        <v-icon icon="mdi-chart-box-outline" size="22" />
      </div>
      <div class="hta-oob-heading">
        <h3>数据概况</h3>
        <div class="hta-oob-updated">
          <v-icon aria-hidden="true" icon="mdi-clock-outline" size="14" />
          <span>更新于 {{ fmtUtil.dateTime(props.data.cur.Timestamp) }}</span>
        </div>
      </div>
      <v-btn
        :loading="loadShare"
        aria-label="分享数据概况"
        class="hta-oob-share"
        data-html2canvas-ignore
        icon="mdi-share-variant"
        size="32"
        title="分享数据概况"
        type="button"
        variant="text"
        @click="share()"
      />
    </header>
    <div class="hta-oob-body">
      <dl aria-label="数据收集" class="hta-oob-metrics">
        <HtaOverviewLine
          :cur="props.data.cur.ScheduleId"
          :last="props.data.last.ScheduleId"
          :show-diff="false"
          label="当期深渊ID"
        />
        <HtaOverviewLine
          :cur="props.data.cur.RecordTotal"
          :last="props.data.last.RecordTotal"
          label="上传记录总数"
        />
      </dl>
      <section class="hta-oob-section">
        <h4 class="hta-oob-title">深渊统计</h4>
        <dl class="hta-oob-metrics">
          <HtaOverviewLine
            :cur="props.data.cur.SpiralAbyssTotal"
            :last="props.data.last.SpiralAbyssTotal"
            label="总计深渊记录"
          />
          <HtaOverviewLine
            :cur="props.data.cur.SpiralAbyssPassed"
            :last="props.data.last.SpiralAbyssPassed"
            label="通关深渊记录"
          />
          <HtaOverviewLine
            :cur="props.data.cur.SpiralAbyssFullStar"
            :last="props.data.last.SpiralAbyssFullStar"
            label="满星深渊记录"
          />
        </dl>
        <dl class="hta-oob-metrics">
          <HtaOverviewLine
            :cur="props.data.cur.SpiralAbyssStarTotal / props.data.cur.SpiralAbyssTotal"
            :last="props.data.last.SpiralAbyssStarTotal / props.data.last.SpiralAbyssTotal"
            label="平均获取渊星"
          />
          <HtaOverviewLine
            :cur="props.data.cur.SpiralAbyssBattleTotal / props.data.cur.SpiralAbyssTotal"
            :last="props.data.last.SpiralAbyssBattleTotal / props.data.last.SpiralAbyssTotal"
            label="平均战斗次数"
          />
        </dl>
      </section>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { generateShareImg } from "@utils/share/TGShare.js";
import { ref, useTemplateRef } from "vue";

import HtaOverviewLine from "./hta-overview-line.vue";

type HtaOverlayOverviewProps = {
  data: TGApp.Plugins.Hutao.Abyss.PeriodData<TGApp.Plugins.Hutao.Abyss.OverviewData>;
};

const props = defineProps<HtaOverlayOverviewProps>();
const loadShare = ref<boolean>(false);
const shareEl = useTemplateRef<HTMLElement>("shareRef");

async function share(): Promise<void> {
  loadShare.value = true;
  if (shareEl.value === null) {
    showSnackbar.warn("分享失败");
    loadShare.value = false;
    return;
  }
  const fileName = `深渊数据统计_${fmtUtil.dateTime(props.data.cur.Timestamp)}`;
  await generateShareImg(fileName, shareEl.value, 2);
  loadShare.value = false;
}
</script>
<style lang="scss" scoped>
.hta-oo-box {
  --hta-diff-up: var(--tgc-od-red);
  --hta-diff-down: var(--tgc-od-green);

  overflow: hidden;
  width: 340px;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 4px 12px var(--common-shadow-1);
}

html.default .hta-oo-box {
  --hta-diff-up: #a4262cff;
  --hta-diff-down: #386626ff;
}

.hta-oob-header {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--dialog-header-bg);
  gap: 8px;
}

.hta-oob-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--common-text-title);
  place-items: center;
}

.hta-oob-heading {
  min-width: 0;
  flex: 1;
}

.hta-oob-heading h3 {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 24px;
}

.hta-oob-updated {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
}

.hta-oob-share {
  flex-shrink: 0;
  color: var(--box-text-2);
}

.hta-oob-body {
  display: grid;
  padding: 12px;
  background: var(--box-bg-1);
  gap: 8px;
}

.hta-oob-section {
  display: grid;
  gap: 8px;
}

.hta-oob-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.hta-oob-metrics {
  display: grid;
  margin: 0;
  gap: 8px;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
}
</style>
