<template>
  <div class="gro-o-container">
    <GroDataView v-if="newData.length !== 0" :data-val="newData" data-type="new" />
    <GroDataView :data-val="normalData" data-type="normal" />
    <GroDataView :data-val="avatarData" data-type="avatar" />
    <GroDataView :data-val="weaponData" data-type="weapon" />
    <GroDataView v-if="mixData.length !== 0" :data-val="mixData" data-type="mix" />
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import GroDataView from "./gro-data-view.vue";

type GachaOverviewProps = { modelValue: Array<TGApp.Sqlite.GachaRecords.TableGacha> };

const props = defineProps<GachaOverviewProps>();
const newData = computed<Array<TGApp.Sqlite.GachaRecords.TableGacha>>(() =>
  props.modelValue.filter((item) => item.uigfType === "100"),
);
const normalData = computed<Array<TGApp.Sqlite.GachaRecords.TableGacha>>(() =>
  props.modelValue.filter((item) => item.uigfType === "200"),
);
const avatarData = computed<Array<TGApp.Sqlite.GachaRecords.TableGacha>>(() =>
  props.modelValue.filter((item) => item.uigfType === "301"),
);
const weaponData = computed<Array<TGApp.Sqlite.GachaRecords.TableGacha>>(() =>
  props.modelValue.filter((item) => item.uigfType === "302"),
);
const mixData = computed<Array<TGApp.Sqlite.GachaRecords.TableGacha>>(() =>
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
  if (total === 5) return "repeat(5, 0.2fr)";
  if (total === 4) return "repeat(4, 0.25fr)";
  return "repeat(3, 0.33fr)";
}

// 监听数据变化
watch(
  () => props.modelValue,
  () => (cnCols.value = getCnCols()),
);
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  height: 100%;
  column-gap: 8px;
  grid-template-columns: v-bind(cnCols); /* stylelint-disable-line value-keyword-case */
}
</style>
