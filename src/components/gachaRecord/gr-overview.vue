<template>
  <div class="gro-container">
    <v-chart :option="getPoolData()" autoresize class="gro-chart" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, provide } from "vue";
import VChart, { THEME_KEY } from "vue-echarts";
// tauri
import { event } from "@tauri-apps/api";
// store
import { useAppStore } from "../../store/modules/app";
// echarts
import { use } from "echarts/core";
import { LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { type EChartsOption } from "echarts";
import showSnackbar from "../func/snackbar";

use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);
// 获取当前主题
const theme = useAppStore().theme;
provide(THEME_KEY, theme === "dark" ? "dark" : "light");

interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();

onMounted(async () => {
  await listenOnTheme();
});

// data
const overviewDefaultData = <EChartsOption>{
  title: [
    {
      text: "数据概览",
      left: "center",
    },
    {
      text: "卡池分布",
      left: "14%",
      top: "45%",
    },
    {
      text: "星级分布",
      left: "14%",
      top: "95%",
    },
    {
      text: "武器分布",
      left: "48%",
      top: "20%",
    },
    {
      text: "角色分布",
      left: "80%",
      top: "20%",
    },
  ],
  tooltip: {
    trigger: "item",
  },
  // 标签
  // legend:{},
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
      left: 0,
      right: "66.6667%",
      top: 0,
      bottom: "50%",
    },
    {
      name: "星级分布",
      type: "pie",
      radius: "50%",
      data: [],
      left: 0,
      right: "66.6667%",
      top: "50%",
      bottom: "0",
    },
    {
      name: "武器分布",
      type: "pie",
      radius: [40, 150],
      center: ["50%", "50%"],
      roseType: "area",
      itemStyle: {
        borderRadius: 8,
      },
      data: [],
      left: "33.3333%",
      right: "33.3333%",
      datasetIndex: 3,
    },
    {
      name: "角色分布",
      type: "pie",
      radius: "50%",
      data: [],
      left: "66.6667%",
      right: 0,
    },
  ],
};

// 监听主题变化
async function listenOnTheme(): Promise<void> {
  await event.listen("readTheme", (e) => {
    const themeGet = <string>e.payload;
    if (theme !== themeGet) {
      console.info(`主题已切换为 ${themeGet}，请刷新页面`);
      showSnackbar({
        text: `主题已切换为 ${themeGet}，即将刷新页面`,
      });
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  });
}

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
  props.modelValue
    .filter((item) => item.type === "武器")
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
  props.modelValue
    .filter((item) => item.type === "角色")
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
