<!-- 首页便笺签到卡片 -->
<template>
  <THomeCard :append="isLogin" title="便笺签到">
    <template v-if="isLogin" #title-append>
      <v-switch v-model="isDailyNote" class="tns-switch"></v-switch>
      <span>{{ isDailyNote ? "实时便笺" : "游戏签到" }}</span>
    </template>
    <template #default>
      <div v-show="isDailyNote">
        <div v-if="!isLogin" class="tns-not-login">请先登录</div>
        <div v-else-if="loadingDailyNote" class="tns-loading">
          <div class="loading-content">
            <v-progress-linear :model-value="loadingProgress" color="blue" height="6" rounded />
            <div class="loading-text">{{ loadingText }}</div>
          </div>
        </div>
        <div v-else-if="gameAccounts.length === 0" class="tns-not-login">暂无游戏账户</div>
        <div v-else class="tns-dn-container">
          <PhDailyNoteItem
            v-for="item in sortedDailyNoteAccounts"
            :key="`${item.account.gameBiz}_${item.account.gameUid}`"
            :account="item.account"
            :data="item.data"
            :cur="item.account.gameUid === currentGameUid"
            @refresh="handleRefreshDailyNote(item.account)"
          />
        </div>
      </div>
      <div v-show="!isDailyNote">
        <div v-if="!isLogin" class="tns-not-login">请先登录</div>
        <div v-else-if="loadingSign" class="tns-loading">
          <div class="loading-content">
            <v-progress-linear :model-value="loadingProgress" color="blue" height="6" rounded />
            <div class="loading-text">{{ loadingText }}</div>
          </div>
        </div>
        <div v-else-if="signAccounts.length === 0" class="tns-not-login">暂无游戏账户</div>
        <div v-else class="tns-sign-container">
          <PhSignItem
            v-for="item in sortedSignAccounts"
            :key="`${item.account.gameBiz}_${item.account.gameUid}`"
            :account="item.account"
            :info="item.info"
            :stat="item.stat"
            :cur="item.account.gameUid === currentGameUid && item.account.gameBiz === 'hk4e_cn'"
            @delete="handleDeleteSignAccount"
          />
        </div>
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import lunaReq from "@req/lunaReq.js";
import recordReq from "@req/recordReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";
import PhDailyNoteItem from "./ph-daily-note-item.vue";
import PhSignItem from "./ph-sign-item.vue";

type DailyNoteAccount = {
  account: TGApp.Sqlite.Account.Game;
  data?: TGApp.Game.DailyNote.DnRes;
};

type SignAccount = {
  account: TGApp.Sqlite.Account.Game;
  info?: TGApp.BBS.Sign.HomeRes;
  stat?: TGApp.BBS.Sign.InfoRes;
};

type TNoteSignEmits = {
  (e: "success"): void;
};

const emits = defineEmits<TNoteSignEmits>();
const { cookie, uid, account } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());

const isDailyNote = ref<boolean>(true);
const dailyNoteLoaded = ref<boolean>(false);
const signLoaded = ref<boolean>(false);
const loadingDailyNote = ref<boolean>(false);
const loadingSign = ref<boolean>(false);
const loadingProgress = ref<number>(0);
const loadingText = ref<string>("");
const gameAccounts = ref<Array<TGApp.Sqlite.Account.Game>>([]);
const dailyNoteAccounts = ref<Array<DailyNoteAccount>>([]);
const signAccounts = ref<Array<SignAccount>>([]);

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

const sortedSignAccounts = computed(() => {
  return [...signAccounts.value].sort((a, b) => {
    const aIsGenshin = a.account.gameBiz === "hk4e_cn";
    const bIsGenshin = b.account.gameBiz === "hk4e_cn";
    if (aIsGenshin && !bIsGenshin) return -1;
    if (!aIsGenshin && bIsGenshin) return 1;
    const aIsCurrent = a.account.gameUid === currentGameUid.value;
    const bIsCurrent = b.account.gameUid === currentGameUid.value;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });
});

watch(
  () => uid.value,
  async () => {
    dailyNoteLoaded.value = false;
    signLoaded.value = false;
    await loadDailyNoteData();
    await loadSignData();
  },
);

watch(
  () => isDailyNote.value,
  async (newVal) => {
    if (newVal) {
      if (!dailyNoteLoaded.value) await loadDailyNoteData();
    } else {
      if (!signLoaded.value) await loadSignData();
    }
  },
);

onMounted(async () => {
  await loadDailyNoteData();
  emits("success");
});

async function loadDailyNoteData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    gameAccounts.value = [];
    dailyNoteAccounts.value = [];
    return;
  }
  if (dailyNoteLoaded.value && dailyNoteAccounts.value.length > 0) return;
  dailyNoteAccounts.value = [];
  try {
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    const genshinAccounts = accounts.filter((ac) => ac.gameBiz === "hk4e_cn");
    gameAccounts.value = genshinAccounts;
    if (genshinAccounts.length === 0) {
      await TGLogger.Warn("[Note Sign Card] No Genshin Impact accounts found");
      dailyNoteLoaded.value = true;
      return;
    }
    loadingDailyNote.value = true;
    loadingProgress.value = 0;
    for (let i = 0; i < genshinAccounts.length; i++) {
      const acc = genshinAccounts[i];
      loadingText.value = `正在加载 ${acc.gameBiz} - ${acc.regionName} - ${acc.gameUid}...`;
      loadingProgress.value = (i / genshinAccounts.length) * 100;
      let data: TGApp.Game.DailyNote.DnRes | undefined;
      let dataResp: TGApp.Game.DailyNote.DnResp | undefined;
      try {
        dataResp = await recordReq.daily(cookie.value, acc);
        if (dataResp.retcode !== 0) {
          await TGLogger.Warn(
            `[Note Sign Card] ${acc.gameBiz}: [${dataResp.retcode}] ${dataResp.message}`,
          );
        } else {
          data = dataResp.data;
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        await TGLogger.Error(`[Game Status Card] ${acc.gameBiz}: ${errMsg}`);
        await TGLogger.Error(`[Game Status Card] ${e}`);
      }
      dailyNoteAccounts.value.push({ account: acc, data });
    }
  } catch (error) {
    await TGLogger.Error(`[Game Status Card] Error loading daily note data: ${error}`);
  } finally {
    loadingProgress.value = 100;
    loadingText.value = "加载完成";
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    loadingDailyNote.value = false;
    loadingProgress.value = 0;
    loadingText.value = "";
    dailyNoteLoaded.value = true;
  }
}

async function loadSignData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    signAccounts.value = [];
    return;
  }
  if (signLoaded.value && signAccounts.value.length > 0) return;
  signAccounts.value = [];
  const accounts = await TSUserAccount.game.getAccount(uid.value);
  if (accounts.length === 0) {
    await TGLogger.Warn("[Game Status Card] No game accounts found for sign");
    signLoaded.value = true;
    return;
  }
  loadingSign.value = true;
  loadingProgress.value = 0;
  const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    loadingText.value = `正在加载 ${acc.gameBiz} - ${acc.regionName} - ${acc.gameUid}...`;
    loadingProgress.value = (i / accounts.length) * 100;
    let info, stat;
    let infoResp: TGApp.BBS.Sign.HomeResp | undefined;
    try {
      infoResp = await lunaReq.sign.info(acc, ck);
      if (infoResp.retcode !== 0) {
        await TGLogger.Warn(
          `[Game Status Card] Failed to get rewards for ${acc.gameBiz}: [${infoResp.retcode}] ${infoResp.message}`,
        );
      } else info = infoResp.data;
    } catch (error) {
      const errMsg = TGHttps.getErrMsg(error);
      await TGLogger.Error(`[Game Status Card] Error loading info for ${acc.gameBiz}: ${errMsg}`);
    }
    let statResp: TGApp.BBS.Sign.InfoResp | undefined;
    try {
      statResp = await lunaReq.sign.stat(acc, ck);
      if (statResp.retcode !== 0) {
        await TGLogger.Warn(
          `[Game Status Card] Failed to get status for ${acc.gameBiz}: [${statResp.retcode}] ${statResp.message}`,
        );
      } else stat = statResp.data;
    } catch (error) {
      const errMsg = TGHttps.getErrMsg(error);
      await TGLogger.Error(`[Game Status Card] Error loading stat for ${acc.gameBiz}: ${errMsg}`);
    }
    signAccounts.value.push({ account: acc, info, stat });
  }
  await endLoadSign();
  signLoaded.value = true;
}

async function endLoadSign(): Promise<void> {
  loadingProgress.value = 100;
  loadingText.value = "加载完成";
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  loadingSign.value = false;
  loadingProgress.value = 0;
  loadingText.value = "";
}

async function handleRefreshDailyNote(acc: TGApp.Sqlite.Account.Game): Promise<void> {
  let dataResp: TGApp.Game.DailyNote.DnResp | undefined;
  try {
    dataResp = await recordReq.daily(cookie.value!, acc);
    if (dataResp.retcode !== 0) {
      await TGLogger.Warn(`[Game Status Card] [${dataResp.retcode}] ${dataResp.message}`);
      showSnackbar.error(`刷新失败：[${dataResp.retcode}] ${dataResp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[Game Status Card] 刷新失败：${errMsg}`);
    await TGLogger.Error(`[Game Status Card] ${e}`);
    showSnackbar.error(`刷新失败：${errMsg}`);
    return;
  }
  const item = dailyNoteAccounts.value.find(
    (i) => i.account.gameUid === acc.gameUid && i.account.gameBiz === acc.gameBiz,
  );
  if (item) {
    item.data = dataResp.data;
  }
  showSnackbar.success("刷新成功");
}

async function handleDeleteSignAccount(acc: TGApp.Sqlite.Account.Game): Promise<void> {
  try {
    await TSUserAccount.game.deleteAccount(acc);
    signAccounts.value = signAccounts.value.filter(
      (item) => item.account.gameUid !== acc.gameUid || item.account.gameBiz !== acc.gameBiz,
    );
    showSnackbar.success("账号已删除");
  } catch (error) {
    await TGLogger.Error(`[Game Status Card] Delete account error: ${error}`);
    showSnackbar.error("删除账号失败");
  }
}
</script>
<style lang="scss" scoped>
.tns-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.tns-not-login {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--box-text-1);
  font-size: 16px;
}

.tns-loading {
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

.tns-dn-container {
  position: relative;
  display: grid;
  padding: 8px;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}

.tns-sign-container {
  display: grid;
  padding: 8px;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(350px, 0.34fr));
}
</style>
