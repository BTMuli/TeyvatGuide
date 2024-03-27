<template>
  <THomecard>
    <template #title>近期活动</template>
    <template #default>
      <div class="position-grid">
        <v-card v-for="card in positionCards" :key="card.postId" rounded class="position-card">
          <v-list class="position-list">
            <v-list-item :title="card.title" :subtitle="card.abstract">
              <template #prepend>
                <v-avatar rounded="0" @click="createPost(card.postId, card.title)">
                  <v-img :src="card.icon" class="position-icon" />
                </v-avatar>
              </template>
              <template #append>
                <v-btn class="position-card-btn" @click="createPost(card.postId, card.title)">
                  查看
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          <v-divider />
          <v-card-text>
            <div class="position-card-text">
              <v-icon>mdi-calendar-clock</v-icon>
              <span>{{ card.time.start }}~{{ card.time.end }}</span>
            </div>
            <div class="position-card-text">
              <v-icon>mdi-clock-outline</v-icon>
              <span v-if="positionTimeGet[card.postId] !== '已结束'">{{
                positionTimeGet[card.postId]
              }}</span>
              <span v-else>已结束</span>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </template>
  </THomecard>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";

import THomecard from "./t-homecard.vue";
import Mys from "../../plugins/Mys";
import { createPost } from "../../utils/TGWindow";
import { stamp2LastTime } from "../../utils/toolFunc";

// data
const positionCards = ref<TGApp.Plugins.Mys.Position.RenderCard[]>([]);
const positionTimeGet = ref<Record<number, string>>({}); // 剩余时间/已结束/未知
const positionTimeEnd = ref<Record<number, number>>({}); // 结束时间戳
const positionTimer = ref<Record<number, any>>({}); // 定时器

interface TPositionEmits {
  (e: "success"): void;
}

const emits = defineEmits<TPositionEmits>();

function positionLastInterval(postId: number): void {
  const timeGet = positionTimeGet.value[postId];
  if (timeGet === "未知" || timeGet === "已结束") {
    clearInterval(positionTimer.value[postId]);
    positionTimer.value[postId] = null;
    return;
  }
  const timeLast = positionTimeEnd.value[postId] - Date.now();
  if (timeLast <= 0) {
    positionTimeGet.value[postId] = "已结束";
  } else {
    positionTimeGet.value[postId] = stamp2LastTime(timeLast);
  }
}

onMounted(async () => {
  const positionData = await Mys.Position.get();
  if (!positionData) {
    console.error("获取近期活动失败");
    return;
  }
  positionCards.value = Mys.Position.card(positionData);
  positionCards.value.forEach((card) => {
    if (card.time.endStamp === 0) {
      positionTimeGet.value[card.postId] = "未知";
    } else {
      positionTimeGet.value[card.postId] = stamp2LastTime(card.time.endStamp - Date.now());
    }
    positionTimeEnd.value[card.postId] = card.time.endStamp;
    positionTimer.value[card.postId] = setInterval(() => {
      positionLastInterval(card.postId);
    }, 1000);
  });
  emits("success");
});

onUnmounted(() => {
  Object.keys(positionTimer.value).forEach((key) => {
    clearInterval(positionTimer.value[Number(key)]);
  });
});
</script>

<style lang="css" scoped>
.position-grid {
  display: grid;
  margin-top: 10px;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px + 2rem), 1fr));
}

.position-card {
  border: none;
  background: var(--box-bg-1);
}

.position-list {
  background: inherit;
  color: inherit;
  font-family: var(--font-title);
}

.position-icon {
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: contain;
}

.position-icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.5s;
}

.position-icon :hover {
  cursor: pointer;
  scale: 1.2;
}

.position-card-btn {
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.position-card-text {
  display: inline-block;
  min-width: 200px;
  align-items: flex-start;
  margin-right: 5px;
}

.position-card-text :nth-child(1) {
  color: var(--btn-text);
  filter: brightness(0.8);
}
</style>
