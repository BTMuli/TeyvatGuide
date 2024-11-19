<template>
  <div :id="`anno_card_${props.modelValue.id}`" class="anno-card">
    <div class="anno-cover" :title="props.modelValue.title" @click="createAnno">
      <img :src="localBanner" alt="cover" v-if="localBanner" />
      <v-progress-circular
        color="primary"
        :indeterminate="true"
        v-else-if="props.modelValue.banner !== ''"
      />
      <img src="/source/UI/defaultCover.webp" alt="cover" v-else />
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
      <img :src="localTag" alt="tag" v-if="localTag" />
      <v-icon v-else>mdi-tag</v-icon>
      <span>{{ props.modelValue.tagLabel }}</span>
    </div>
    <div class="anno-id">{{ props.modelValue.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from "vue";

import TGLogger from "../../utils/TGLogger.js";
import { generateShareImg, saveImgLocal } from "../../utils/TGShare.js";
import { createTGWindow } from "../../utils/TGWindow.js";

interface TAnnoCardProps {
  region: string;
  modelValue: TGApp.App.Announcement.ListCard;
  lang: string;
}

const props = defineProps<TAnnoCardProps>();
const localBanner = ref<string>();
const localTag = ref<string>();

onMounted(async () => {
  if (props.modelValue.banner !== "") {
    localBanner.value = await saveImgLocal(props.modelValue.banner);
  }
  localTag.value = await saveImgLocal(props.modelValue.tagIcon);
});

watch(
  () => props.modelValue,
  async () => {
    if (localBanner.value && localBanner.value.startsWith("blob:")) {
      URL.revokeObjectURL(localBanner.value);
      localBanner.value = undefined;
    }
    if (props.modelValue.banner !== "") {
      localBanner.value = await saveImgLocal(props.modelValue.banner);
    }
    if (localTag.value && localTag.value.startsWith("blob:")) {
      URL.revokeObjectURL(localTag.value);
      localTag.value = undefined;
    }
    localTag.value = await saveImgLocal(props.modelValue.tagIcon);
  },
);

onUnmounted(() => {
  if (localBanner.value) URL.revokeObjectURL(localBanner.value);
  if (localTag.value) URL.revokeObjectURL(localTag.value);
});

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
  const element = <HTMLElement>document.querySelector(`#anno_card_${props.modelValue.id}`);
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
  align-items: center;
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
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-2);
  border-bottom-left-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
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
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-1);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
  box-shadow: 2px 2px 5px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}
</style>
