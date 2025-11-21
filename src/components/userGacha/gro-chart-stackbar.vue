<!-- 祈愿柱状图组件 -->
<template>
  <v-chart
    class="gro-chart-stackbar"
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
import { BarChart } from "echarts/charts.js";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
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
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
]);

type GachaChartStackBarProps = { uid: string; gachaType?: string };

const props = defineProps<GachaChartStackBarProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>();
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

onMounted(async () => {
  chartOptions.value = await TGachaCharts.stackBar(props.uid, props.gachaType);
});
</script>
<style lang="css" scoped>
.gro-chart-stackbar {
  width: 100%;
  height: 100%;
  min-height: 500px;
}
</style>
