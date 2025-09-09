<template>
  <div :id="`anno_card_${model.id}`" class="anno-card">
    <div :title="model.title" class="anno-cover" @click="createAnno">
      <TMiImg v-if="model.banner !== ''" :ori="true" :src="model.banner" alt="cover" />
      <img v-else alt="cover" src="/source/UI/defaultCover.webp" />
      <div class="anno-info">
        <div class="anno-time">
          <v-icon>mdi-clock-time-four-outline</v-icon>
          <span>{{ timeStr }}</span>
        </div>
      </div>
    </div>
    <div :title="model.title" class="anno-title" @click="shareAnno">
      {{ parseTitle(model.subtitle) }}
    </div>
    <div :title="`标签：${model.tagLabel}`" class="anno-label">
      <TMiImg :src="model.tagIcon" alt="tag" :ori="true" />
      <span>{{ model.tagLabel }}</span>
    </div>
    <div class="anno-id">{{ model.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { AnnoTypeEnum } from "@enum/anno.js";
import useAppStore from "@store/app.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { createTGWindow } from "@utils/TGWindow.js";
import { decodeRegExp } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

import type { AnnoCard } from "@/pages/common/PageAnno.vue";

const { server, lang } = storeToRefs(useAppStore());
const model = defineModel<AnnoCard>({ required: true });
const timeStr = ref<string>(model.value.timeStr);

onMounted(() => refreshAnnoTime());
watch(
  () => model.value,
  (newVal, oldVal) => {
    if (newVal.id !== oldVal.id) refreshAnnoTime();
  },
);

function parseTitle(title: string): string {
  const dom = new DOMParser().parseFromString(title, "text/html");
  return dom.body.innerText;
}

async function createAnno(): Promise<void> {
  const annoPath = `/anno_detail/${server.value}/${model.value.id}/${lang.value}`;
  const annoTitle = `Anno_${model.value.id} ${model.value.title}`;
  await TGLogger.Info(`[Announcements][createAnno][${model.value.id}] 打开公告窗口`);
  await createTGWindow(annoPath, "Sub_window", annoTitle, 960, 720, false, false);
}

async function shareAnno(): Promise<void> {
  const fileName = `AnnoCard_${model.value.id}_${model.value.subtitle}`;
  const element = document.querySelector<HTMLElement>(`#anno_card_${model.value.id}`);
  if (element === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  await generateShareImg(fileName, element, 2.5);
}

async function refreshAnnoTime(): Promise<void> {
  if (model.value.typeLabel === AnnoTypeEnum.GAME) timeStr.value = model.value.timeStr;
  const strGet = getAnnoTime(model.value.detail.content);
  if (strGet !== false) timeStr.value = strGet;
}

function getAnnoTime(content: string): string | false {
  const regexes = [
    /〓活动时间〓.*?(\d\.\d|「月之[一二三四五六七八九]」)版本期间持续开放/,
    /(?:〓活动时间〓|〓任务开放时间〓).*?(?:(\d\.\d|「月之[一二三四五六七八九]」)版本更新(?:完成|)|&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt; *?)后永久开放/s,
    /(?:〓活动时间〓|祈愿时间|【上架时间】|〓折扣时间〓|〓获取奖励时限〓).*?(\d\.\d|「月之[一二三四五六七八九]」)版本更新后.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
    /(?:〓(?:活动|折扣)时间〓|祈愿时间|【上架时间】).*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
    // /〓活动时间〓.*?(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*?(\d\.\d版本结束)/
    /〓活动时间〓.*?(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}).*?((\d\.\d|「月之[一二三四五六七八九]」)版本结束)/s,
  ];
  if (content.match(regexes[0])) {
    const res = content.match(regexes[0]);
    return (
      res?.[0].replace(/.*?((\d\.\d|「月之[一二三四五六七八九]」)版本期间持续开放)/, "$1") ?? false
    );
  }
  if (content.match(regexes[1])) {
    const res = content.match(regexes[1]);
    if (res === null) return false;
    const regex2 = /(\d\.\d|「月之[一二三四五六七八九]」)版本更新(?:完成|)后永久开放/;
    const regex3 = /\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/;
    const res2 = res[0].match(regex2);
    if (res2 !== null) return res2[0];
    const res3 = res[0].match(regex3);
    return res3 === null ? false : `${res3[0]} 后永久开放`;
  }
  if (content.match(regexes[2])) {
    const res = content.match(regexes[2]);
    if (res?.[1]?.match(/(\d\.\d|「月之[一二三四五六七八九]」)/)) {
      const parser = new DOMParser().parseFromString(decodeRegExp(res[2]), "text/html");
      return `${res?.[1]}版本更新后 ~ ${parser.body.innerText}`;
    }
    return `${res?.[1]} ~ ${res?.[2]}`;
  }
  if (content.match(regexes[3])) {
    const res = content.match(regexes[3]);
    try {
      const span1 = document.createElement("span");
      span1.innerHTML = res?.[1] ?? "";
      const span2 = document.createElement("span");
      span2.innerHTML = res?.[2] ?? "";
      return `${span1.innerText} ~ ${span2.innerText}`;
    } catch (e) {
      console.error(e);
    }
    return `${res?.[1]} ~ ${res?.[2]}`;
  }
  if (content.match(regexes[4])) {
    const res = content.match(regexes[4]);
    if (res !== null) {
      const cnt = res[0].match(/〓/g);
      if (cnt && cnt.length > 2) return false;
    }
    return `${res?.[1]} ~ ${res?.[2]}`;
  }
  return false;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.anno-card {
  @include github-styles.github-card;

  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  border-radius: 6px;
}

.dark .anno-card {
  @include github-styles.github-card("dark");
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
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px;
  margin-left: auto;
  cursor: pointer;
  font-size: 18px;
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
  background: #00000080;
  font-size: 12px;
}

.anno-time {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 4px;
  color: var(--tgc-white-1);
  gap: 4px;
}

.anno-label {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  background-color: var(--tgc-od-white);
  border-bottom-left-radius: 6px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  opacity: 0.8;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}

.anno-label img {
  width: 20px;
  height: 20px;
  margin-right: 4px;
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
  padding: 0 4px;
  background: var(--tgc-od-orange);
  border-bottom-right-radius: 6px;
  border-top-left-radius: 6px;
  box-shadow: 0 0 8px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  opacity: 0.8;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}
</style>
