<template>
  <div class="gro-o-container">
    <GbrDataView :data-val="normalData" data-type="normal" />
    <GbrDataView :data-val="eventData" data-type="boy" />
    <GbrDataView :data-val="eventData" data-type="girl" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import GbrDataView from "./gbr-data-view.vue";

type GachaOverviewProps = { modelValue: Array<TGApp.Sqlite.GachaRecords.TableGachaB> };

const props = defineProps<GachaOverviewProps>();
const normalData = computed<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>(() =>
  props.modelValue.filter((item) => item.gachaType === "1000"),
);
const eventData = computed<Array<TGApp.Sqlite.GachaRecords.TableGachaB>>(() =>
  props.modelValue.filter((item) => item.gachaType === "2000"),
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
