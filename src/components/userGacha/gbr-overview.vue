<template>
  <div class="gbr-o-container">
    <GbrDataView :data-val="normalData" data-type="normal" />
    <GbrDataView :data-val="eventData" data-type="boy" />
    <GbrDataView :data-val="eventData" data-type="girl" />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import GbrDataView from "./gbr-data-view.vue";

type GachaOverviewProps = { modelValue: Array<TGApp.Sqlite.Gacha.GachaB> };

const props = defineProps<GachaOverviewProps>();
const normalData = computed<Array<TGApp.Sqlite.Gacha.GachaB>>(() =>
  props.modelValue.filter((item) => item.gachaType === "1000"),
);
const eventData = computed<Array<TGApp.Sqlite.Gacha.GachaB>>(() =>
  props.modelValue.filter((item) => item.gachaType === "2000"),
);
</script>
<style lang="css" scoped>
.gbr-o-container {
  position: relative;
  display: grid;
  height: 100%;
  column-gap: 8px;
  grid-template-columns: repeat(3, 0.33fr);
}
</style>
