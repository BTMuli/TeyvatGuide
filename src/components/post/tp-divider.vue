<template>
  <div class="mys-post-divider" v-if="isInclude">
    <img alt="divider" :src="`/source/post/divider_${props.data.insert.divider}.webp`" />
  </div>
  <TpUnknown v-else :data="props.data" />
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
const isInclude = computed(() => {
  const list = ["line_1", "line_2", "line_3", "line_4"];
  return list.includes(props.data.insert.divider);
});
</script>
