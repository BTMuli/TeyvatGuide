<!-- 背包材料更新记录趋势与差值图 -->
<template>
  <div ref="chartContainer" class="pbmrc-chart">
    <div v-if="props.daily && props.diff && records.length < 2" class="pbmrc-empty">
      至少需要两天记录才能计算日净变化
    </div>
    <VChart
      v-else-if="colors.text"
      :option="options"
      :updateOptions="{ notMerge: true }"
      autoresize
      @click="selectRecord"
    />
  </div>
</template>

<script lang="ts" setup>
import useAppStore from "@store/app.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import {
  getMaterialRecordChanges,
  getMaterialRecordDailySnapshots,
  getMaterialRecordLogScale,
  restoreMaterialRecordLogValue,
} from "@utils/game/materialRecord.js";
import { colord } from "colord";
import type { ECElementEvent, EChartsOption } from "echarts";
import { BarChart, LineChart } from "echarts/charts.js";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components.js";
import { use } from "echarts/core.js";
import { CanvasRenderer } from "echarts/renderers.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import VChart from "vue-echarts";

use([BarChart, LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const props = withDefaults(
  defineProps<{
    records: Array<TGApp.Sqlite.UserBag.MaterialRecord>;
    diff?: boolean;
    daily?: boolean;
    logScale?: boolean;
  }>(),
  { diff: false, daily: false, logScale: false },
);
const emits = defineEmits<{ selectRecord: [record: TGApp.Sqlite.UserBag.MaterialRecord] }>();
const { theme } = storeToRefs(useAppStore());
const chartContainer = useTemplateRef<HTMLDivElement>("chartContainer");
const colors = shallowRef({
  line: "",
  increase: "",
  decrease: "",
  background: "",
  text: "",
  grid: "",
});
const records = computed<Array<TGApp.Sqlite.UserBag.MaterialRecord>>(() =>
  props.daily
    ? getMaterialRecordDailySnapshots(props.records)
    : [...props.records].sort((a, b) => a.time - b.time),
);
const changes = computed<ReturnType<typeof getMaterialRecordChanges>>(() =>
  getMaterialRecordChanges(records.value),
);
const displayedRecords = computed<Array<TGApp.Sqlite.UserBag.MaterialRecord>>(() =>
  props.diff ? changes.value : records.value,
);
const options = computed<EChartsOption>(() => {
  const values = props.diff
    ? changes.value.map((record) => Math.abs(record.diff))
    : records.value.map((record) => record.count);
  const logarithmic = props.diff && props.logScale;
  const logScale = logarithmic ? getMaterialRecordLogScale(values) : undefined;
  const minimumValue = values.reduce((min, value) => Math.min(min, value), values[0] ?? 0);
  const roundedMinimum = Math.floor(minimumValue / 5) * 5;
  const minimum = logScale?.minimum ?? (props.diff ? 0 : Math.max(0, roundedMinimum));
  const maximum =
    logScale?.maximum ??
    Math.max(
      minimum + 5,
      Math.ceil(values.reduce((max, value) => Math.max(max, value), 0) / 5) * 5,
    );
  const step = (maximum - minimum) / 5;
  return {
    animation: false,
    backgroundColor: "transparent",
    grid: { left: 8, right: 12, top: props.diff ? 24 : 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "axis",
      confine: true,
      renderMode: "richText",
      backgroundColor: colors.value.background,
      borderColor: colors.value.grid,
      textStyle: { color: colors.value.text, fontSize: 12 },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const index = point?.dataIndex ?? -1;
        const record = displayedRecords.value[index];
        if (!record) return "";
        const diff = changes.value[index]?.diff ?? 0;
        return [
          fmtUtil.dateTime(record.time * 1000),
          `数量：${fmtUtil.num(record.count)}`,
          ...(props.diff ? [`变化：${diff > 0 ? "+" : ""}${fmtUtil.num(diff)}`] : []),
          `导入类型：${record.manual ? "手动更新" : "自动导入"}`,
          ...(props.diff ? [] : ["点击节点可删除这条记录"]),
        ].join("\n");
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: props.diff,
      data: displayedRecords.value.map((record) =>
        props.daily
          ? fmtUtil.dateTime(record.time * 1000).slice(0, 10)
          : fmtUtil.dateTime(record.time * 1000),
      ),
      axisLine: { onZero: false, lineStyle: { color: colors.value.grid, type: "solid" } },
      axisTick: { show: false },
      axisLabel: {
        color: colors.value.text,
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: string, index: number) =>
          props.daily ? value : String(index + (props.diff ? 2 : 1)),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: props.diff ? (logarithmic ? "变化幅度（对数）" : "变化幅度") : "",
      nameGap: 8,
      nameTextStyle: { color: colors.value.text, fontSize: 11, align: "left" },
      min: minimum,
      max: maximum,
      interval: logarithmic ? undefined : step,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.value.text,
        fontSize: 11,
        customValues: logScale?.ticks,
        hideOverlap: logarithmic,
        showMinLabel: props.diff ? true : undefined,
        showMaxLabel: logarithmic,
        formatter: (value: number) => {
          const original = logarithmic ? Math.round(restoreMaterialRecordLogValue(value)) : value;
          return Math.abs(original) >= 10000
            ? fmtUtil.num(Math.round(original / 10000)) + "w"
            : fmtUtil.num(original);
        },
      },
      splitLine: { show: false },
    },
    series: props.diff
      ? [
          {
            type: "bar",
            barMaxWidth: 24,
            data: changes.value.map((record, index) => ({
              value: logScale?.values[index] ?? Math.abs(record.diff),
              itemStyle: {
                color: record.diff < 0 ? colors.value.decrease : colors.value.increase,
              },
            })),
            markLine: {
              silent: true,
              symbol: "none",
              label: { show: false },
              lineStyle: { color: colors.value.grid, type: "solid", width: 1 },
              data: [{ yAxis: 0 }],
            },
          },
        ]
      : [
          {
            type: "line",
            data: records.value.map((record) => record.count),
            showSymbol: true,
            symbolSize: 6,
            emphasis: { scale: 1.5 },
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

function selectRecord(event: ECElementEvent): void {
  if (props.diff || event.componentType !== "series" || event.seriesType !== "line") return;
  const record = records.value[event.dataIndex];
  if (record) emits("selectRecord", record);
}

function updateColors(): void {
  if (!chartContainer.value) return;
  const style = getComputedStyle(chartContainer.value);
  colors.value = {
    line: style.getPropertyValue("--tgc-od-orange").trim(),
    increase: style.getPropertyValue("--tgc-od-green").trim(),
    decrease: style.getPropertyValue("--tgc-od-red").trim(),
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

.pbmrc-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
</style>
