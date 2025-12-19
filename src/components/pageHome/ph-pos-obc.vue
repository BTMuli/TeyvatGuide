<!-- 观测枢活动组件组件  -->
<template>
  <div class="ph-po-card">
    <div class="ph-po-top">
      <div class="ph-po-main">
        <div class="ph-po-left" @click="openPosition()">
          <TMiImg :ori="true" :src="props.pos.icon" alt="icon" />
        </div>
        <div class="ph-po-right">
          <div class="ph-po-title">{{ props.pos.title }}</div>
          <div class="ph-po-sub">{{ props.pos.abstract }}</div>
        </div>
      </div>
      <v-btn class="ph-po-btn" variant="elevated" @click="openPosition()">查看</v-btn>
    </div>
    <div class="ph-po-bottom">
      <div class="ph-po-period">
        <v-icon>mdi-calendar-clock</v-icon>
        <span class="time">
          {{ props.pos.create_time }}
          ~
          {{ endTs === 0 ? "未知" : timestampToDate(endTs) }}
        </span>
      </div>
      <div class="ph-po-rest">
        <v-icon>mdi-clock-outline</v-icon>
        <span v-if="!hasEndTime">未知</span>
        <span v-else-if="restTs === 0">已结束</span>
        <span v-else-if="restTs < durationTs">剩余时间：{{ stamp2LastTime(restTs) }}</span>
        <span v-else>未开始</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseLink } from "@utils/linkParser.js";
import { createPost, toObcPage } from "@utils/TGWindow.js";
import { stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

type PhPosObcProps = { pos: TGApp.BBS.Obc.PositionItem };

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const props = defineProps<PhPosObcProps>();
const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const hasEndTime = computed<boolean>(() => endTs.value !== 0);

onMounted(() => {
  endTs.value = Number(props.pos.end_time);
  restTs.value = endTs.value === 0 ? 0 : endTs.value - Date.now();
  if (restTs.value > 0) {
    durationTs.value = endTs.value - new Date(props.pos.create_time).getTime();
  }
  if (timer !== null) clearInterval(timer);
  timer = setInterval(handlePosition, 1000);
});

function handlePosition(): void {
  if (restTs.value < 1) {
    if (timer !== null) clearInterval(timer);
    timer = null;
    restTs.value = 0;
    return;
  }
  restTs.value = endTs.value - Date.now();
}

async function openPosition(): Promise<void> {
  if (props.pos.url === "" && props.pos.content_id !== 0) {
    await toObcPage(props.pos.content_id);
    return;
  }
  const res = await parseLink(props.pos.url);
  if (res === "post") {
    const postId = Number(props.pos.url.split("/").pop());
    await createPost(postId, props.pos.title);
    return;
  }
  if (res === false) {
    showSnackbar.warn(`未知链接:${props.pos.url}`, 3000);
    return;
  }
  await openUrl(props.pos.url);
}

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
});
</script>
<style lang="scss" scoped>
.ph-po-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.ph-po-top {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid var(--common-shadow-2);
}

.ph-po-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.ph-po-left {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 3px;
  background: var(--box-bg-2);
  object-fit: contain;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 0.5s;
  }

  &:hover img {
    cursor: pointer;
    scale: 1.2;
  }
}

.ph-po-right {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
}

.ph-po-title {
  font-family: var(--font-title);
  font-size: 16px;
}

.ph-po-sub {
  font-size: 14px;
  opacity: 0.8;
}

.ph-po-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.ph-po-bottom {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 14px;
  gap: 6px;
}

.ph-po-period {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;

  :first-child {
    color: var(--tgc-od-orange);
  }
}

.ph-po-rest {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  column-gap: 4px;

  :first-child {
    color: var(--tgc-od-green);
  }
}
</style>
