<!-- 祈愿柱状图组件 -->
<template>
  <v-chart
    ref="chartRef"
    class="gro-chart-stackbar"
    :option="chartOptions"
    autoresize
    :theme="echartsTheme"
    :init-options="{ locale: 'ZH' }"
    :key="`gro-chart-stackbar-${echartsTheme}`"
  />
</template>
<script lang="ts" setup>
import TSUserGacha from "@Sqlm/userGacha.js";
import useAppStore from "@store/app.js";
import { getImageBuffer, saveCanvasImg } from "@utils/TGShare.js";
import type { BarSeriesOption } from "echarts/charts.js";
import { BarChart } from "echarts/charts.js";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from "echarts/components.js";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
} from "echarts/components.js";
import type { ComposeOption, EChartsType } from "echarts/core.js";
import { use } from "echarts/core.js";
import { LabelLayout } from "echarts/features.js";
import { CanvasRenderer } from "echarts/renderers.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
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

type EChartsOption = ComposeOption<
  | BarSeriesOption
  | TooltipComponentOption
  | ToolboxComponentOption
  | LegendComponentOption
  | GridComponentOption
  | DataZoomComponentOption
>;

const props = defineProps<GachaChartStackBarProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>({});
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));
const chartEl = useTemplateRef<InstanceType<typeof VChart>>("chartRef");

/**
 * @description 堆叠柱状图
 * @returns {EChartsOption}
 */
async function getStackBarOptions(): Promise<EChartsOption> {
  const records = await TSUserGacha.getGachaRecordsGroupByDate(props.uid, props.gachaType);
  const dataCount = Object.keys(records).length;
  const xAxis = {
    type: <const>"category",
    data: Object.keys(records),
    axisTick: { alignWithLabel: true },
    axisLine: { show: true, lineStyle: { color: "#000" } },
    axisLabel: {
      rotate: 45,
      interval: 4,
      fontSize: 12,
      fontFamily: "var(--font-title)",
    },
    axisPointer: { type: <const>"shadow" },
  };
  const temp5 = [];
  const temp4 = [];
  const temp3 = [];
  for (const key in records) {
    const gachaLogs = records[key];
    const star5 = gachaLogs.filter((r) => r.rank === "5").length;
    const star4 = gachaLogs.filter((r) => r.rank === "4").length;
    const star3 = gachaLogs.filter((r) => r.rank === "3").length;
    temp5.push(star5);
    temp4.push(star4);
    temp3.push(star3);
  }
  const series: Array<BarSeriesOption> = [
    { data: temp5, type: "bar", stack: "a", name: "五星数量" },
    { data: temp4, type: "bar", stack: "a", name: "四星数量" },
    { data: temp3, type: "bar", stack: "a", name: "三星数量" },
  ];

  // 添加 dataZoom 组件以支持数据量大时的缩放和滚动
  const dataZoom =
    dataCount > 100
      ? [
          {
            type: <const>"slider",
            show: true,
            xAxisIndex: [0],
            start: Math.max(0, ((dataCount - 100) / dataCount) * 100),
            end: 100,
            bottom: "5%",
          },
          {
            type: <const>"inside",
            xAxisIndex: [0],
            start: Math.max(0, ((dataCount - 100) / dataCount) * 100),
            end: 100,
          },
        ]
      : undefined;

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    toolbox: {
      show: true,
      feature: {
        restore: {},
        saveAsImage: { show: false },
        myDownloadChart: {
          show: true,
          title: "下载图表",
          icon: "M12 4v12m-4-4l4 4 4-4",
          onclick: async () => {
            if (!chartEl.value) return;
            const chart: EChartsType = chartEl.value.chart;
            if (!chart) return;
            const dataUrl = chart.getDataURL({
              pixelRatio: 2,
              backgroundColor: theme.value === "dark" ? "#2c343c" : "#ffffff",
              excludeComponents: ["toolbox"],
            });
            const buffer = await getImageBuffer(dataUrl);
            await saveCanvasImg(buffer, `gacha-overview-${props.uid}`);
          },
        },
      },
    },
    legend: { data: ["三星数量", "四星数量", "五星数量"] },
    xAxis,
    yAxis: { type: "value" },
    series,
    dataZoom,
    grid: { left: "3%", right: "3%", bottom: dataZoom ? "15%" : "3%", top: "10%" },
  };
}

async function loadChartData(): Promise<void> {
  chartOptions.value = await getStackBarOptions();
}

onMounted(async () => {
  await loadChartData();
});

// 监听 uid 和 gachaType 变化，重新加载数据
watch(
  () => [props.uid, props.gachaType],
  async () => {
    await loadChartData();
  },
);
</script>
<style lang="css" scoped>
.gro-chart-stackbar {
  width: 100%;
  height: 100%;
  min-height: 500px;
}
</style>
