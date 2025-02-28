<template>
  <div :id="`anno_card_${props.modelValue.id}`" class="anno-card">
    <div class="anno-cover" :title="props.modelValue.title" @click="createAnno">
      <TMiImg
        :src="props.modelValue.banner"
        alt="cover"
        :ori="true"
        v-if="props.modelValue.banner !== ''"
      />
      <img alt="cover" src="/source/UI/defaultCover.webp" v-else />
      <div class="anno-info">
        <div class="anno-time">
          <v-icon>mdi-clock-time-four-outline</v-icon>
          <span>{{ props.modelValue.timeStr }}</span>
        </div>
      </div>
    </div>
    <div class="anno-title" :title="props.modelValue.title" @click="shareAnno">
      {{ parseTitle(props.modelValue.subtitle) }}
    </div>
    <div class="anno-label" :title="`标签：${props.modelValue.tagLabel}`">
      <TMiImg :src="props.modelValue.tagIcon" alt="tag" :ori="true" />
      <span>{{ props.modelValue.tagLabel }}</span>
    </div>
    <div class="anno-id">{{ props.modelValue.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";

import TGLogger from "@/utils/TGLogger.js";
import { generateShareImg } from "@/utils/TGShare.js";
import { createTGWindow } from "@/utils/TGWindow.js";

type TAnnoCardProps = { region: string; modelValue: TGApp.App.Announcement.ListCard; lang: string };
const props = defineProps<TAnnoCardProps>();

function parseTitle(title: string): string {
  const dom = new DOMParser().parseFromString(title, "text/html");
  return dom.body.innerText;
}

async function createAnno(): Promise<void> {
  const annoPath = `/anno_detail/${props.region}/${props.modelValue.id}/${props.lang}`;
  const annoTitle = `Anno_${props.modelValue.id} ${props.modelValue.title}`;
  await TGLogger.Info(`[Announcements][createAnno][${props.modelValue.id}] 打开公告窗口`);
  await createTGWindow(annoPath, "Sub_window", annoTitle, 960, 720, false, false);
}

async function shareAnno(): Promise<void> {
  const fileName = `AnnoCard_${props.modelValue.id}_${props.modelValue.subtitle}`;
  const element = document.querySelector<HTMLElement>(`#anno_card_${props.modelValue.id}`);
  if (element === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  await generateShareImg(fileName, element, 2.5);
}
</script>
<style lang="css" scoped>
.anno-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  box-shadow: 2px 2px 5px var(--common-shadow-2);
}

.anno-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: flex-start;
  justify-content: center;
  aspect-ratio: 36 / 13;
  cursor: pointer;
}

.anno-cover img {
  width: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.anno-title {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: 5px;
  cursor: pointer;
  font-size: 18px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anno-info {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/50%);
  font-size: 12px;
}

.anno-time {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 5px;
  color: var(--tgc-white-1);
  gap: 5px;
}

.anno-label {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  background-color: var(--tgc-od-white);
  border-bottom-left-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  opacity: 0.8;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}

.anno-label img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.anno-cover img:hover {
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.anno-id {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  background: var(--tgc-od-orange);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  opacity: 0.8;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}
</style>
