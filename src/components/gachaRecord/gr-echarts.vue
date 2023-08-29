<template>
  <v-chart class="echarts-box" :option="props.options" autoresize />
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

// types
import { type EChartsOption } from "echarts";
import showSnackbar from "../func/snackbar";

export interface GachaEchartsProps {
  echartsId: string;
  options: EChartsOption;
}

const props = defineProps<GachaEchartsProps>();

// store
const appStore = useAppStore();

use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);

// 获取当前主题
const theme = appStore.theme;
provide(THEME_KEY, theme === "dark" ? "dark" : "light");

onMounted(async () => {
  await listenOnTheme();
});

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
      }, 1500);
    }
  });
}
</script>
<style lang="css" scoped>
.echarts-box {
  width: 800px;
  height: 600px;
  padding: 10px;
  border-radius: 10px;
  margin: 10px;
  box-shadow: 0 0 10px rgb(0 0 0 / 50%);
}
</style>
