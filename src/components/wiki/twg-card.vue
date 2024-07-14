<template>
  <v-card class="twg-box" @click="toWiki" :title.attr="props.data.name">
    <img class="twg-border" src="/WIKI/GCG/bg/special.webp" alt="border" />
    <img class="twg-cover" :src="props.data.icon" alt="cover" />
    <div class="twg-name">
      <span>{{ props.data.name }}</span>
    </div>
  </v-card>
</template>
<script lang="ts" setup>
import Mys from "../../plugins/Mys/index.js";
import { createTGWindow } from "../../utils/TGWindow.js";
import showSnackbar from "../func/snackbar.js";

interface TwgCardProps {
  data: TGApp.App.GCG.WikiBriefInfo;
}

const props = defineProps<TwgCardProps>();

async function toWiki(): Promise<void> {
  if (!props.data.contentId || props.data.contentId === 0) {
    showSnackbar({
      text: `卡牌 ${props.data.name} 暂无外部链接`,
      color: "error",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", props.data.contentId.toString());
  await createTGWindow(
    url,
    "Sub_window",
    `Content_${props.data.contentId} ${props.data.name}`,
    1200,
    800,
    true,
  );
}
</script>
<style lang="css" scoped>
.twg-box {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 10px;
  aspect-ratio: 7 / 12;
  transition: all 0.3s;
}

.twg-cover {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  transition: all 0.3s;
}

.twg-box:hover .twg-cover {
  transform: scale(1.2);
  transition: all 0.5s;
}

.twg-border {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.twg-name {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 10px 10px;
  background: rgb(0 0 0 / 50%);
  color: white;
}

.twg-name span {
  overflow: hidden;
  margin: 0 10px;
  font-size: 14px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
</style>
