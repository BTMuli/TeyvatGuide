<!-- 祈愿日历图表组件 -->
<template>
  <v-chart
    class="gro-chart-calendar"
    :option="chartOptions"
    autoresize
    :theme="echartsTheme"
    :init-options="{ locale: 'ZH' }"
    :style="{ height: chartHeight }"
    v-if="chartOptions"
  />
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import TGachaCharts from "@utils/gachaCharts.js";
import { HeatmapChart } from "echarts/charts.js";
import {
  CalendarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
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
  HeatmapChart,
  CalendarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
]);

type GachaChartCalendarProps = { uid: string; gachaType?: string };

const props = defineProps<GachaChartCalendarProps>();
const { theme } = storeToRefs(useAppStore());

const chartOptions = shallowRef<EChartsOption>();
const yearCount = shallowRef<number>(1); // 默认至少1年，避免高度为0
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

// 根据年份数量动态计算高度，每个日历约160px，加上顶部空间
const chartHeight = computed<string>(() => {
  const baseHeight = 120; // 顶部工具栏和 visualMap 的空间
  const perYearHeight = 160; // 每个年份的日历高度
  const totalHeight = baseHeight + yearCount.value * perYearHeight;
  return `${totalHeight}px`;
});

onMounted(async () => {
  try {
    const options = await TGachaCharts.calendar(props.uid, props.gachaType);
    chartOptions.value = options;

    // 获取年份数量
    if (options.calendar && Array.isArray(options.calendar)) {
      yearCount.value = options.calendar.length || 1;
    }
  } catch (error) {
    console.error("Failed to load calendar chart:", error);
    // 保持默认值，显示基础高度
  }
});
</script>
<style lang="css" scoped>
.gro-chart-calendar {
  width: 100%;
  min-height: 400px;
}
</style>
