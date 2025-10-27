<!-- 千星奇域祈愿概览组件 -->
<template>
  <div class="gro-o-container">
    <GbrDataView :data-val="normalData" data-type="normal" />
    <GbrDataView :data-val="boyData" data-type="boy" />
    <GbrDataView :data-val="girlData" data-type="girl" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import GbrDataView from "./gbr-data-view.vue";

type GachaOverviewProps = { modelValue: Array<TGApp.Sqlite.GachaRecords.TableGachaB> };

const props = defineProps<GachaOverviewProps>();
const normalData = computed<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>(() =>
  props.modelValue.filter((item) => item.opGachaType === "1000"),
);
const girlData = computed<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>(() =>
  props.modelValue.filter((item) => item.opGachaType === "20011" || item.opGachaType === "20012"),
);
const boyData = computed<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>(() =>
  props.modelValue.filter((item) => item.opGachaType === "20021" || item.opGachaType === "20022"),
);
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  height: 100%;
  column-gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
