<template>
  <div class="ph-pool-card">
    <div class="top">
      <div class="main">
        <div class="left"><img :src="props.position.icon" alt="icon" /></div>
        <div class="right">
          <div class="title">{{ props.position.title }}</div>
          <div class="sub">{{ props.position.abstract }}</div>
        </div>
      </div>
      <v-btn class="btn" @click="openPosition(props.position)">查看</v-btn>
    </div>
    <div class="bottom">
      <div class="period">
        <v-icon>mdi-calendar-clock</v-icon>
        <span class="time">
          {{ timestampToDate(props.position.time.startStamp) }}
          ~
          {{
            props.position.time.endStamp === 0
              ? "未知"
              : timestampToDate(props.position.time.endStamp)
          }}
        </span>
      </div>
      <div class="rest">
        <v-icon>mdi-clock-outline</v-icon>
        <span v-if="props.position.stat === 'past'">已结束</span>
        <span v-else-if="props.position.stat === 'unknown'">未知</span>
        <span v-else-if="props.position.stat === 'now'">
          剩余时间：{{ stamp2LastTime(props.position.timeRest) }}
        </span>
        <span v-else>未开始</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import type { PositionItem } from "@comp/pageHome/ph-comp-position.vue";

import { parseLink } from "@/utils/linkParser.js";
import { createPost } from "@/utils/TGWindow.js";
import { stamp2LastTime, timestampToDate } from "@/utils/toolFunc.js";

type PhPositionCardProps = { position: PositionItem };
const props = defineProps<PhPositionCardProps>();

async function openPosition(card: TGApp.Plugins.Mys.Position.RenderCard): Promise<void> {
  const res = await parseLink(card.link);
  if (res === "post") await createPost(card.postId, card.title);
  if (res === false) {
    showSnackbar.warn(`未知链接:${card.link}`, 3000);
    return;
  }
}
</script>
<style lang="css" scoped>
.ph-pool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 4px;
  background: var(--box-bg-1);
  box-shadow: 0 0 5px var(--common-shadow-2);
  color: var(--box-text-1);
}

.dark .ph-pool-card {
  border: 1px solid var(--common-shadow-1);
  box-shadow: unset;
}

.top {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 2px solid var(--common-shadow-2);

  .main {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: 8px;

    .left {
      position: relative;
      overflow: hidden;
      width: 40px;
      height: 40px;
      border-radius: 3px;
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

    .right {
      position: relative;
      display: flex;
      height: 100%;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;

      .title {
        font-family: var(--font-title);
        font-size: 16px;
      }

      .sub {
        font-size: 14px;
        opacity: 0.8;
      }
    }
  }

  .btn {
    border: 1px solid var(--common-shadow-4);
    border-radius: 5px;
    background: var(--tgc-btn-1);
    color: var(--btn-text);
    font-family: var(--font-title);
  }
}

.bottom {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 14px;
  gap: 6px;

  .period {
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

  .rest {
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
}
</style>
