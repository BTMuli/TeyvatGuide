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
          <v-progress-linear
            :model-value="loadingProgress"
            color="primary"
            height="6"
            rounded
          />
          <div class="loading-text">{{ loadingText }}</div>
        </div>
      </div>
      <div v-else class="sign-container">
        <PhSignItem
          v-for="item in signAccounts"
          :key="item.account.gameUid"
          :account="item.account"
          :info-resp="item.infoResp"
          :stat-resp="item.statResp"
          @delete="handleDelete"
          @refresh="handleRefresh"
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
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";
import PhSignItem from "./ph-sign-item.vue";
import PhUserSwitch from "./ph-user-switch.vue";

type SignAccount = {
  account: TGApp.Sqlite.Account.Game;
  infoResp?: TGApp.BBS.Sign.HomeRes | TGApp.BBS.Base.BaseRet;
  statResp?: TGApp.BBS.Sign.InfoRes | TGApp.BBS.Base.BaseRet;
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
const gameAccounts = ref<TGApp.Sqlite.Account.Game[]>([]);
const signAccounts = ref<SignAccount[]>([]);

watch(
  () => uid.value,
  async () => await loadData(),
);

onMounted(async () => {
  await loadData();
});

async function loadData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    gameAccounts.value = [];
    signAccounts.value = [];
    return;
  }

  signAccounts.value = [];

  try {
    // Get all game accounts for current user
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    gameAccounts.value = accounts;

    if (accounts.length === 0) {
      await TGLogger.Warn("[Sign Card] No game accounts found");
      emits("success");
      return;
    }

    // Emit success immediately after getting accounts
    emits("success");

    // Start loading data sequentially
    loading.value = true;
    loadingProgress.value = 0;
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };

    // Load data for each account sequentially
    for (let i = 0; i < accounts.length; i++) {
      const gameAccount = accounts[i];
      loadingText.value = `正在加载 ${gameAccount.gameBiz} - ${gameAccount.gameUid}...`;

      const signAccount: SignAccount = {
        account: gameAccount,
      };

      try {
        // Get sign-in rewards and status sequentially
        const infoResp = await lunaReq.home(gameAccount, ck);
        signAccount.infoResp = infoResp;

        const statResp = await lunaReq.info(gameAccount, ck);
        signAccount.statResp = statResp;

        if ("retcode" in infoResp) {
          await TGLogger.Error(
            `[Sign Card] Failed to get rewards for ${gameAccount.gameBiz}: ${infoResp.message}`,
          );
        }

        if ("retcode" in statResp) {
          await TGLogger.Error(
            `[Sign Card] Failed to get status for ${gameAccount.gameBiz}: ${statResp.message}`,
          );
        }
      } catch (error) {
        await TGLogger.Error(
          `[Sign Card] Error loading data for ${gameAccount.gameBiz}: ${error}`,
        );
      }

      signAccounts.value.push(signAccount);
      loadingProgress.value = ((i + 1) / accounts.length) * 100;
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Error loading data: ${error}`);
  } finally {
    loading.value = false;
    loadingProgress.value = 0;
    loadingText.value = "";
  }
}

async function handleUserSwitch(newUid: string): Promise<void> {
  // Data will automatically reload via uid watcher
  await TGLogger.Info(`[Sign Card] User switched to ${newUid}`);
}

async function handleDelete(gameUid: string): Promise<void> {
  try {
    // Delete from database
    const success = await TSUserAccount.game.delAccount(gameUid);
    if (success) {
      // Remove from UI
      signAccounts.value = signAccounts.value.filter((item) => item.account.gameUid !== gameUid);
      gameAccounts.value = gameAccounts.value.filter((item) => item.gameUid !== gameUid);
      emits("delete", gameUid);
      showSnackbar.success("账号已删除");
    } else {
      showSnackbar.error("删除账号失败");
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Delete account error: ${error}`);
    showSnackbar.error("删除账号失败");
  }
}

async function handleRefresh(account: TGApp.Sqlite.Account.Game): Promise<void> {
  if (!cookie.value) return;
  
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    
    // Find the account in our list
    const index = signAccounts.value.findIndex((item) => item.account.gameUid === account.gameUid);
    if (index === -1) return;
    
    // Refresh data for this account
    const infoResp = await lunaReq.home(account, ck);
    const statResp = await lunaReq.info(account, ck);
    
    // Update the account data
    signAccounts.value[index] = {
      account,
      infoResp,
      statResp,
    };
    
    await TGLogger.Info(`[Sign Card] Refreshed data for ${account.gameUid}`);
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Refresh account error: ${error}`);
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
  flex-direction: column;
  width: 100%;
  max-width: 400px;
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
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
}
</style>
