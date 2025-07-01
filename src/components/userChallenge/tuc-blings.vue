<!-- 幽境危战，玩家赋光之人 -->
<template>
  <div class="tuc-blings-comp">
    <div class="title">
      <span>赋光之人</span>
      <span>{{ plusLen }}/{{ props.data.length }}</span>
    </div>
    <div class="append">
      <TucBlingItem :bling v-for="(bling, idx) in props.data" :key="idx" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TucBlingItem from "./tuc-bling-item.vue";

type TucBlingsProps = { data: TGApp.Game.Challenge.ChallengeBlings };

const props = defineProps<TucBlingsProps>();

const plusLen = computed<number>(() => props.data.filter((i) => i.is_plus).length);
</script>
<style lang="scss" scoped>
.tuc-blings-comp {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-1);
}

.title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 18px;
}

.append {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
