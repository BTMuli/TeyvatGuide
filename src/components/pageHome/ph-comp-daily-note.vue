<!-- 首页实时便笺卡片 -->
<template>
  <THomeCard :append="isLogin" title="实时便笺">
    <template v-if="isLogin" #title-append>
      <PhUserSwitch
        :current-uid="uid ?? ''"
        :nickname="briefInfo.nickname"
        @switch-user="handleUserSwitch"
      />
    </template>
    <template #default>
      <div v-if="!isLogin" class="dn-not-login">请先登录</div>
      <div v-else-if="gameAccounts.length === 0" class="dn-not-login">暂无游戏账户</div>
      <div v-else-if="loading" class="dn-loading">
        <div class="loading-content">
          <v-progress-linear :model-value="loadingProgress" color="blue" height="6" rounded />
          <div class="loading-text">{{ loadingText }}</div>
        </div>
      </div>
      <div v-else class="dn-container">
        <PhDailyNoteItem
          v-for="item in sortedDailyNoteAccounts"
          :key="`${item.account.gameBiz}_${item.account.gameUid}`"
          :account="item.account"
          :data="item.data"
          :cur="item.account.gameUid === currentGameUid"
          @refresh="handleRefresh(item.account)"
        />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import recordReq from "@req/recordReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";
import PhDailyNoteItem from "./ph-daily-note-item.vue";
import PhUserSwitch from "./ph-user-switch.vue";

type DailyNoteAccount = {
  account: TGApp.Sqlite.Account.Game;
  data?: TGApp.Game.DailyNote.DnRes;
};

type TDailyNoteEmits = {
  (e: "success"): void;
  (e: "delete", gameUid: string): void;
};

const emits = defineEmits<TDailyNoteEmits>();
const { cookie, uid, briefInfo, account } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());

const loading = ref<boolean>(false);
const loadingProgress = ref<number>(0);
const loadingText = ref<string>("");
const gameAccounts = ref<Array<TGApp.Sqlite.Account.Game>>([]);
const dailyNoteAccounts = ref<Array<DailyNoteAccount>>([]);

const currentGameUid = computed(() => account.value?.gameUid || "");

const sortedDailyNoteAccounts = computed(() => {
  if (!currentGameUid.value) return dailyNoteAccounts.value;
  return [...dailyNoteAccounts.value].sort((a, b) => {
    const aIsCurrent = a.account.gameUid === currentGameUid.value;
    const bIsCurrent = b.account.gameUid === currentGameUid.value;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });
});

watch(
  () => uid.value,
  async () => await loadData(),
);

onMounted(async () => await loadData());

async function loadData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    gameAccounts.value = [];
    dailyNoteAccounts.value = [];
    return;
  }
  dailyNoteAccounts.value = [];
  try {
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    const genshinAccounts = accounts.filter((ac) => ac.gameBiz === "hk4e_cn");
    gameAccounts.value = genshinAccounts;
    if (genshinAccounts.length === 0) {
      await TGLogger.Warn("[Daily Note Card] No Genshin Impact accounts found");
      emits("success");
      return;
    }
    emits("success");
    loading.value = true;
    loadingProgress.value = 0;
    for (let i = 0; i < genshinAccounts.length; i++) {
      const account = genshinAccounts[i];
      loadingText.value = `正在加载 ${account.gameBiz} - ${account.regionName} - ${account.gameUid}...`;
      loadingProgress.value = (i / genshinAccounts.length) * 100;
      let data: TGApp.Game.DailyNote.DnRes | undefined;
      try {
        const dataResp = await recordReq.daily(cookie.value, account);
        console.debug("dailyResp", account, dataResp);
        if (dataResp.retcode !== 0) {
          await TGLogger.Error(
            `[Daily Note Card] Failed to get daily note for ${account.gameBiz}: ${dataResp.message}`,
          );
        } else data = dataResp.data;
      } catch (error) {
        await TGLogger.Error(
          `[Daily Note Card] Error loading data for ${account.gameBiz}: ${error}`,
        );
      }
      dailyNoteAccounts.value.push({ account, data });
    }
  } catch (error) {
    await TGLogger.Error(`[Daily Note Card] Error loading data: ${error}`);
  } finally {
    loadingProgress.value = 100;
    loadingText.value = "加载完成";
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    loading.value = false;
    loadingProgress.value = 0;
    loadingText.value = "";
  }
}

async function handleUserSwitch(newUid: string): Promise<void> {
  await TGLogger.Info(`[Daily Note Card] User switched to ${newUid}`);
}

async function handleRefresh(account: TGApp.Sqlite.Account.Game): Promise<void> {
  try {
    const dataResp = await recordReq.daily(cookie.value!, account);
    if (dataResp.retcode !== 0) {
      await TGLogger.Error(`[Daily Note Card] Refresh failed: ${dataResp.message}`);
      showSnackbar.error("刷新失败");
      return;
    }
    const item = dailyNoteAccounts.value.find(
      (i) => i.account.gameUid === account.gameUid && i.account.gameBiz === account.gameBiz,
    );
    if (item) {
      item.data = dataResp.data;
    }
    showSnackbar.success("刷新成功");
  } catch (error) {
    await TGLogger.Error(`[Daily Note Card] Refresh error: ${error}`);
    showSnackbar.error("刷新失败");
  }
}
</script>
<style lang="scss" scoped>
.dn-not-login {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--box-text-1);
  font-size: 16px;
}

.dn-loading {
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

.dn-container {
  position: relative;
  display: grid;
  padding: 8px;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}
</style>
