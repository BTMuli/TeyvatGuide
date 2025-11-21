<!-- 祈愿日历图表组件 -->
<template>
  <v-chart
    class="gro-chart-calendar"
    :option="chartOptions"
    autoresize
    :theme="echartsTheme"
    :init-options="{ locale: 'ZH' }"
    :style="{ height: chartHeight }"
  />
</template>
<script lang="ts" setup>
import TSUserGacha from "@Sqlm/userGacha.js";
import useAppStore from "@store/app.js";
import type { HeatmapSeriesOption } from "echarts/charts.js";
import { HeatmapChart } from "echarts/charts.js";
import type {
  CalendarComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from "echarts/components.js";
import {
  CalendarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components.js";
import type { ComposeOption } from "echarts/core.js";
import { use } from "echarts/core.js";
import { LabelLayout } from "echarts/features.js";
import { CanvasRenderer } from "echarts/renderers.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef, watch } from "vue";
import VChart from "vue-echarts";

use([
  LabelLayout,
  CanvasRenderer,
  HeatmapChart,
  CalendarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
]);

type GachaChartCalendarProps = { uid: string; gachaType?: string };

type EChartsOption = ComposeOption<
  | CalendarComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
  | ToolboxComponentOption
  | HeatmapSeriesOption
>;

const props = defineProps<GachaChartCalendarProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>({});
const yearCount = shallowRef<number>(1); // 默认至少1年，避免高度为0
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

// 根据年份数量动态计算高度，每个日历约160px，加上顶部空间
const chartHeight = computed<string>(() => {
  const baseHeight = 120; // 顶部工具栏和 visualMap 的空间
  const perYearHeight = 160; // 每个年份的日历高度
  const totalHeight = baseHeight + yearCount.value * perYearHeight;
  return `${totalHeight}px`;
});

/**
 * @description 获取日历图表配置
 * @returns {EChartsOption}
 */
async function getCalendarOptions(): Promise<EChartsOption> {
  const records = await TSUserGacha.getGachaRecordsGroupByDate(props.uid, props.gachaType);
  // 获取最大长度
  const maxLen = Math.max(...Object.values(records).map((v) => v.length));
  // 获取年份
  const yearsSet = new Set(Object.keys(records).map((v) => v.split("-")[0]));

  function getYearData(year: string): [string, number][] {
    const res: [string, number][] = [];
    for (const key in records) {
      if (key.startsWith(year)) res.push([key, records[key].length]);
    }
    return res;
  }

  return {
    tooltip: { position: "top" },
    toolbox: {
      show: true,
      feature: {
        restore: {},
        saveAsImage: { pixelRatio: 2 },
      },
    },
    visualMap: {
      min: 0,
      max: maxLen,
      calculable: true,
      orient: "horizontal",
      left: "center",
      top: "top",
    },
    calendar: Array.from(yearsSet).map((year, index) => ({
      range: year,
      cellSize: ["auto", 15],
      top: 150 * index + 80,
      right: 12,
    })),
    series: Array.from(yearsSet).map((year, index) => ({
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: index,
      data: getYearData(year),
    })),
  };
}

async function loadChartData(): Promise<void> {
  try {
    const options = await getCalendarOptions();
    chartOptions.value = options;

    // 获取年份数量
    if (options.calendar && Array.isArray(options.calendar)) {
      yearCount.value = options.calendar.length || 1;
    }
  } catch (error) {
    console.error("Failed to load calendar chart:", error);
    // 保持默认值，显示基础高度
  }
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
.gro-chart-calendar {
  width: 100%;
  min-height: 400px;
}
</style>
