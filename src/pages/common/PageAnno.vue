<!-- 公告页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pa-prepend">
        <v-tabs v-model="tab" align-tabs="start" class="pa-tabs">
          <v-tab v-for="(tab, index) in tabList" :key="index" :value="tab.value">
            {{ tab.text }}
          </v-tab>
        </v-tabs>
        <div class="pa-selects">
          <v-select
            v-model="server"
            :disabled="isReq"
            :items="serverList"
            class="anno-select"
            density="compact"
            item-title="text"
            item-value="value"
            label="服务器"
            width="200px"
          />
          <v-select
            v-model="lang"
            :disabled="isReq"
            :items="langList"
            class="anno-select"
            density="compact"
            item-title="text"
            item-value="value"
            label="语言"
            width="200px"
          />
        </div>
      </div>
    </template>
    <template #append>
      <div class="anno-top-append">
        <v-btn
          class="anno-btn"
          prepend-icon="mdi-bullhorn"
          rounded
          variant="elevated"
          @click="switchNews"
        >
          切换米游社资讯
        </v-btn>
        <v-btn
          v-if="isLogin"
          class="anno-btn"
          size="small"
          variant="elevated"
          @click="showIframe()"
        >
          <v-icon>mdi-web</v-icon>
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <v-window v-model="tab">
    <v-window-item v-for="(tab, index) in tabList" :key="index" :value="tab.value">
      <div class="anno-grid">
        <TaCard v-for="item in annoCards[tab.value]" :key="item.id" :model-value="item" />
      </div>
    </v-window-item>
  </v-window>
  <TaoIframe v-if="isLogin" v-model="iframeVisible" />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TaCard from "@comp/pageAnno/ta-card.vue";
import TaoIframe from "@comp/pageAnno/tao-iframe.vue";
import { AnnoLangEnum, AnnoTypeEnum, getAnnoLangDesc, getAnnoTypeDesc } from "@enum/anno.js";
import { GameServerEnum, getGameServerDesc } from "@enum/game.js";
import hk4eReq from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

type AnnoSelect<T = string> = { text: string; value: T };
export type AnnoCard = {
  id: number;
  title: string;
  subtitle: string;
  banner: string;
  typeLabel: TGApp.BBS.Announcement.AnnoTypeEnum;
  tagIcon: string;
  tagLabel: string;
  timeStr: string;
  detail: TGApp.BBS.Announcement.AnnoDetail;
};
type AnnoList = Record<TGApp.BBS.Announcement.AnnoTypeEnum, Array<AnnoCard>>;

const serverList: ReadonlyArray<AnnoSelect<TGApp.Game.Base.ServerTypeEnum>> = [
  GameServerEnum.CN_GF01,
  GameServerEnum.CN_QD01,
  GameServerEnum.OS_ASIA,
  GameServerEnum.OS_EURO,
  GameServerEnum.OS_USA,
  GameServerEnum.OS_CHT,
].map((i) => ({ text: getGameServerDesc(i), value: i }));
const langList: ReadonlyArray<AnnoSelect<TGApp.BBS.Announcement.AnnoLangEnum>> = [
  AnnoLangEnum.CHS,
  AnnoLangEnum.CHT,
  AnnoLangEnum.EN,
  AnnoLangEnum.JP,
].map((i) => ({ text: getAnnoLangDesc(i), value: i }));
const tabList: ReadonlyArray<AnnoSelect<TGApp.BBS.Announcement.AnnoTypeEnum>> = [
  AnnoTypeEnum.ACTIVITY,
  AnnoTypeEnum.GAME,
  AnnoTypeEnum.UGC,
].map((i) => ({ text: getAnnoTypeDesc(i), value: i }));

const { server, lang, isLogin } = storeToRefs(useAppStore());
const router = useRouter();

const tab = ref<TGApp.BBS.Announcement.AnnoTypeEnum>(AnnoTypeEnum.ACTIVITY);
const annoCards = shallowRef<AnnoList>({ activity: [], game: [], ugc: [] });
const isReq = ref<boolean>(false);
const iframeVisible = ref<boolean>(false);

watch(
  () => server.value,
  async () => {
    const name = getGameServerDesc(server.value);
    await TGLogger.Info(`[Announcements][watch][server] 切换服务器：${name}`);
    await loadData();
    showSnackbar.success(`服务器切换为：${name}`);
  },
);

watch(
  () => lang.value,
  async () => {
    const name = getAnnoLangDesc(lang.value);
    await TGLogger.Info(`[Announcements][watch][curLangName] 切换语言：${name}`);
    await loadData();
    showSnackbar.success(`语言切换为：${name}`);
  },
);

onMounted(async () => {
  await TGLogger.Info("[Announcements][onMounted] 打开公告页面");
  await loadData();
});

function showIframe(): void {
  iframeVisible.value = true;
}

async function loadData(): Promise<void> {
  if (isReq.value) return;
  isReq.value = true;
  await showLoading.start(
    "正在获取公告数据",
    `服务器：${getGameServerDesc(server.value)}，语言：${getAnnoLangDesc(lang.value)}`,
  );
  const listResp = await hk4eReq.anno.list(server.value, lang.value);
  const detailResp = await hk4eReq.anno.detail(server.value, AnnoLangEnum.CHS);
  const actCards: Array<AnnoCard> = [];
  const gameCards: Array<AnnoCard> = [];
  const ugcCards: Array<AnnoCard> = [];
  for (const list of listResp.list) {
    for (const item of list.list) {
      const detail = detailResp.find((i) => i.ann_id === item.ann_id);
      if (detail) {
        const card = getAnnoCard(item, detail);
        if (card.typeLabel === "activity") {
          actCards.push(card);
        } else if (card.typeLabel === "game") {
          gameCards.push(card);
        } else if (card.typeLabel === "ugc") {
          ugcCards.push(card);
        }
      } else {
        await TGLogger.Warn(`[Announcements][loadData] 未找到公告详情：${item.ann_id}`);
      }
    }
  }
  annoCards.value = { activity: actCards, game: gameCards, ugc: ugcCards };
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

function getAnnoCard(
  anno: TGApp.BBS.Announcement.AnnoSingle,
  detail: TGApp.BBS.Announcement.AnnoDetail,
): AnnoCard {
  const timeStart = anno.start_time.split(" ")[0];
  const timeEnd = anno.end_time.split(" ")[0];
  const time = `${timeStart} ~ ${timeEnd}`;
  const labelMap: Record<string, TGApp.BBS.Announcement.AnnoTypeEnum> = {
    1: AnnoTypeEnum.ACTIVITY,
    2: AnnoTypeEnum.GAME,
    26: AnnoTypeEnum.UGC,
  };
  return {
    id: anno.ann_id,
    title: anno.title,
    subtitle: anno.subtitle.replace(/<br \/>/g, " "),
    banner: anno.banner,
    typeLabel: labelMap[anno.type],
    tagIcon: anno.tag_icon,
    tagLabel: getAnnoTag(anno.tag_label),
    timeStr: time,
    detail: detail,
  };
}

async function switchNews(): Promise<void> {
  await TGLogger.Info("[Announcements][switchNews] 切换米游社资讯");
  await router.push("/news/2");
}
</script>
<style lang="scss" scoped>
.pa-prepend {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;
}

.pa-tabs {
  margin-bottom: 8px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.pa-selects {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px;
  column-gap: 8px;
}

.anno-select {
  width: 150px;
  height: 40px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-top-append {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.anno-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.anno-grid {
  display: grid;
  font-family: var(--font-title);
  gap: 8px;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}
</style>
