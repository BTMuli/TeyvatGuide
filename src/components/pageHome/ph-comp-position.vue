<!-- 首页近期活动组件 -->
<template>
  <THomeCard :append="isLogin" title="近期活动">
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
import recordReq from "@req/recordReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { openUrl } from "@tauri-apps/plugin-opener";
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

const emits = defineEmits<TPositionEmits>();

const isInit = ref<boolean>(false);
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
    if (isUserPos.value && isInit.value) {
      userPos.value = [];
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

async function loadUserPosition(forceReload: boolean = false): Promise<void> {
  if (userPos.value.length > 0 && !forceReload) return;
  if (!cookie.value) {
    showSnackbar.warn("获取近期活动失败：未登录");
    isLogin.value = false;
    return;
  }
  if (isInit.value) await showLoading.start("正在获取近期活动");
  const resp = await recordReq.actCalendar(cookie.value, account.value);
  console.log(resp);
  if (isInit.value) await showLoading.end();
  if ("retcode" in resp) {
    showSnackbar.error(`获取近期活动失败：[${resp.retcode}]-${resp.message}`);
    await TGLogger.Error(`获取近期活动失败：[${resp.retcode}]-${resp.message}`);
    return;
  }
  userPos.value = [...resp.act_list, ...resp.fixed_act_list]
    .filter((i) => i.start_timestamp !== "0")
    .sort((a, b) => Number(a.is_finished) - Number(b.is_finished) || b.id - a.id);
}

async function loadWikiPosition(): Promise<void> {
  if (obsPos.value.length > 0) return;
  if (isInit.value) await showLoading.start("正在加载近期活动");
  const resp = await takumiReq.obc.position();
  if (isInit.value) await showLoading.end();
  if (Array.isArray(resp)) {
    obsPos.value = resp;
    if (resp.length === 0) showSnackbar.warn("暂无近期活动");
  } else {
    showSnackbar.error(`获取近期活动失败：[${resp.retcode}]-${resp.message}`);
    await TGLogger.Error(`获取近期活动失败：[${resp.retcode}]-${resp.message}`);
  }
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
