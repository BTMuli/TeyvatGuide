<!-- 首页签到卡片 -->
<template>
  <THomeCard :append="isLogin" title="游戏签到">
    <template v-if="isLogin" #title-append>
      <PhUserSwitch
        :current-uid="uid ?? ''"
        :nickname="briefInfo.nickname"
        @switch-user="handleUserSwitch"
      />
    </template>
    <template #default>
      <div v-if="!isLogin" class="sign-not-login">请先登录</div>
      <div v-else-if="gameAccounts.length === 0" class="sign-not-login">暂无游戏账户</div>
      <div v-else-if="loading" class="sign-loading">
        <div class="loading-content">
          <v-progress-linear :model-value="loadingProgress" color="blue" height="6" rounded />
          <div class="loading-text">{{ loadingText }}</div>
        </div>
      </div>
      <div v-else class="sign-container">
        <PhSignItem
          v-for="item in signAccounts"
          :key="`${item.account.gameBiz}_${item.account.gameUid}`"
          :account="item.account"
          :info="item.info"
          :stat="item.stat"
          @delete="handleDelete"
        />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import lunaReq from "@req/lunaReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";
import PhSignItem from "./ph-sign-item.vue";
import PhUserSwitch from "./ph-user-switch.vue";

type SignAccount = {
  account: TGApp.Sqlite.Account.Game;
  info?: TGApp.BBS.Sign.HomeRes;
  stat?: TGApp.BBS.Sign.InfoRes;
};

type TSignEmits = {
  (e: "success"): void;
  (e: "delete", gameUid: string): void;
};

const emits = defineEmits<TSignEmits>();
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());

const loading = ref<boolean>(false);
const loadingProgress = ref<number>(0);
const loadingText = ref<string>("");
const gameAccounts = ref<Array<TGApp.Sqlite.Account.Game>>([]);
const signAccounts = ref<Array<SignAccount>>([]);

watch(
  () => uid.value,
  async () => await loadData(),
);

onMounted(async () => await loadData());

async function endLoad(): Promise<void> {
  loadingProgress.value = 100;
  loadingText.value = "加载完成";
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  loading.value = false;
  loadingProgress.value = 0;
  loadingText.value = "";
}

async function loadData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    gameAccounts.value = [];
    signAccounts.value = [];
    return;
  }
  signAccounts.value = [];
  const accounts = await TSUserAccount.game.getAccount(uid.value);
  gameAccounts.value = accounts;
  if (accounts.length === 0) {
    await TGLogger.Warn("[Sign Card] No game accounts found");
    emits("success");
    await endLoad();
    return;
  }
  emits("success");
  loading.value = true;
  loadingProgress.value = 0;
  const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    loadingText.value = `正在加载 ${account.gameBiz} - ${account.regionName} - ${account.gameUid}...`;
    loadingProgress.value = (i / accounts.length) * 100;
    let info, stat;
    let infoResp: TGApp.BBS.Sign.HomeResp | undefined;
    try {
      infoResp = await lunaReq.sign.info(account, ck);
      if (infoResp.retcode !== 0) {
        await TGLogger.Warn(
          `[Sign Card] Failed to get rewards for ${account.gameBiz}: [${infoResp.retcode}] ${infoResp.message}`,
        );
      } else info = infoResp.data;
    } catch (error) {
      const errMsg = TGHttps.getErrMsg(error);
      await TGLogger.Error(`[Sign Card] Error loading info for ${account.gameBiz}: ${errMsg}`);
    }
    let statResp: TGApp.BBS.Sign.InfoResp | undefined;
    try {
      statResp = await lunaReq.sign.stat(account, ck);
      if (statResp.retcode !== 0) {
        await TGLogger.Warn(
          `[Sign Card] Failed to get status for ${account.gameBiz}: [${statResp.retcode}] ${statResp.message}`,
        );
      } else stat = statResp.data;
    } catch (error) {
      const errMsg = TGHttps.getErrMsg(error);
      await TGLogger.Error(`[Sign Card] Error loading stat for ${account.gameBiz}: ${errMsg}`);
    }
    signAccounts.value.push({ account, info, stat });
  }
  await endLoad();
}

async function handleUserSwitch(newUid: string): Promise<void> {
  await TGLogger.Info(`[Sign Card] User switched to ${newUid}`);
}

async function handleDelete(account: TGApp.Sqlite.Account.Game): Promise<void> {
  try {
    await TSUserAccount.game.deleteAccount(account);
    signAccounts.value = signAccounts.value.filter(
      (item) =>
        item.account.gameUid !== account.gameUid || item.account.gameBiz !== account.gameBiz,
    );
    showSnackbar.success("账号已删除");
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Delete account error: ${error}`);
    showSnackbar.error("删除账号失败");
  }
}
</script>
<style lang="scss" scoped>
.sign-not-login {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--box-text-1);
  font-size: 16px;
}

.sign-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-content {
  display: flex;
  width: 100%;
  max-width: 400px;
  flex-direction: column;
  gap: 12px;
}

.loading-text {
  color: var(--box-text-2);
  font-size: 14px;
  text-align: center;
}

.sign-container {
  display: grid;
  padding: 8px;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(350px, 0.34fr));
}
</style>
