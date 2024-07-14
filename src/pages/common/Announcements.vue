<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
    <v-tab v-for="(value, index) in tabValues" :key="index" :value="value">
      {{ AnnoType[value] }}
    </v-tab>
    <v-select
      class="anno-select"
      :items="annoServerList"
      v-model="curRegionName"
      label="服务器"
      dense
      outlined
    />
    <v-select
      class="anno-select"
      :items="langList"
      v-model="curLangName"
      label="语言"
      dense
      outlined
    />
    <v-spacer />
    <v-btn class="anno-switch-btn" @click="switchNews">
      <template #prepend>
        <v-icon>mdi-bullhorn</v-icon>
      </template>
      切换米游社咨讯
    </v-btn>
  </v-tabs>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="anno-grid">
        <v-card rounded v-for="item in annoCards[value]" :key="item.id">
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

import ToLoading from "../../components/overlay/to-loading.vue";
import { useAppStore } from "../../store/modules/app.js";
import TGLogger from "../../utils/TGLogger.js";
import { createTGWindow } from "../../utils/TGWindow.js";
import { AnnoLang, AnnoServer } from "../../web/request/getAnno.js";
import TGRequest from "../../web/request/TGRequest.js";
import TGUtils from "../../web/utils/TGUtils.js";

// 服务器名称-服务器对应
type AnnoServerMap = {
  [key: string]: AnnoServer;
};

const annoServerList: string[] = [
  "国服-官方服",
  "国服-渠道服",
  "国际服-亚服",
  "国际服-欧服",
  "国际服-美服",
  "国际服-港澳台服",
];
const langList: string[] = ["简体中文", "繁体中文", "English", "日本語"];

// 服务器列表
const annoServerMap: AnnoServerMap = {
  "国服-官方服": AnnoServer.CN_ISLAND,
  "国服-渠道服": AnnoServer.CN_TREE,
  "国际服-亚服": AnnoServer.OS_ASIA,
  "国际服-欧服": AnnoServer.OS_EURO,
  "国际服-美服": AnnoServer.OS_USA,
  "国际服-港澳台服": AnnoServer.OS_CHT,
};
const langMap: Record<string, AnnoLang> = {
  简体中文: "zh-cn",
  繁体中文: "zh-tw",
  English: "en",
  日本語: "ja",
};

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

const appStore = useAppStore();

// 路由
const router = useRouter();
const curRegion = ref<AnnoServer>(appStore.server);
const curRegionName = ref<string>(annoServerList[0]);
const curLang = ref<AnnoLang>(appStore.lang);
const curLangName = ref<string>(langList[0]);

// 数据
const tab = ref<AnnoKey>("activity");
const tabValues = ref<Array<AnnoKey>>(["activity", "game"]);
const annoCards = ref<AnnoCard>({
  activity: [],
  game: [],
});

watch(curRegionName, async (value) => {
  appStore.server = annoServerMap[value] || AnnoServer.CN_ISLAND;
  curRegion.value = annoServerMap[value] || AnnoServer.CN_ISLAND;
  await TGLogger.Info(`[Announcements][watch][curRegionName] 切换服务器：${value}`);
  await loadData();
});

watch(curLangName, async (value) => {
  appStore.lang = langMap[value] || "zh-cn";
  curLang.value = langMap[value] || "zh-cn";
  await TGLogger.Info(`[Announcements][watch][curLang] 切换语言：${value}`);
  await loadData();
});

onMounted(async () => {
  await TGLogger.Info("[Announcements][onMounted] 打开公告页面");
  for (const key in annoServerMap) {
    if (annoServerMap[key] === curRegion.value) {
      curRegionName.value = key;
      break;
    }
  }
  for (const key in langMap) {
    if (langMap[key] === curLang.value) {
      curLangName.value = key;
      break;
    }
  }
  await loadData();
});

async function loadData(): Promise<void> {
  loadingTitle.value = "正在获取公告数据";
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

function getAnnoTime(content: string): string | false {
  const regexes = [
    /〓活动时间〓.*?\d\.\d版本期间持续开放/,
    /(?:〓活动时间〓|〓任务开放时间〓).*?(?:(\d\.\d版本更新(?:完成|))|(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*?)后永久开放/,
    /(?:〓(?:活动|折扣)时间〓|祈愿时间|【上架时间】).*?(\d\.\d版本更新后).*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/,
    /(?:〓(?:活动|折扣)时间〓|祈愿时间|【上架时间】).*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;.*?~.*?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&lt;\/t&gt;/,
    /〓活动时间〓.*?(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*?(\d\.\d版本结束)/,
    /〓更新时间〓.+?&lt;t class="t_(?:gl|lc)".*?&gt;(.*?)&;lt;\/t&gt;/,
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
    return `${res?.[1]} ~ ${res?.[2]}`;
  }
  if (content.match(regexes[3])) {
    const res = content.match(regexes[3]);
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
  if (content.match(regexes[5])) {
    console.log("verUpdateTime");
    // todo 待处理
    return false;
  }
  return false;
}

function parseTitle(title: string): string {
  const div = document.createElement("div");
  div.innerHTML = title;
  return div.innerText;
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
  margin-bottom: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-select {
  width: 150px;
  margin-left: 10px;
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
