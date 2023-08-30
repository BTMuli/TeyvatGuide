<template>
  <div class="gro-container">
    <v-chart :option="getPoolData()" autoresize class="gro-chart" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, provide } from "vue";
import VChart, { THEME_KEY } from "vue-echarts";
import showSnackbar from "../func/snackbar";
// echarts
import { use } from "echarts/core";
import { LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { type EChartsOption } from "echarts";

use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);
// 获取当前主题
provide(THEME_KEY, "dark");

interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();

onMounted(async () => {
  const totalNum = props.modelValue.length;
  showSnackbar({
    text: `成功获取 ${totalNum} 条祈愿数据`,
  });
});

// data
const overviewDefaultData = <EChartsOption>{
  title: [
    {
      text: "数据概览",
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
      radius: [40, 150],
      center: ["50%", "50%"],
      roseType: "area",
      itemStyle: {
        borderRadius: 10,
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
  const data = JSON.parse(JSON.stringify(overviewDefaultData));
  data.title[0].subtext = `共 ${props.modelValue.length} 条数据`;
  data.series[0].data = [
    { value: props.modelValue.filter((item) => item.uigfType === "200").length, name: "常驻祈愿" },
    {
      value: props.modelValue.filter((item) => item.uigfType === "301").length,
      name: "角色活动祈愿",
    },
    {
      value: props.modelValue.filter((item) => item.uigfType === "302").length,
      name: "武器活动祈愿",
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
    .map((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, tempRecord.get(item.name)! + 1);
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
    .map((item) => {
      if (tempSet.has(item.name)) {
        tempRecord.set(item.name, tempRecord.get(item.name)! + 1);
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
.gro-container {
  width: calc(100% - 20px);
  padding: 10px;
  border-radius: 5px;
  margin: 10px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.gro-chart {
  height: calc(100vh - 200px);
}
</style>
