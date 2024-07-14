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
  data: string;
}

const props = defineProps<DucDetailRelicsProps>();
const transData = computed<Array<TGApp.Sqlite.Character.RoleReliquary | false>>(() => {
  if (!props.data || props.data === "") return [false, false, false, false, false];
  try {
    const parsedData: TGApp.Sqlite.Character.RoleReliquary[] = JSON.parse(props.data);
    let relics: Array<TGApp.Sqlite.Character.RoleReliquary | false> = [];
    for (let i = 0; i < 5; i++) {
      const relic = parsedData.find((relic) => relic.pos === i + 1);
      if (relic) relics.push(relic);
      else relics.push(false);
    }
    return relics;
  } catch (e) {
    console.error(e);
    return [false, false, false, false, false];
  }
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
