<template>
  <div class="gro-chart">
    <div class="gro-chart-options">
      <v-select
        v-model="curChartType"
        :hide-details="true"
        :items="chartTypes"
        class="gro-chart-select"
        density="compact"
        item-title="label"
        item-value="value"
        label="选择图表"
        variant="outlined"
        width="200px"
      />
    </div>
    <div class="gro-chart-container">
      <GroChartOverview v-if="curChartType === 'overview'" :records :uid />
      <GroChartCalendar v-if="curChartType === 'calendar'" :gachaType :records :uid />
      <GroChartStackbar v-if="curChartType === 'stackBar'" :gachaType :records :uid />
    </div>
  </div>
</template>
<script lang="ts" setup>
import GroChartCalendar from "@comp/userGacha/gro-chart-calendar.vue";
import GroChartOverview from "@comp/userGacha/gro-chart-overview.vue";
import GroChartStackbar from "@comp/userGacha/gro-chart-stackbar.vue";
import { ref } from "vue";

type GachaOverviewEchartsProps = {
  uid: string;
  gachaType?: string;
  records: Array<TGApp.Sqlite.Gacha.Gacha>;
};
type ChartsType = "overview" | "calendar" | "stackBar";
type SelectType<T> = { label: string; value: T };

defineProps<GachaOverviewEchartsProps>();

const chartTypes: Array<SelectType<ChartsType>> = [
  { label: "祈愿分析", value: "overview" },
  { label: "祈愿日历", value: "calendar" },
  { label: "祈愿柱状图", value: "stackBar" },
];
// TODO: 分卡池选择图表

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
  flex: none;
}

.gro-chart-container {
  overflow: hidden auto;
  width: 100%;
  flex: 1;
}
</style>
