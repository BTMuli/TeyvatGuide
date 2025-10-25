<!-- 嵌入游戏内容的iframe组件 -->
<template>
  <div class="gro-iframe-container">
    <v-tabs class="gro-ic-tabs" v-model="poolTab" align-tabs="start" direction="vertical">
      <v-tab v-for="(item, index) in tabList" :key="index" :value="item.value">
        <template v-if="item.beyond">
          <img src="/icon/nation/千星奇域.webp" title="千星奇域" alt="beyond" />
        </template>
        {{ item.label }}
      </v-tab>
    </v-tabs>
    <iframe class="gro-iframe" :src="link" style="width: 100%; height: 100%; border: none" />
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import takumiReq from "@req/takumiReq.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

/**
 * 卡池类型-ID映射
 * @remarks
 * 目前缺失集录&新手池
 * TODO: 动态获取当前卡池类型&ID映射
 */
const GachaIdMap: Record<string, string> = {
  "200": "34ff1a235049182fd199d285110e3e7d292c50cd", // 常驻
  "301": "182e725d99b742b14839117650d3e79628cc6221", //角色活动
  "302": "8ff7a7d42bea79b0d54e92fdb58a20f971490372", // 武器活动
  "400": "bb0486115a7e7c4bd2994135f7d212014b17173b", // 角色活动-2
  "1000": "f3f5090a8ec0b28f15805c9969aa6c4ec357", // 千星奇域常驻
  "20011": "a8d0a985efb4ed61eb2e73a86a57237bd116", // 千星奇域角色活动-男
  "20021": "57016dec6b768231ba1342c01935417a799b", // 千星奇域角色活动-女
};

type GroTabKey = keyof typeof GachaIdMap;
type GroTab = { label: string; value: string; beyond?: boolean };

const { cookie, account } = storeToRefs(useUserStore());
const authkey = ref<string>("");
const link = ref<string>("");
const poolTab = ref<GroTabKey>("200");
const tabList = shallowRef<ReadonlyArray<GroTab>>([
  { label: "常驻祈愿", value: "200" },
  { label: "角色活动祈愿", value: "301" },
  { label: "武器活动祈愿", value: "302" },
  { label: "角色活动祈愿-2", value: "400" },
  { label: "常驻颂愿", value: "1000", beyond: true },
  { label: "活动颂愿-男", value: "20011", beyond: true },
  { label: "活动颂愿-女", value: "20021", beyond: true },
]);

onMounted(async () => {
  link.value = await getUrl();
});

watch(
  () => poolTab.value,
  async () => {
    link.value = await getUrl();
  },
);

async function getUrl(): Promise<string> {
  const path = "https://webstatic.mihoyo.com/hk4e/event/e20190909gacha-v3/index.html";
  const pathB = "https://webstatic.mihoyo.com/hk4e/event/e20250716gacha/index.html";
  const pathF = poolTab.value.length < 4 ? path : pathB;
  if (authkey.value === "") await refreshAuthkey();
  const param: Record<string, string> = {
    win_mode: "fullscreen",
    no_joypad_close: "1",
    authkey_ver: "1",
    sign_type: "2",
    auth_appid: "webview_gacha",
    gacha_id: GachaIdMap[poolTab.value],
    timestamp: Math.floor(Date.now() / 1000).toString(),
    lang: "zh-cn",
    device_type: "pc",
    region: account.value.region,
    authkey: authkey.value,
    game_biz: account.value.gameBiz,
  };
  const targetLink = new URL(pathF);
  for (const key in param) {
    targetLink.searchParams.append(key, param[key]);
  }
  return targetLink.toString();
}

async function refreshAuthkey(): Promise<void> {
  if (!cookie.value || !account.value) {
    return;
  }
  const authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
  } else {
    showSnackbar.error("获取authkey失败");
    return;
  }
}
</script>
<style lang="scss" scoped>
.gro-iframe-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.gro-ic-tabs {
  height: 100%;

  img {
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }
}

.gro-ic-window {
  height: 100%;
  flex: 1;
}
</style>
