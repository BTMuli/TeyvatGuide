<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <v-app-bar>
    <template #prepend>
      <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
        <v-tab v-for="(value, index) in tabValues" :key="index" :value="value">
          {{ AnnoType[value] }}
        </v-tab>
      </v-tabs>
      <div class="anno-selects">
        <v-select
          class="anno-select"
          :items="annoServerList"
          v-model="curRegion"
          item-title="text"
          item-value="value"
          label="服务器"
          width="200px"
          density="compact"
        />
        <v-select
          class="anno-select"
          :items="annoLangList"
          v-model="curLang"
          item-title="text"
          item-value="value"
          label="语言"
          width="200px"
          density="compact"
        />
      </div>
    </template>
    <template #append>
      <v-btn class="anno-switch-btn" @click="switchNews">
        <template #prepend>
          <v-icon>mdi-bullhorn</v-icon>
        </template>
        切换米游社咨讯
      </v-btn>
    </template>
  </v-app-bar>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="anno-grid">
        <v-card :rounded="true" v-for="item in annoCards[value]" :key="item.id">
          <div class="anno-cover" :title="item.title">
            <img :src="item.banner" alt="cover" @click="createAnno(item)" />
            <div class="anno-info">
              <div class="anno-time">
                <v-icon>mdi-clock-time-four-outline</v-icon>
                <span>{{ item.timeStr }}</span>
              </div>
            </div>
          </div>
          <div class="anno-title" :title="item.title">{{ parseTitle(item.subtitle) }}</div>
          <div class="anno-label" :title="`标签：${item.tagLabel}`">
            <img :src="item.tagIcon" alt="tag" />
            <span>{{ item.tagLabel }}</span>
          </div>
        </v-card>
      </div>
    </v-window-item>
  </v-window>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import showSnackbar from "../../components/func/snackbar.js";
import ToLoading from "../../components/overlay/to-loading.vue";
import { useAppStore } from "../../store/modules/app.js";
import TGLogger from "../../utils/TGLogger.js";
import { createTGWindow } from "../../utils/TGWindow.js";
import { AnnoLang, AnnoServer } from "../../web/request/getAnno.js";
import TGRequest from "../../web/request/TGRequest.js";
import TGUtils from "../../web/utils/TGUtils.js";
import { decodeRegExp } from "../../web/utils/tools.js";

type AnnoSelect = { text: string; value: string };

const annoServerList: AnnoSelect[] = [
  { text: "国服-官方服", value: AnnoServer.CN_ISLAND },
  { text: "国服-渠道服", value: AnnoServer.CN_TREE },
  { text: "国际服-亚服", value: AnnoServer.OS_ASIA },
  { text: "国际服-欧服", value: AnnoServer.OS_EURO },
  { text: "国际服-美服", value: AnnoServer.OS_USA },
  { text: "国际服-港澳台服", value: AnnoServer.OS_CHT },
];
const annoLangList: AnnoSelect[] = [
  { text: "简体中文", value: "zh-cn" },
  { text: "繁体中文", value: "zh-tw" },
  { text: "English", value: "en" },
  { text: "日本語", value: "ja" },
];

// 类型定义
enum AnnoType {
  activity = "活动公告",
  game = "游戏公告",
}

type AnnoKey = keyof typeof AnnoType;
type AnnoCard = {
  [key in AnnoKey]: TGApp.App.Announcement.ListCard[];
};

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>("请稍后");

const appStore = useAppStore();

// 路由
const router = useRouter();
const curRegion = ref<AnnoServer>(appStore.server);
const curLang = ref<AnnoLang>(appStore.lang);

// 数据
const tab = ref<AnnoKey>("activity");
const tabValues = ref<Array<AnnoKey>>(["activity", "game"]);
const annoCards = ref<AnnoCard>({
  activity: [],
  game: [],
});

watch(curRegion, async (value) => {
  appStore.server = value;
  const name = getRegionName(value);
  await TGLogger.Info(`[Announcements][watch][curRegionName] 切换服务器：${name}`);
  await loadData();
  showSnackbar({ text: `服务器切换为：${name}`, color: "success" });
});

watch(curLang, async (value) => {
  appStore.lang = value;
  const name = getLangName(value);
  await TGLogger.Info(`[Announcements][watch][curLangName] 切换语言：${name}`);
  await loadData();
  showSnackbar({ text: `语言切换为：${name}`, color: "success" });
});

onMounted(async () => {
  await TGLogger.Info("[Announcements][onMounted] 打开公告页面");
  curRegion.value = appStore.server;
  curLang.value = appStore.lang;
  await loadData();
});

async function loadData(): Promise<void> {
  loadingTitle.value = "正在获取公告数据";
  loadingSub.value = `服务器：${getRegionName(curRegion.value)}，语言：${getLangName(curLang.value)}`;
  loading.value = true;
  const annoData = await TGRequest.Anno.getList(curRegion.value, curLang.value);
  const listCards = TGUtils.Anno.getCard(annoData);
  await Promise.all(
    listCards.map(async (item) => {
      if (item.typeLabel === AnnoType.game) return;
      const detail = await TGRequest.Anno.getContent(item.id, curRegion.value, "zh-cn");
      const timeStr = getAnnoTime(detail.content);
      if (timeStr !== false) item.timeStr = timeStr;
    }),
  );
  annoCards.value = {
    activity: listCards.filter((item) => item.typeLabel === AnnoType.activity),
    game: listCards.filter((item) => item.typeLabel === AnnoType.game),
  };
  loadingTitle.value = "正在渲染公告数据";
  await nextTick(async () => {
    loading.value = false;
  });
}

function getRegionName(value: AnnoServer): string {
  return annoServerList.find((item) => item.value === value)?.text ?? annoServerList[0].text;
}

function getLangName(value: AnnoLang): string {
  return annoLangList.find((item) => item.value === value)?.text ?? annoLangList[0].text;
}

function getAnnoTime(content: string): string | false {
  const regexes = [
    /〓活动时间〓.*?\d\.\d版本期间持续开放/,
    /(?:〓活动时间〓|〓任务开放时间〓).*?(?:(\d\.\d)版本更新(?:完成|)|&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt; *?)后永久开放/s,
    /(?:〓活动时间〓|祈愿时间|【上架时间】|〓折扣时间〓|〓获取奖励时限〓).*?(\d\.\d)版本更新后.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
    /(?:〓(?:活动|折扣)时间〓|祈愿时间|【上架时间】).*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/s,
    // /〓活动时间〓.*?(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*?(\d\.\d版本结束)/
    /〓活动时间〓.*?(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}).*?(\d\.\d版本结束)/s,
  ];
  if (content.match(regexes[0])) {
    const res = content.match(regexes[0]);
    return res?.[0].replace(/.*?(\d\.\d版本期间持续开放)/, "$1") ?? false;
  }
  if (content.match(regexes[1])) {
    const res = content.match(regexes[1]);
    if (res === null) return false;
    const regex2 = /\d\.\d版本更新(?:完成|)后永久开放/;
    const regex3 = /\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/;
    const res2 = res[0].match(regex2);
    if (res2 !== null) return res2[0];
    const res3 = res[0].match(regex3);
    return res3 === null ? false : `${res3[0]} 后永久开放`;
  }
  if (content.match(regexes[2])) {
    const res = content.match(regexes[2]);
    if (res?.[1]?.match(/\d\.\d/)) {
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

function parseTitle(title: string): string {
  const dom = new DOMParser().parseFromString(title, "text/html");
  return dom.body.innerText;
}

async function switchNews(): Promise<void> {
  await TGLogger.Info("[Announcements][switchNews] 切换米游社咨讯");
  await router.push("/news/2");
}

async function createAnno(item: TGApp.App.Announcement.ListCard): Promise<void> {
  const annoPath = `/anno_detail/${curRegion.value}/${item.id}/${curLang.value}`;
  const annoTitle = `Anno_${item.id} ${item.title}`;
  await TGLogger.Info(`[Announcements][createAnno][${item.id}] 打开公告窗口`);
  await createTGWindow(annoPath, "Sub_window", annoTitle, 960, 720, false, false);
}
</script>

<style lang="css" scoped>
.anno-tab {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-selects {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 25px;
  margin: 0 10px;
  gap: 10px;
}

.anno-select {
  width: 150px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-switch-btn {
  height: 40px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .anno-switch-btn {
  border: 1px solid var(--common-shadow-2);
}

.anno-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}

.anno-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  aspect-ratio: 36 / 13;
}

.anno-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.anno-title {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: 5px;
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
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}
</style>
