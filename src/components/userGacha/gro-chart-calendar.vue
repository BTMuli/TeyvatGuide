<!-- 祈愿日历图表组件 -->
<template>
  <v-chart
    :key="`gro-chart-calendar-${echartsTheme}`"
    ref="chartRef"
    :init-options="{ locale: 'ZH' }"
    :option="chartOptions"
    :style="{ height: chartHeight }"
    :theme="echartsTheme"
    autoresize
    class="gro-chart-calendar"
  />
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { saveImgFile } from "@utils/TGShare.js";
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
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
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

type GachaChartCalendarProps = {
  uid: string;
  gachaType?: string;
  records: Array<TGApp.Sqlite.Gacha.Gacha>;
};

type EChartsOption = ComposeOption<
  | CalendarComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
  | ToolboxComponentOption
  | HeatmapSeriesOption
>;

const props = defineProps<GachaChartCalendarProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>();
const yearCount = shallowRef<number>(1); // 默认至少1年，避免高度为0
const chartEl = useTemplateRef<InstanceType<typeof VChart>>("chartRef");

const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

// 根据年份数量动态计算高度，每个日历约160px，加上顶部空间
const chartHeight = computed<string>(() => {
  const baseHeight = 120; // 顶部工具栏和 visualMap 的空间
  const perYearHeight = 160; // 每个年份的日历高度
  const totalHeight = baseHeight + yearCount.value * perYearHeight;
  return `${totalHeight}px`;
});

function groupRecordsByDate(
  records: Array<TGApp.Sqlite.Gacha.Gacha>,
): Record<string, Array<TGApp.Sqlite.Gacha.Gacha>> {
  const map: Record<string, Array<TGApp.Sqlite.Gacha.Gacha>> = {};
  const sorted = [...records].sort((a, b) => a.time.localeCompare(b.time));
  for (const item of sorted) {
    if (props.gachaType !== undefined && item.gachaType !== props.gachaType) continue;
    const key = item.time.split(" ")[0];
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

/**
 * @description 获取日历图表配置
 * @returns {EChartsOption}
 */
function getCalendarOptions(): EChartsOption {
  const records = groupRecordsByDate(props.records);
  // 只保留 yyyy-MM-dd 形式的日期键，避免脏时间（如 "NaN-NaN-NaN"）进入日历坐标系
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const validKeys = Object.keys(records).filter((key) => validDate.test(key));
  // 获取年份，只保留四位数字年份，避免 ECharts calendar range 非法导致渲染崩溃
  const years = Array.from(new Set(validKeys.map((key) => key.split("-")[0]))).filter((year) =>
    /^\d{4}$/.test(year),
  );
  // 获取最大长度，空数据时为 0
  const maxLen = validKeys.reduce((max, key) => Math.max(max, records[key].length), 0);

  function getYearData(year: string): Array<[string, number]> {
    const res: Array<[string, number]> = [];
    for (const key of validKeys) {
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
        saveAsImage: { show: false },
        myDownloadChart: {
          show: true,
          title: "下载图表",
          icon: "M12 4v12m-4-4l4 4 4-4",
          onclick: async () => {
            if (!chartEl.value) return;
            const chart = chartEl.value.chart;
            if (!chart) return;
            const dataUrl = chart.getDataURL({
              pixelRatio: 2,
              backgroundColor: theme.value === "dark" ? "#2c343c" : "#ffffff",
              excludeComponents: ["toolbox"],
            });
            await saveImgFile(dataUrl, `gacha-chart-calendar-${props.uid}`);
          },
        },
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
    calendar: years.map((year, index) => ({
      range: year,
      cellSize: ["auto", 15],
      top: 150 * index + 80,
      right: 12,
    })),
    series: years.map((year, index) => ({
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: index,
      data: getYearData(year),
    })),
  };
}

function loadChartData(): void {
  try {
    const options = getCalendarOptions();
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

onMounted(() => {
  loadChartData();
});

watch(
  () => <const>[props.uid, props.gachaType, props.records],
  () => {
    loadChartData();
  },
);
</script>
<style lang="css" scoped>
.gro-chart-calendar {
  width: 100%;
  min-height: 400px;
}
</style>
