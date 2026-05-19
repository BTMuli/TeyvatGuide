<!-- 首页近期活动组件 -->
<template>
  <THomeCard :append="isLogin" title="近期活动">
    <template #title>
      <span>近期活动</span>
      <v-icon class="tp-refresh" size="small" title="刷新" @click.stop="handleRefresh()">
        mdi-refresh
      </v-icon>
    </template>
    <template v-if="isLogin" #title-append>
      <v-switch v-model="isUserPos" class="tp-switch"></v-switch>
      <span>{{ isUserPos ? "用户" : "百科" }}</span>
    </template>
    <template #default>
      <div v-show="!isUserPos" class="tp-grid">
        <PhPosObc v-for="(card, index) in obsPos" :key="index" :pos="card" />
      </div>
      <div v-show="isUserPos" class="tp-grid">
        <PhPosUser
          v-for="(card, index) in userPos"
          :key="index"
          :pos="card"
          @click-m="handleMaterial"
        />
      </div>
    </template>
  </THomeCard>
  <PboMaterial v-model="showMaterial" :data="curMaterial" :uid="Number(account.gameUid)" />
  <ToCalendar v-model="showCalendar" :item="curItemC" />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PboMaterial from "@comp/pageBag/pbo-material.vue";
import ToCalendar from "@comp/pageHome/ph-calendar-overlay.vue";
import PhPosObc from "@comp/pageHome/ph-pos-obc.vue";
import PhPosUser from "@comp/pageHome/ph-pos-user.vue";
import miscReq from "@req/miscReq.js";
import recordReq from "@req/recordReq.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useHomeStore from "@store/home.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useUserStore from "@store/user.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";

import { AppCalendarData, WikiMaterialData } from "@/data/index.js";
import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type TPositionEmits = (e: "success") => void;

const { isLogin } = storeToRefs(useAppStore());
const { cookie, account } = storeToRefs(useUserStore());
const homeStore = useHomeStore();

const emits = defineEmits<TPositionEmits>();

const isInit = ref<boolean>(false);
const isRefreshing = ref<boolean>(false);
const isUserPos = ref<boolean>(isLogin.value);
const showMaterial = ref<boolean>(false);
const showCalendar = ref<boolean>(false);
const curMaterial = shallowRef<MaterialInfo>(genEmptyMaterial(WikiMaterialData[0]));
const curTypeC = ref<"character" | "weapon">("character");
const curItemC = shallowRef<TGApp.App.Calendar.Item>(AppCalendarData[0]);
const obsPos = shallowRef<Array<TGApp.BBS.Obc.PositionItem>>([]);
const userPos = shallowRef<Array<TGApp.Game.ActCalendar.ActItem>>([]);

watch(
  () => isUserPos.value,
  async () => {
    if (isUserPos.value) await loadUserPosition();
    else await loadWikiPosition();
  },
);

watch(
  () => account.value.gameUid,
  async () => {
    if (isUserPos.value) {
      userPos.value = [];
      homeStore.actCalendarData = undefined;
      await loadUserPosition(true);
    }
  },
);

onMounted(async () => {
  if (isLogin.value) await loadUserPosition();
  else await loadWikiPosition();
  emits("success");
  isInit.value = true;
});

async function handleRefresh(): Promise<void> {
  isRefreshing.value = true;
  if (isUserPos.value) {
    userPos.value = [];
    homeStore.actCalendarData = undefined;
    await loadUserPosition(true);
  } else {
    obsPos.value = [];
    await loadWikiPosition();
  }
}

async function loadUserPosition(forceReload: boolean = false): Promise<void> {
  if (userPos.value.length > 0 && !forceReload) return;
  if (!cookie.value) {
    showSnackbar.warn("获取近期活动失败：未登录");
    isLogin.value = false;
    return;
  }
  if (isInit.value) await showLoading.start("正在获取近期活动");
  let data: TGApp.Game.ActCalendar.ActRes | undefined;
  try {
    if (homeStore.actCalendarData && !forceReload) {
      data = homeStore.actCalendarData;
    } else {
      const resp = await recordReq.actCalendar(cookie.value, account.value);
      if (<number>resp.retcode === 1034) {
        await TGLogger.Warn("[PhCompPosition][loadUserPosition] 触发1034验证");
        if (!isInit.value || !isRefreshing.value) {
          if (isInit.value) await showLoading.end();
          isUserPos.value = false;
          if (isRefreshing.value) isRefreshing.value = false;
          await loadWikiPosition();
          return;
        }
        const challenge = await miscReq.challenge({
          account_id: cookie.value.account_id,
          cookie_token: cookie.value.cookie_token,
        });
        if (challenge === false) {
          if (isInit.value) {
            showSnackbar.error("极验验证失败，已切换至百科模式");
            await showLoading.end();
          }
          isUserPos.value = false;
          if (isRefreshing.value) isRefreshing.value = false;
          await loadWikiPosition();
          return;
        }
        const resp2 = await recordReq.actCalendar(cookie.value, account.value, challenge);
        if (resp2.retcode !== 0) {
          if (isInit.value) {
            showSnackbar.warn(`[${resp2.retcode}] ${resp2.message}`);
            await showLoading.end();
          }
          if (isRefreshing.value) isRefreshing.value = false;
          await TGLogger.Warn(
            `[PhCompPosition][loadUserPosition] ${resp2.retcode}-${resp2.message}`,
          );
          return;
        }
        data = resp2.data;
      } else if (resp.retcode !== 0) {
        if (isInit.value) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          await showLoading.end();
        }
        if (isRefreshing.value) isRefreshing.value = false;
        await TGLogger.Warn("[PhCompPosition][loadUserPosition] 获取近期活动异常");
        await TGLogger.Warn(`[PhCompPosition][loadUserPosition] ${resp.retcode}-${resp.message}`);
        return;
      } else {
        data = resp.data;
      }
      homeStore.actCalendarData = data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    if (isInit.value) {
      showSnackbar.error(`获取近期活动失败：${errMsg}`);
      await showLoading.end();
    }
    if (isRefreshing.value) isRefreshing.value = false;
    await TGLogger.Error("[PhCompPosition][loadUserPosition] 获取近期活动异常");
    await TGLogger.Error(`[PhCompPosition][loadUserPosition] ${e}`);
    return;
  }
  // 处理近期活动数据
  userPos.value = [...data.act_list, ...data.fixed_act_list]
    .filter((i) => i.start_timestamp !== "0")
    .sort((a, b) => Number(a.is_finished) - Number(b.is_finished) || b.id - a.id);
  if (isInit.value) await showLoading.end();
  if (isRefreshing.value) {
    showSnackbar.success("近期活动数据已刷新");
    isRefreshing.value = false;
  }
}

async function loadWikiPosition(): Promise<void> {
  if (obsPos.value.length > 0) return;
  if (isInit.value) await showLoading.start("正在加载近期活动");
  let resp: TGApp.BBS.Obc.PositionResp | undefined;
  try {
    resp = await takumiReq.obc.position();
    if (resp.retcode !== 0) {
      if (isInit.value) {
        showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
        await showLoading.end();
      }
      await TGLogger.Warn("[PhCompPosition][loadWikiPosition] 获取近期活动异常");
      await TGLogger.Warn(`[PhCompPosition][loadWikiPosition] ${resp.retcode}-${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    if (isInit.value) {
      showSnackbar.error(`获取近期活动失败：${errMsg}`);
      await showLoading.end();
    }
    await TGLogger.Error("[PhCompPosition][loadWikiPosition] 获取近期活动异常");
    await TGLogger.Error(`[PhCompPosition][loadWikiPosition] ${e}`);
    return;
  }
  if (!resp) {
    if (isInit.value) await showLoading.end();
    return;
  }
  const dfsRes = dfsObc(resp.data.list);
  obsPos.value = dfsRes;
  if (dfsRes.length === 0) showSnackbar.warn("暂无近期活动");
  if (isInit.value) await showLoading.end();
  if (isRefreshing.value) {
    showSnackbar.success("近期活动数据已刷新");
    isRefreshing.value = false;
  }
}

function dfsObc(
  list: Array<TGApp.BBS.Obc.ObcItem<TGApp.BBS.Obc.PositionItem>>,
): Array<TGApp.BBS.Obc.PositionItem> {
  const res: Array<TGApp.BBS.Obc.PositionItem> = [];
  for (const item of list) {
    if (item.name === "近期活动") res.push(...item.list);
    if (item.children) res.push(...dfsObc(item.children));
  }
  return res;
}

function genEmptyMaterial(material: TGApp.App.Material.WikiItem): MaterialInfo {
  return {
    info: material,
    tb: {
      uid: Number(account.value.gameUid),
      id: material.id,
      count: 0,
      records: [],
      updated: timestampToDate(Date.now()),
    },
  };
}

async function loadMaterial(material: TGApp.App.Material.WikiItem): Promise<MaterialInfo> {
  const dbGet = await TSUserBagMaterial.getMaterial(Number(account.value.gameUid), material.id);
  let res: MaterialInfo = genEmptyMaterial(material);
  if (dbGet.length > 0) res.tb = dbGet[0];
  return res;
}

async function handleMaterial(cur: TGApp.Game.ActCalendar.ActReward): Promise<void> {
  const findM = WikiMaterialData.find((i) => i.id === cur.item_id);
  if (findM) {
    curMaterial.value = await loadMaterial(findM);
    showMaterial.value = true;
    return;
  }
  // 尝试查找角色&武器
  const findC = AppCalendarData.find((i) => i.id === cur.item_id);
  if (findC) {
    curTypeC.value = findC.itemType === "weapon" ? "weapon" : "character";
    curItemC.value = findC;
    showCalendar.value = true;
    return;
  }
  if (cur.wiki_url === "") {
    showSnackbar.warn("未检测到跳转链接");
    return;
  }
  await openUrl(cur.wiki_url);
}
</script>
<style lang="scss" scoped>
.tp-refresh {
  margin-left: 8px;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.tp-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.tp-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px), 0.5fr));
}
</style>
