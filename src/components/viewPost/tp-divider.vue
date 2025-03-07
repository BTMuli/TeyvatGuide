<template>
  <div class="tp-divider-box" v-if="isInclude">
    <img
      alt="divider"
      :src="`/source/post/divider_${props.data.insert.divider}.webp`"
      :title="props.data.insert.divider"
    />
  </div>
  <TpUnknown v-else :data="<TGApp.BBS.SctPost.Empty>props.data" />
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TpUnknown from "./tp-unknown.vue";

type TpDivider = { insert: { divider: string } };
type TpDividerProps = { data: TpDivider };

const props = defineProps<TpDividerProps>();

console.log("tpDivider", props.data.insert.divider);

const isInclude = computed<boolean>(() =>
  ["line_1", "line_2", "line_3", "line_4"].includes(props.data.insert.divider),
);
</script>
<style lang="css" scoped>
.tp-divider-box {
  margin: 10px auto;
}

.tp-divider-box img {
  max-width: 100%;
}
</style>
