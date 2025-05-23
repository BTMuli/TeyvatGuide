<template>
  <div class="gro-chart">
    <div class="gro-chart-options">
      <v-select
        class="gro-chart-select"
        v-model="curChartType"
        :items="chartTypes"
        item-title="label"
        item-value="value"
        label="选择图表"
        density="compact"
        outlined
        hide-details
        width="200px"
      />
    </div>
    <v-chart
      :option="chartOptions"
      autoresize
      :theme="echartsTheme"
      :init-options="{ locale: 'ZH' }"
      v-if="chartOptions"
    />
  </div>
</template>
<script lang="ts" setup>
// about import err,see:https://github.com/apache/echarts/issues/19992
import showLoading from "@comp/func/loading.js";
import useAppStore from "@store/app.js";
import TGachaCharts from "@utils/gachaCharts.js";
import { BarChart, HeatmapChart, PieChart } from "echarts/charts.js";
import {
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components.js";
import { use } from "echarts/core.js";
import { LabelLayout } from "echarts/features.js";
import { CanvasRenderer } from "echarts/renderers.js";
import type { EChartsOption } from "echarts/types/dist/shared.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";
import VChart from "vue-echarts";

// echarts
use([
  LabelLayout,
  CanvasRenderer,

  BarChart,
  HeatmapChart,
  PieChart,

  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
]);

type GachaOverviewEchartsProps = { uid: string; gachaType?: string };
type ChartsType = "overview" | "calendar" | "stackBar";
type ChartItem = { label: string; value: ChartsType };

const props = defineProps<GachaOverviewEchartsProps>();
const { theme } = storeToRefs(useAppStore());
const chartTypes: Array<ChartItem> = [
  { label: "祈愿分析", value: "overview" },
  { label: "祈愿日历", value: "calendar" },
  { label: "祈愿柱状图", value: "stackBar" },
];

const curChartType = ref<ChartsType>("overview");
const chartOptions = shallowRef<EChartsOption>();
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

watch(
  () => curChartType.value,
  () => {
    getOptions();
  },
  { immediate: true },
);

async function getOptions(): Promise<void> {
  await showLoading.start("加载中...");
  switch (curChartType.value) {
    case "overview":
      chartOptions.value = await TGachaCharts.overview(props.uid);
      break;
    case "calendar":
      chartOptions.value = await TGachaCharts.calendar(props.uid, props.gachaType);
      break;
    case "stackBar":
      chartOptions.value = await TGachaCharts.stackBar(props.uid, props.gachaType);
      break;
  }
  await showLoading.end();
}
</script>
<style lang="css" scoped>
.gro-chart {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow-y: auto;
}

.gro-chart-options {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: auto;
  gap: 10px;
}

.gro-chart-select {
  width: 150px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}
</style>
