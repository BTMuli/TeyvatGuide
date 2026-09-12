<!-- 背包材料更新记录折线图 -->
<template>
  <div ref="chartContainer" class="pbmrc-chart">
    <VChart v-if="colors.text" :option="options" autoresize />
  </div>
</template>

<script lang="ts" setup>
import useAppStore from "@store/app.js";
import fmtUtil from "@utils/fmtUtil.js";
import { colord } from "colord";
import type { EChartsOption } from "echarts";
import { LineChart } from "echarts/charts.js";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components.js";
import { use } from "echarts/core.js";
import { CanvasRenderer } from "echarts/renderers.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import VChart from "vue-echarts";

use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps<{ records: Array<TGApp.Sqlite.UserBag.MaterialRecord> }>();
const { theme } = storeToRefs(useAppStore());
const chartContainer = useTemplateRef<HTMLDivElement>("chartContainer");
const colors = shallowRef({ line: "", background: "", text: "", grid: "" });
const records = computed<Array<TGApp.Sqlite.UserBag.MaterialRecord>>(() =>
  [...props.records].sort((a, b) => a.time - b.time),
);
const options = computed<EChartsOption>(() => {
  const minimumValue = records.value.reduce(
    (min, item) => Math.min(min, item.count),
    records.value[0]?.count ?? 0,
  );
  const minimum = Math.max(0, Math.floor(minimumValue / 5) * 5);
  const maximum = Math.max(
    minimum + 5,
    Math.ceil(records.value.reduce((max, item) => Math.max(max, item.count), 0) / 5) * 5,
  );
  const step = (maximum - minimum) / 5;
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: { left: 8, right: 12, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "axis",
      confine: true,
      renderMode: "richText",
      backgroundColor: colors.value.background,
      borderColor: colors.value.grid,
      textStyle: { color: colors.value.text, fontSize: 12 },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const record = records.value[point?.dataIndex ?? -1];
        if (!record) return "";
        return [
          fmtUtil.dateTime(record.time * 1000),
          `数量：${fmtUtil.num(record.count)}`,
          `导入类型：${record.manual ? "手动更新" : "自动导入"}`,
        ].join("\n");
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: records.value.map((record) => fmtUtil.dateTime(record.time * 1000)),
      axisLine: { onZero: false, lineStyle: { color: colors.value.grid, type: "solid" } },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: minimum,
      max: maximum,
      interval: step,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.value.text,
        fontSize: 11,
        showMaxLabel: false,
        formatter: (value: number) =>
          value >= 10000 ? fmtUtil.num(Math.round(value / 10000)) + "w" : fmtUtil.num(value),
      },
      splitLine: { show: false },
    },
    series: [
      {
        type: "line",
        data: records.value.map((record) => record.count),
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { color: colors.value.line, width: 2 },
        itemStyle: { color: colors.value.line },
        areaStyle: {
          opacity: 1,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colord(colors.value.line).alpha(0.45).toRgbString() },
              { offset: 1, color: colord(colors.value.background).alpha(0).toRgbString() },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: colors.value.grid, type: "dashed", width: 1 },
          data: [1, 2, 3, 4].map((index) => ({ yAxis: minimum + index * step })),
        },
      },
    ],
  };
});

function updateColors(): void {
  if (!chartContainer.value) return;
  const style = getComputedStyle(chartContainer.value);
  colors.value = {
    line: style.getPropertyValue("--tgc-od-orange").trim(),
    background: style.getPropertyValue("--box-bg-1").trim(),
    text: style.getPropertyValue("--box-text-2").trim(),
    grid: style.getPropertyValue("--common-shadow-2").trim(),
  };
}

onMounted(updateColors);
watch(theme, updateColors, { flush: "post" });
</script>

<style lang="scss" scoped>
.pbmrc-chart {
  width: 100%;
  min-width: 0;
  height: 176px;
}
</style>
