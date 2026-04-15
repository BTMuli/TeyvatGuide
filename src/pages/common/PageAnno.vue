<!-- 公告页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pa-prepend">
        <v-tabs v-model="tab" align-tabs="start" class="pa-tabs">
          <v-tab v-for="tab in tabList" :key="tab.id" :title="tab.name" :value="tab.id">
            {{ tab.mi18n_name }}
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
          v-if="isLogin"
          class="anno-btn"
          prepend-icon="mdi-web"
          rounded
          size="small"
          variant="elevated"
          @click="showIframe()"
        >
          游戏内公告
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <v-window v-model="tab">
    <v-window-item v-for="(tab, index) in tabList" :key="index" :value="tab.id">
      <div class="anno-grid">
        <TaCard
          v-for="anno in getAnnoList(tab.id)"
          :key="anno.ann_id"
          :anno
          :detail="getAnnoDetail(anno)"
        />
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
import gameEnum from "@enum/game.js";
import hk4eReq from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

type AnnoSelect<T = string> = { text: string; value: T };

const serverList: ReadonlyArray<AnnoSelect<TGApp.Game.Base.ServerTypeEnum>> =
  gameEnum.serverList.map((i) => ({ text: gameEnum.serverDesc(i), value: i }));
const langList: ReadonlyArray<AnnoSelect<TGApp.Game.Anno.AnnoLangEnum>> =
  gameEnum.anno.langList.map((i) => ({ text: gameEnum.anno.langDesc(i), value: i }));

const { server, lang, isLogin } = storeToRefs(useAppStore());

const tab = ref<number>(0);
const tabList = shallowRef<Array<TGApp.Game.Anno.ListType>>([]);
const annoList = shallowRef<TGApp.Game.Anno.ListRes>();
const detailList = shallowRef<Array<TGApp.Game.Anno.AnnoDetail>>([]);
const isReq = ref<boolean>(false);
const iframeVisible = ref<boolean>(false);

watch(
  () => server.value,
  async () => {
    const name = gameEnum.serverDesc(server.value);
    await TGLogger.Info(`[Announcements][watch][server] 切换服务器：${name}`);
    await loadData();
    showSnackbar.success(`服务器切换为：${name}`);
  },
);

watch(
  () => lang.value,
  async () => {
    const name = gameEnum.anno.langDesc(lang.value);
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

function getAnnoList(typeId: number): Array<TGApp.Game.Anno.ListAnno> {
  if (!annoList.value) return [];
  return annoList.value.list.find((i) => i.type_id === typeId)?.list || [];
}

function getAnnoDetail(anno: TGApp.Game.Anno.ListAnno): TGApp.Game.Anno.AnnoDetail | undefined {
  if (anno.type !== 1) return undefined;
  return detailList.value.find((i) => i.ann_id === anno.ann_id);
}

async function loadData(): Promise<void> {
  if (isReq.value) return;
  isReq.value = true;
  detailList.value = [];
  tabList.value = [];
  await showLoading.start(
    "正在获取公告数据",
    `服务器：${gameEnum.serverDesc(server.value)}，语言：${gameEnum.anno.langDesc(lang.value)}`,
  );
  let listResp: TGApp.Game.Anno.ListResp | undefined;
  try {
    listResp = await hk4eReq.anno.list(server.value, lang.value);
    if (listResp.retcode !== 0) {
      showSnackbar.error(`[${listResp.retcode}] ${listResp.message}`);
      await TGLogger.Warn(
        `[PageAnno][loadData] 获取公告列表失败：[${listResp.retcode}] ${listResp.message}`,
      );
      await showLoading.end();
      isReq.value = false;
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取公告列表失败：${errMsg}`);
    await TGLogger.Error(`[PageAnno][loadData] 获取公告列表异常：${errMsg}`);
    await showLoading.end();
    isReq.value = false;
    return;
  }
  console.log("annoList", listResp);
  annoList.value = listResp.data;
  tabList.value = listResp.data.type_list;
  tab.value = tabList.value[0].id;
  let detailResp: TGApp.Game.Anno.DetailResp | undefined;
  try {
    detailResp = await hk4eReq.anno.detail(server.value, gameEnum.anno.lang.CHS);
    if (detailResp.retcode !== 0) {
      showSnackbar.error(`[${detailResp.retcode}] ${detailResp.message}`);
      await TGLogger.Warn(
        `[PageAnno][loadData] 获取公告详情失败：[${detailResp.retcode}] ${detailResp.message}`,
      );
      await showLoading.end();
      isReq.value = false;
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取公告详情失败：${errMsg}`);
    await TGLogger.Error(`[PageAnno][loadData] 获取公告详情异常：${errMsg}`);
    await showLoading.end();
    isReq.value = false;
    return;
  }
  detailList.value = detailResp.data.list;
  await showLoading.end();
  isReq.value = false;
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
