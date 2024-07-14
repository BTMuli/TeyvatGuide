<template>
  <div class="ddr-box">
    <DucDetailRelic
      v-for="(relic, index) in transData"
      :key="index"
      :model-value="relic"
      :pos="index + 1"
    />
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import DucDetailRelic from "./duc-detail-relic.vue";

interface DucDetailRelicsProps {
  data: TGApp.Sqlite.Character.RoleReliquary[];
}

const props = defineProps<DucDetailRelicsProps>();
const transData = computed(() => {
  let relics: (TGApp.Sqlite.Character.RoleReliquary | false)[] = [];
  for (let i = 0; i < 5; i++) {
    const relic = props.data.find((relic) => relic.pos === i + 1);
    if (relic) relics.push(relic);
    else relics.push(false);
  }
  return relics;
});
</script>
<style lang="css" scoped>
.ddr-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 10px;
}
</style>
