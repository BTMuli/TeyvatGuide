<!-- 首页近期活动组件 -->
<template>
  <THomeCard :append="isLogin">
    <template #title>近期活动</template>
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
  <TwoMaterial v-model="showMaterial" :data="curMaterial" />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhPosObc from "@comp/pageHome/ph-pos-obc.vue";
import PhPosUser from "@comp/pageHome/ph-pos-user.vue";
import TwoMaterial from "@comp/pageWiki/two-material.vue";
import recordReq from "@req/recordReq.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";

import { WikiMaterialData } from "@/data/index.js";

type TPositionEmits = (e: "success") => void;

const { isLogin } = storeToRefs(useAppStore());
const { cookie, account } = storeToRefs(useUserStore());

const emits = defineEmits<TPositionEmits>();

const isInit = ref<boolean>(false);
const isUserPos = ref<boolean>(isLogin.value);
const showMaterial = ref<boolean>(false);
const curMaterial = shallowRef<TGApp.App.Material.WikiItem>(WikiMaterialData[0]);
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
      await loadUserPosition();
    }
  },
);

onMounted(async () => {
  if (isLogin.value) await loadUserPosition();
  else await loadWikiPosition();
  emits("success");
  isInit.value = true;
});

async function loadUserPosition(): Promise<void> {
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
    showSnackbar.error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
    await TGLogger.Error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
    return;
  }
  userPos.value = [...resp.act_list, ...resp.fixed_act_list].filter(
    (i) => i.start_timestamp !== "0",
  );
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
    showSnackbar.error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
    await TGLogger.Error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
  }
}

async function handleMaterial(cur: TGApp.Game.ActCalendar.ActReward): Promise<void> {
  const find = WikiMaterialData.find((i) => i.id === cur.item_id);
  if (!find) {
    await openUrl(cur.wiki_url);
    return;
  }
  curMaterial.value = find;
  showMaterial.value = true;
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
