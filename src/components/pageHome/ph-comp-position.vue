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
import { onMounted, onUnmounted, ref } from "vue";

import THomeCard from "./ph-comp-card.vue";

import takumiReq from "@/web/request/takumiReq.js";

type TPositionEmits = (e: "success") => void;
type PositionStat = "past" | "now" | "future" | "unknown"; // 已结束 | 进行中 | 未开始 | 未知
export type PositionCard = {
  title: string;
  postId: number;
  link: string;
  icon: string;
  abstract: string;
  time: { startStamp: number; endStamp: number; totalStamp: number };
  timeRest: number;
  stat: PositionStat;
};
const emits = defineEmits<TPositionEmits>();
// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const positionCards = ref<Array<PositionCard>>([]);

onMounted(async () => {
  const resp = await takumiReq.obc.position();
  console.log("positionCards", resp);
  positionCards.value = getPositionCard(resp);
  if (timer !== null) clearInterval(timer);
  timer = setInterval(getPositionTimer, 1000);
  emits("success");
});

function getPositionCard(list: Array<TGApp.BBS.Obc.PositionItem>): Array<PositionCard> {
  const res: Array<PositionCard> = [];
  for (const position of list) {
    let link = position.url;
    if (position.url === "" && position.content_id !== 0) {
      link = `https://bbs.mihoyo.com/ys/obc/content/${position.content_id}/detail?bbs_presentation_style=no_header`;
    }
    const startTs = new Date(position.create_time).getTime();
    const endTs = Number(position.end_time);
    const totalTs = endTs - startTs;
    const restTs = endTs === 0 || totalTs < 0 ? 0 : endTs - Date.now();
    const card: PositionCard = {
      title: position.title,
      postId: position.url !== "" ? Number(position.url.split("/").pop()) : position.content_id,
      link: link,
      icon: position.icon,
      abstract: position.abstract,
      time: { startStamp: startTs, endStamp: endTs, totalStamp: totalTs },
      timeRest: restTs,
      stat: restTs === 0 ? "unknown" : restTs > totalTs ? "future" : restTs > 0 ? "now" : "past",
    };
    res.push(card);
  }
  return res;
}

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
