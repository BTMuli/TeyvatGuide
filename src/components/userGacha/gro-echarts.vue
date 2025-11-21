<template>
  <div class="gro-chart">
    <div class="gro-chart-options">
      <v-select
        class="gro-chart-select"
        v-model="curChartType"
        :items="chartTypes"
        item-title="label"
        item-value="value"
        label="选择图表"
        density="compact"
        outlined
        hide-details
        width="200px"
      />
    </div>
    <div class="gro-chart-container">
      <gro-chart-overview v-if="curChartType === 'overview'" :uid="uid" />
      <gro-chart-calendar v-if="curChartType === 'calendar'" :uid="uid" :gacha-type="gachaType" />
      <gro-chart-stackbar v-if="curChartType === 'stackBar'" :uid="uid" :gacha-type="gachaType" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import GroChartCalendar from "@comp/userGacha/gro-chart-calendar.vue";
import GroChartOverview from "@comp/userGacha/gro-chart-overview.vue";
import GroChartStackbar from "@comp/userGacha/gro-chart-stackbar.vue";
import { ref } from "vue";

type GachaOverviewEchartsProps = { uid: string; gachaType?: string };
type ChartsType = "overview" | "calendar" | "stackBar";
type ChartItem = { label: string; value: ChartsType };

defineProps<GachaOverviewEchartsProps>();

const chartTypes: Array<ChartItem> = [
  { label: "祈愿分析", value: "overview" },
  { label: "祈愿日历", value: "calendar" },
  { label: "祈愿柱状图", value: "stackBar" },
];

const curChartType = ref<ChartsType>("overview");
</script>
<style lang="css" scoped>
.gro-chart {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
}

.gro-chart-options {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: auto;
  gap: 10px;
}

.gro-chart-select {
  width: 150px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gro-chart-container {
  width: 100%;
  flex: 1;
  overflow: hidden auto;
}
</style>
