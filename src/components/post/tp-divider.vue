<template>
  <div class="tp-divider-box" v-if="isInclude">
    <img
      alt="divider"
      :src="`/source/post/divider_${props.data.insert.divider}.webp`"
      :title="props.data.insert.divider"
    />
  </div>
  <TpUnknown v-else :data="emptyData" />
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TpUnknown from "./tp-unknown.vue";

interface TpDivider {
  insert: {
    divider: string;
  };
}

interface TpDividerProps {
  data: TpDivider;
}

const props = defineProps<TpDividerProps>();
const emptyData: TGApp.Plugins.Mys.SctPost.Empty = <TGApp.Plugins.Mys.SctPost.Empty>props.data;

console.log("tpDivider", props.data.insert.divider);

const isInclude = computed(() => {
  const list = ["line_1", "line_2", "line_3", "line_4"];
  return list.includes(props.data.insert.divider);
});
</script>
<style lang="css" scoped>
.tp-divider-box {
  margin: 10px auto;
}

.tp-divider-box img {
  max-width: 100%;
}
</style>
