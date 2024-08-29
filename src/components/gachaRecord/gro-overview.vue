<template>
  <div class="gro-o-container">
    <gro-dataview v-if="newData.length !== 0" :data-val="newData" data-type="new" />
    <gro-dataview :data-val="normalData" data-type="normal" />
    <gro-dataview :data-val="avatarData" data-type="avatar" />
    <gro-dataview :data-val="weaponData" data-type="weapon" />
    <gro-dataview v-if="mixData.length !== 0" :data-val="mixData" data-type="mix" />
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import GroDataview from "./gro-dataview.vue";

interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();
// data
const newData = computed<TGApp.Sqlite.GachaRecords.SingleTable[]>(() =>
  props.modelValue.filter((item) => item.uigfType === "100"),
);
const normalData = computed<TGApp.Sqlite.GachaRecords.SingleTable[]>(() =>
  props.modelValue.filter((item) => item.uigfType === "200"),
);
const avatarData = computed<TGApp.Sqlite.GachaRecords.SingleTable[]>(() =>
  props.modelValue.filter((item) => item.uigfType === "301"),
);
const weaponData = computed<TGApp.Sqlite.GachaRecords.SingleTable[]>(() =>
  props.modelValue.filter((item) => item.uigfType === "302"),
);
const mixData = computed<TGApp.Sqlite.GachaRecords.SingleTable[]>(() =>
  props.modelValue.filter((item) => item.uigfType === "500"),
);

const cnCols = ref<string>(getCnCols());

function getCnCols(): string {
  let total = 5;
  if (newData.value.length === 0) {
    total -= 1;
  }
  if (mixData.value.length === 0) {
    total -= 1;
  }
  if (total === 5) {
    return "repeat(5, 0.2fr)";
  } else if (total === 4) {
    return "repeat(4, 0.25fr)";
  } else {
    return "repeat(3, 0.33fr)";
  }
}

// 监听数据变化
watch(
  () => props.modelValue,
  () => {
    cnCols.value = getCnCols();
  },
);
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  height: 100%;
  grid-column-gap: 10px;
  grid-template-columns: v-bind(cnCols);
}
</style>
