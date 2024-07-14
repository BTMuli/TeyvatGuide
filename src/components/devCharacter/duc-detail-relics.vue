<template>
  <div class="ddr-box">
    <DucDetailRelic
      v-for="relic in props.data"
      :key="relic.id"
      :model-value="relic"
      :pos="relic.pos"
    />
  </div>
</template>
<script lang="ts" setup>
import DucDetailRelic from "./duc-detail-relic.vue";

interface DucDetailRelicsProps {
  data: TGApp.Sqlite.Character.RoleReliquary[];
}

const props = defineProps<DucDetailRelicsProps>();
</script>
<style lang="css" scoped>
.ddr-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 10px;
}
</style>
