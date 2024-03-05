<template>
  <div class="hta-th-box">
    <v-data-table :headers="headers" :items="props.modelValue">
      <template v-slot:item="{ item }">
        <tr class="hta-th-tr">
          <td class="hta-th-icon">
            <TibWikiAbyss2 v-model="item.AvatarId" />
          </td>
          <td>{{ (item.HoldingRate * 100).toFixed(3) }}%</td>
          <td v-for="rate in item.Constellations" :key="rate.Item">
            {{ (rate.Rate * 100).toFixed(3) }}%
          </td>
        </tr>
      </template>
    </v-data-table>
  </div>
</template>
<script lang="ts" setup>
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTabHoldProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarHold[];
}

const props = defineProps<HtaTabHoldProps>();

const headers = [
  { title: "角色", align: "center", key: "AvatarId" },
  { title: "持有", align: "center", key: "HoldingRate" },
  { title: "0命", align: "center", key: "Constellations[0].Rate" },
  { title: "1命", align: "center", key: "Constellations[1].Rate" },
  { title: "2命", align: "center", key: "Constellations[2].Rate" },
  { title: "3命", align: "center", key: "Constellations[3].Rate" },
  { title: "4命", align: "center", key: "Constellations[4].Rate" },
  { title: "5命", align: "center", key: "Constellations[5].Rate" },
  { title: "6命", align: "center", key: "Constellations[6].Rate" },
];
</script>
<style lang="css" scoped>
.hta-th-box {
  height: 100%;
  max-height: calc(100vh - 120px);
  padding-right: 5px;
  border-radius: 5px;
  overflow-y: auto;
}

.hta-th-tr {
  height: 100px;
  text-align: center;
}

.hta-th-icon {
  width: 100px;
}
</style>
