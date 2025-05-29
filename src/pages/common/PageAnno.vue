<template>
  <v-app-bar>
    <template #prepend>
      <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
        <v-tab v-for="(value, index) in tabValues" :key="index" :value="value">
          {{ annoMap[value] }}
        </v-tab>
      </v-tabs>
      <div class="anno-selects">
        <v-select
          class="anno-select"
          :items="annoServerList"
          v-model="server"
          item-title="text"
          item-value="value"
          label="服务器"
          width="200px"
          density="compact"
          :disabled="isReq"
        />
        <v-select
          class="anno-select"
          :items="annoLangList"
          v-model="lang"
          item-title="text"
          item-value="value"
          label="语言"
          width="200px"
          density="compact"
          :disabled="isReq"
        />
      </div>
    </template>
    <template #append>
      <v-btn class="anno-switch-btn" @click="switchNews" prepend-icon="mdi-bullhorn">
        切换米游社咨讯
      </v-btn>
    </template>
  </v-app-bar>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="anno-grid">
        <TaCard
          v-for="item in annoCards[value]"
          :key="item.id"
          :model-value="item"
          :region="server"
          :lang="lang"
        />
      </div>
    </v-window-item>
  </v-window>
</template>

<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TaCard from "@comp/pageAnno/ta-card.vue";
import hk4eReq, { type AnnoLang, type AnnoServer } from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

type AnnoSelect<T = string> = { text: string; value: T };
type AnnoKey = "activity" | "game";
export type AnnoCard = {
  id: number;
  title: string;
  subtitle: string;
  banner: string;
  typeLabel: string;
  tagIcon: string;
  tagLabel: string;
  timeStr: string;
};
type AnnoList = { [key in AnnoKey]: Array<AnnoCard> };

const annoServerList: Array<AnnoSelect<AnnoServer>> = [
  { text: "国服-官方服", value: "cn_gf01" },
  { text: "国服-渠道服", value: "cn_qd01" },
  { text: "国际服-亚服", value: "os_asia" },
  { text: "国际服-欧服", value: "os_euro" },
  { text: "国际服-美服", value: "os_usa" },
  { text: "国际服-港澳台服", value: "os_cht" },
];
const annoLangList: Array<AnnoSelect> = [
  { text: "简体中文", value: "zh-cn" },
  { text: "繁体中文", value: "zh-tw" },
  { text: "English", value: "en" },
  { text: "日本語", value: "ja" },
];
const annoMap: Readonly<Record<AnnoKey, string>> = { activity: "活动公告", game: "游戏公告" };

const { server, lang } = storeToRefs(useAppStore());
const router = useRouter();
const tabValues: Readonly<Array<AnnoKey>> = ["activity", "game"];
const tab = ref<AnnoKey>("activity");
const annoCards = shallowRef<AnnoList>({ activity: [], game: [] });
const isReq = ref<boolean>(false);

watch(
  () => server.value,
  async () => {
    const name = getRegionName(server.value);
    await TGLogger.Info(`[Announcements][watch][curRegionName] 切换服务器：${name}`);
    await loadData();
    showSnackbar.success(`服务器切换为：${name}`);
  },
);

watch(
  () => lang.value,
  async () => {
    const name = getLangName(lang.value);
    await TGLogger.Info(`[Announcements][watch][curLangName] 切换语言：${name}`);
    await loadData();
    showSnackbar.success(`语言切换为：${name}`);
  },
);

onMounted(async () => {
  await TGLogger.Info("[Announcements][onMounted] 打开公告页面");
  await loadData();
});

async function loadData(): Promise<void> {
  if (isReq.value) return;
  isReq.value = true;
  await showLoading.start(
    "正在获取公告数据",
    `服务器：${getRegionName(server.value)}，语言：${getLangName(lang.value)}`,
  );
  const annoData = await hk4eReq.anno.list(server.value, lang.value);
  const listCards = annoData.list.map((list) => list.list.map((anno) => getAnnoCard(anno))).flat();
  annoCards.value = {
    activity: listCards.filter((item) => item.typeLabel === "activity"),
    game: listCards.filter((item) => item.typeLabel === "game"),
  };
  await showLoading.end();
  isReq.value = false;
}

function getAnnoTag(tag: string): string {
  switch (tag) {
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
      return tag;
  }
}

function getAnnoCard(anno: TGApp.BBS.Announcement.AnnoSingle): AnnoCard {
  const timeStart = anno.start_time.split(" ")[0];
  const timeEnd = anno.end_time.split(" ")[0];
  const time = `${timeStart} ~ ${timeEnd}`;
  return {
    id: anno.ann_id,
    title: anno.title,
    subtitle: anno.subtitle.replace(/<br \/>/g, " "),
    banner: anno.banner,
    typeLabel: anno.type === 2 ? "game" : "activity",
    tagIcon: anno.tag_icon,
    tagLabel: getAnnoTag(anno.tag_label),
    timeStr: time,
  };
}

function getRegionName(value: AnnoServer): string {
  return annoServerList.find((item) => item.value === value)?.text ?? annoServerList[0].text;
}

function getLangName(value: AnnoLang): string {
  return annoLangList.find((item) => item.value === value)?.text ?? annoLangList[0].text;
}

async function switchNews(): Promise<void> {
  await TGLogger.Info("[Announcements][switchNews] 切换米游社咨讯");
  await router.push("/news/2");
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
  margin-right: 16px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .anno-switch-btn {
  border: 1px solid var(--common-shadow-2);
}

.anno-grid {
  display: grid;
  font-family: var(--font-title);
  grid-auto-rows: auto;
  grid-gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}
</style>
