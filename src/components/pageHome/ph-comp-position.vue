<template>
  <THomeCard>
    <template #title>近期活动</template>
    <template #default>
      <div class="position-grid">
        <PhPositionCard v-for="(card, index) in positionCards" :key="index" :position="card" />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import PhPositionCard from "@comp/pageHome/ph-position-card.vue";
import Mys from "@Mys/index.js";
import { onMounted, onUnmounted, ref } from "vue";

import THomeCard from "./ph-comp-card.vue";

type TPositionEmits = (e: "success") => void;
type PositionStat = "past" | "now" | "future" | "unknown"; // 已结束 | 进行中 | 未开始 | 未知
export type PositionItem = TGApp.Plugins.Mys.Position.RenderCard & {
  timeRest: number;
  stat: PositionStat;
};
const emits = defineEmits<TPositionEmits>();
// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const positionCards = ref<Array<PositionItem>>([]);

onMounted(async () => {
  const positionData = await Mys.Position.get();
  console.log(positionData);
  const cards = Mys.Position.card(positionData);
  for (const position of cards) {
    if (position.time.endStamp === 0 || position.time.totalStamp < 0) {
      positionCards.value.push({
        ...position,
        timeRest: 0,
        stat: "unknown",
      });
      continue;
    }
    const timeRest = position.time.endStamp - Date.now();
    positionCards.value.push({
      ...position,
      timeRest,
      stat: timeRest > position.time.totalStamp ? "future" : timeRest > 0 ? "now" : "past",
    });
  }
  if (timer !== null) clearInterval(timer);
  timer = setInterval(getPositionTimer, 1000);
  emits("success");
});

function getPositionTimer(): void {
  for (const position of positionCards.value) {
    if (position.stat === "unknown") continue;
    if (position.stat === "past") {
      position.timeRest = 0;
      continue;
    }
    position.timeRest = position.time.endStamp - Date.now();
    if (position.timeRest <= 0) {
      position.stat = "past";
      position.timeRest = 0;
    } else if (position.timeRest > position.time.totalStamp) {
      position.stat = "future";
    } else {
      position.stat = "now";
    }
  }
}

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
  timer = null;
});
</script>

<style lang="css" scoped>
.position-grid {
  display: grid;
  margin-top: 10px;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px + 2rem), 0.5fr));
}
</style>
