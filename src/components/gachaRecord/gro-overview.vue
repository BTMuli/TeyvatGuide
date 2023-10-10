<template>
  <div
    class="gro-o-container"
    :style="{
      gridTemplateColumns: newData.length !== 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
    }"
  >
    <gro-dataview v-if="newData.length !== 0" v-model:data-val="newData" data-type="new" />
    <gro-dataview v-model:data-val="normalData" data-type="normal" />
    <gro-dataview v-model:data-val="avatarData" data-type="avatar" />
    <gro-dataview v-model:data-val="weaponData" data-type="weapon" />
  </div>
</template>
<script lang="ts" setup>
import { watch } from "vue";

import GroDataview from "./gro-dataview.vue";

interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();
// data
let newData = props.modelValue.filter((item) => item.uigfType === "100");
let normalData = props.modelValue.filter((item) => item.uigfType === "200");
let avatarData = props.modelValue.filter((item) => item.uigfType === "301");
let weaponData = props.modelValue.filter((item) => item.uigfType === "302");

// 监听数据变化
watch(
  () => props.modelValue,
  (newVal) => {
    newData = newVal.filter((item) => item.uigfType === "100");
    normalData = newVal.filter((item) => item.uigfType === "200");
    avatarData = newVal.filter((item) => item.uigfType === "301");
    weaponData = newVal.filter((item) => item.uigfType === "302");
  },
);
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  width: 100%;
  height: 100%;
  grid-gap: 10px;
}
</style>
