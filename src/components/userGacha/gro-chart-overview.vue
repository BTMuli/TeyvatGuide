<!-- 祈愿分析图表组件 -->
<template>
  <v-chart
    class="gro-chart-overview"
    :option="chartOptions"
    autoresize
    :theme="echartsTheme"
    :init-options="{ locale: 'ZH' }"
  />
</template>
<script lang="ts" setup>
import TSUserGacha from "@Sqlm/userGacha.js";
import useAppStore from "@store/app.js";
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
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef, watch } from "vue";
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

const chartOptions = shallowRef<Record<string, unknown>>({});
const echartsTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

/**
 * @description 获取整体祈愿图表配置
 * @returns {Record<string, unknown>}
 */
async function getOverviewOptions(): Promise<Record<string, unknown>> {
  const records = await TSUserGacha.getGachaRecords(props.uid);
  const data: Record<string, unknown> = {
    title: [
      { text: ">> 祈愿系统大数据分析 <<", left: "center", top: "5%" },
      { text: "卡池分布", left: "17%", top: "45%" },
      { text: "星级分布", left: "17%", top: "90%" },
      { text: "角色池分布", left: "45%", bottom: "10%" },
      { text: "武器池分布", right: "5%", bottom: "10%" },
    ],
    tooltip: { trigger: "item" },
    legend: { type: "scroll", orient: "vertical", left: 10, top: 20, bottom: 20 },
    toolbox: {
      show: true,
      feature: {
        restore: {},
        saveAsImage: { pixelRatio: 2 },
      },
    },
    series: [
      {
        name: "卡池分布",
        type: "pie",
        radius: "50%",
        data: [],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0, 0, 0, 0.5)" },
        },
        right: "60%",
        top: 0,
        bottom: "50%",
      },
      {
        name: "星级分布",
        type: "pie",
        radius: "50%",
        data: [],
        right: "60%",
        top: "50%",
        bottom: "0",
      },
      {
        name: "角色池分布",
        type: "pie",
        radius: [30, 150],
        center: ["50%", "50%"],
        roseType: "area",
        itemStyle: { borderRadius: [2, 10] },
        data: [],
        datasetIndex: 3,
      },
      {
        name: "武器池分布",
        type: "pie",
        radius: [30, 100],
        itemStyle: { borderRadius: [3, 10] },
        data: [],
        left: "70%",
      },
    ],
  };
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[0].subtext = `共 ${records.length} 条数据`;
  }
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[0].data = [
      {
        value: records.filter((item) => item.uigfType === "100").length,
        name: "新手祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "200").length,
        name: "常驻祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "301").length,
        name: "角色活动祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "302").length,
        name: "武器活动祈愿",
      },
      {
        value: records.filter((item) => item.uigfType === "500").length,
        name: "集录祈愿",
      },
    ];
    data.series[1].data = [
      { value: records.filter((item) => item.rank === "3").length, name: "3星" },
      { value: records.filter((item) => item.rank === "4").length, name: "4星" },
      { value: records.filter((item) => item.rank === "5").length, name: "5星" },
    ];
  }
  const tempSet = new Set<string>();
  const tempRecord = new Map<string, number>();
  // 角色池分析
  let tempList = records.filter((item) => item.uigfType === "301");
  let star3 = tempList.filter((item) => item.rank === "3").length;
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[3].subtext = `共 ${tempList.length} 条数据, 其中三星武器 ${star3} 抽`;
  }
  tempList
    .filter((item) => item.rank !== "3")
    .forEach((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, (tempRecord.get(item.name) ?? 0) + 1);
      } else {
        tempSet.add(item.name);
        tempRecord.set(item.name, 1);
      }
    });
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[2].data = Array.from(tempRecord).map((item) => ({ value: item[1], name: item[0] }));
  }
  tempSet.clear();
  tempRecord.clear();
  // 武器池分析
  tempList = records.filter((item) => item.uigfType === "302");
  star3 = tempList.filter((item) => item.rank === "3").length;
  if (data.title !== undefined && Array.isArray(data.title)) {
    data.title[4].subtext = `共 ${tempList.length} 条数据，其中三星武器 ${star3} 抽`;
  }
  tempList
    .filter((item) => item.rank !== "3")
    .forEach((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, (tempRecord.get(item.name) ?? 0) + 1);
      } else {
        tempSet.add(item.name);
        tempRecord.set(item.name, 1);
      }
    });
  if (data.series !== undefined && Array.isArray(data.series)) {
    data.series[3].data = Array.from(tempRecord).map((item) => ({ value: item[1], name: item[0] }));
  }
  return data;
}

async function loadChartData(): Promise<void> {
  chartOptions.value = await getOverviewOptions();
}

onMounted(async () => {
  await loadChartData();
});

// 监听 uid 变化，重新加载数据
watch(
  () => props.uid,
  async () => {
    await loadChartData();
  },
);
</script>
<style lang="css" scoped>
.gro-chart-overview {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>
