<template>
  <div class="gro-o-container">
    <gro-dataview v-if="newData.length !== 0" v-model:data-val="newData" data-type="new" />
    <gro-dataview v-model:data-val="normalData" data-type="normal" />
    <gro-dataview v-model:data-val="avatarData" data-type="avatar" />
    <gro-dataview v-model:data-val="weaponData" data-type="weapon" />
    <gro-dataview v-if="mixData.length !== 0" v-model:data-val="mixData" data-type="mix" />
  </div>
</template>
<script lang="ts" setup>
import { computed, watch } from "vue";

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
let mixData = props.modelValue.filter((item) => item.uigfType === "500");

const cnCols = computed(() => {
  let total = 5;
  if (newData.length === 0) {
    total -= 1;
  }
  if (mixData.length === 0) {
    total -= 1;
  }
  return `repeat(${total}, 1fr)`;
});

// 监听数据变化
watch(
  () => props.modelValue,
  (newVal) => {
    newData = newVal.filter((item) => item.uigfType === "100");
    normalData = newVal.filter((item) => item.uigfType === "200");
    avatarData = newVal.filter((item) => item.uigfType === "301");
    weaponData = newVal.filter((item) => item.uigfType === "302");
    mixData = newVal.filter((item) => item.uigfType === "500");
  },
);
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  width: 100%;
  height: 100%;
  grid-gap: 10px;
  grid-template-columns: v-bind(cnCols);
}
</style>
