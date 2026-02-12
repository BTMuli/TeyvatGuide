<template>
  <div :id="`anno_card_${props.anno.ann_id}`" class="anno-card" @click="console.log(props)">
    <div :title="props.anno.title" class="anno-cover" @click="createAnno">
      <TMiImg v-if="props.anno.banner !== ''" :ori="true" :src="props.anno.banner" alt="cover" />
      <img v-else alt="cover" src="/UI/post/defaultCover.webp" />
      <div class="anno-info">
        <div class="anno-time">
          <v-icon>mdi-clock-time-four-outline</v-icon>
          <span>{{ timeStr }}</span>
        </div>
      </div>
    </div>
    <div :title="props.anno.title" class="anno-title" @click="shareAnno">
      {{ parseTitle(props.anno.subtitle) }}
    </div>
    <div :title="`标签：${annoTag}`" class="anno-label">
      <TMiImg :ori="true" :src="props.anno.tag_icon" alt="tag" />
      <span>{{ annoTag }}</span>
    </div>
    <div class="anno-id">ID:{{ props.anno.ann_id }}</div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import useAppStore from "@store/app.js";
import { str2Color } from "@utils/colorFunc.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { createTGWindow } from "@utils/TGWindow.js";
import { decodeRegExp } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

type TaCardProps = { anno: TGApp.Game.Anno.ListAnno; detail?: TGApp.Game.Anno.AnnoDetail };

const { server, lang } = storeToRefs(useAppStore());

const props = defineProps<TaCardProps>();
const timeStr = ref<string>("");

const annoTag = computed<string>(() => getTag());
const idColor = computed<string>(() => str2Color(`${props.anno.ann_id}`, 0));
const tagColor = computed<string>(() => str2Color(`${props.anno.tag_icon}${annoTag.value}`, 40));

onMounted(() => refreshAnnoTime());

watch(
  () => props.anno,
  (newVal, oldVal) => {
    if (newVal.ann_id !== oldVal.ann_id) refreshAnnoTime();
  },
);

function getTag(): string {
  switch (props.anno.tag_label) {
    case "1":
    case "11":
    case "重要":
      return "公告";
    case "2":
    case "扭蛋":
      return "祈愿";
    case "3":
      return "活动";
    default:
      return props.anno.tag_label;
  }
}

function parseTitle(title: string): string {
  const dom = new DOMParser().parseFromString(title, "text/html");
  return dom.body.innerText;
}

async function createAnno(): Promise<void> {
  const annoPath = `/anno_detail/${server.value}/${props.anno.ann_id}/${lang.value}`;
  const annoTitle = `Anno_${props.anno.ann_id} ${props.anno.title}`;
  await TGLogger.Info(`[Announcements][createAnno][${props.anno.ann_id}] 打开公告窗口`);
  await createTGWindow(annoPath, "Sub_window", annoTitle, 960, 720, false, false);
}

async function shareAnno(): Promise<void> {
  const fileName = `AnnoCard_${props.anno.ann_id}_${props.anno.subtitle}`;
  const element = document.querySelector<HTMLElement>(`#anno_card_${props.anno.ann_id}`);
  if (element === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  await generateShareImg(fileName, element, 2.5);
}

async function refreshAnnoTime(): Promise<void> {
  // MAGIC ANNO TYPE
  if (props.anno.type !== 1) timeStr.value = `${props.anno.start_time} ~ ${props.anno.end_time}`;
  const strGet = getAnnoTime(props.detail?.content ?? "");
  if (strGet !== false) timeStr.value = strGet;
  else timeStr.value = `${props.anno.start_time} ~ ${props.anno.end_time}`;
}

function getAnnoTime(content: string): string | false {
  const regexes = [
    /〓活动时间〓.*?(\d\.\d|「月之[一二三四五六七八九]」)版本期间持续开放/,
    /(?:〓活动时间〓|〓(任务|玩法)开放时间〓).*?(?:(\d\.\d|「月之[一二三四五六七八九]」)版本更新(?:完成|)|&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt; *?)后永久开放/s,
    /(?:〓活动时间〓|祈愿时间|【上架时间】|〓折扣时间〓|〓获取奖励时限〓).*?(\d\.\d|「月之[一二三四五六七八九]」)版本更新后.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
    /(?:〓(?:活动|折扣)时间〓|祈愿时间|【上架时间】).*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
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

  img {
    width: 100%;
    object-fit: cover;
    object-position: center;
    transition: all 0.3s linear;

    &:hover {
      transform: scale(1.1);
      transition: all 0.3s linear;
    }
  }
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
  word-break: break-all;
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
  background: v-bind(tagColor); /* stylelint-disable-line value-keyword-case */
  border-bottom-left-radius: 6px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  text-shadow: 0 0 4px var(--tgc-dark-1);

  img {
    width: 20px;
    height: 20px;
    margin-right: 4px;
  }
}

.anno-id {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  background: v-bind(idColor); /* stylelint-disable-line value-keyword-case */
  border-bottom-right-radius: 4px;
  box-shadow: 0 0 8px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 4px var(--tgc-dark-1);
}
</style>
