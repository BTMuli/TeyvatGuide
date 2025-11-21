<!-- 祈愿分析图表组件 -->
<template>
  <v-chart
    class="gro-chart-overview"
    :option="chartOptions"
    autoresize
    :theme="echartsTheme"
    :init-options="{ locale: 'ZH' }"
    v-if="chartOptions"
  />
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import TGachaCharts from "@utils/gachaCharts.js";
import { BarChart, PieChart } from "echarts/charts.js";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from "echarts/components.js";
import { use } from "echarts/core.js";
import { LabelLayout } from "echarts/features.js";
import { CanvasRenderer } from "echarts/renderers.js";
import type { EChartsOption } from "echarts/types/dist/shared.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef } from "vue";
import VChart from "vue-echarts";

use([
  LabelLayout,
  CanvasRenderer,
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
]);

type GachaChartOverviewProps = { uid: string };

const props = defineProps<GachaChartOverviewProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>();
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

onMounted(async () => {
  chartOptions.value = await TGachaCharts.overview(props.uid);
});
</script>
<style lang="css" scoped>
.gro-chart-overview {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>
