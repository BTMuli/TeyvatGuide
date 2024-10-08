<template>
  <div class="gro-echart">
    <v-chart :option="getPoolData()" autoresize />
  </div>
</template>
<script lang="ts" setup>
import type { EChartsOption } from "echarts";
import { PieChart } from "echarts/charts";
import {
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  ToolboxComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { provide } from "vue";
import VChart, { THEME_KEY } from "vue-echarts";

// echarts

use([
  TitleComponent,
  TooltipComponent,
  ToolboxComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
]);
// 获取当前主题
provide(THEME_KEY, "dark");

interface GachaOverviewEchartsProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewEchartsProps>();

// data
const defaultOptions = <EChartsOption>{
  title: [
    {
      text: ">> 祈愿系统大数据分析 <<",
      left: "center",
      top: "5%",
    },
    {
      text: "卡池分布",
      left: "17%",
      top: "45%",
    },
    {
      text: "星级分布",
      left: "17%",
      top: "90%",
    },
    {
      text: "角色池分布",
      left: "45%",
      bottom: "10%",
    },
    {
      text: "武器池分布",
      right: "5%",
      bottom: "10%",
    },
  ],
  tooltip: {
    trigger: "item",
  },
  legend: {
    type: "scroll",
    orient: "vertical",
    left: 10,
    top: 20,
    bottom: 20,
  },
  toolbox: {
    show: true,
    feature: {
      restore: {},
      saveAsImage: {},
    },
  },
  series: [
    {
      name: "卡池分布",
      type: "pie",
      radius: "50%",
      data: [],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
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
      itemStyle: {
        borderRadius: [2, 10],
      },
      data: [],
      datasetIndex: 3,
    },
    {
      name: "武器池分布",
      type: "pie",
      radius: [30, 100],
      itemStyle: {
        borderRadius: [3, 10],
      },
      data: [],
      left: "70%",
    },
  ],
};

// 获取卡池分布的数据
function getPoolData(): EChartsOption {
  const data = JSON.parse(JSON.stringify(defaultOptions));
  data.title[0].subtext = `共 ${props.modelValue.length} 条数据`;
  data.series[0].data = [
    { value: props.modelValue.filter((item) => item.uigfType === "100").length, name: "新手祈愿" },
    { value: props.modelValue.filter((item) => item.uigfType === "200").length, name: "常驻祈愿" },
    {
      value: props.modelValue.filter((item) => item.uigfType === "301").length,
      name: "角色活动祈愿",
    },
    {
      value: props.modelValue.filter((item) => item.uigfType === "302").length,
      name: "武器活动祈愿",
    },
    {
      value: props.modelValue.filter((item) => item.uigfType === "500").length,
      name: "集录祈愿",
    },
  ];
  data.series[1].data = [
    { value: props.modelValue.filter((item) => item.rank === "3").length, name: "3星" },
    { value: props.modelValue.filter((item) => item.rank === "4").length, name: "4星" },
    { value: props.modelValue.filter((item) => item.rank === "5").length, name: "5星" },
  ];
  const tempSet = new Set<string>();
  const tempRecord = new Map<string, number>();
  // 角色池分析
  let tempList = props.modelValue.filter((item) => item.uigfType === "301");
  let star3 = tempList.filter((item) => item.rank === "3").length;
  data.title[3].subtext = `共 ${tempList.length} 条数据, 其中三星武器 ${star3} 抽`;
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
  data.series[2].data = Array.from(tempRecord).map((item) => {
    return {
      value: item[1],
      name: item[0],
    };
  });
  tempSet.clear();
  tempRecord.clear();
  // 武器池分析
  tempList = props.modelValue.filter((item) => item.uigfType === "302");
  star3 = tempList.filter((item) => item.rank === "3").length;
  data.title[4].subtext = `共 ${tempList.length} 条数据，其中三星武器 ${star3} 抽`;
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
  data.series[3].data = Array.from(tempRecord).map((item) => {
    return {
      value: item[1],
      name: item[0],
    };
  });
  return data;
}
</script>
<style lang="css" scoped>
.gro-echart {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}
</style>
