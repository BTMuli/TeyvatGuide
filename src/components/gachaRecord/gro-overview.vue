<template>
  <div class="gro-o-container">
    <gro-dataview v-if="newData.length > 0" :data-val="newData" data-type="new" />
    <gro-dataview :data-val="normalData" data-type="normal" />
    <gro-dataview :data-val="avatarData" data-type="avatar" />
    <gro-dataview :data-val="weaponData" data-type="weapon" />
  </div>
</template>
<script lang="ts" setup>
// vue
import GroDataview from "./gro-dataview.vue";

interface GachaOverviewProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GachaOverviewProps>();

// data
const newData = props.modelValue.filter((item) => item.uigfType === "100");
const normalData = props.modelValue.filter((item) => item.uigfType === "200");
const avatarData = props.modelValue.filter((item) => item.uigfType === "301");
const weaponData = props.modelValue.filter((item) => item.uigfType === "302");
const getColNum = newData.length === 0 ? 3 : 4;
</script>
<style lang="css" scoped>
.gro-o-container {
  display: grid;
  width: 100%;
  height: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(v-bind(getColNum), 1fr);
}
</style>
