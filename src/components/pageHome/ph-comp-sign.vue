<!-- 首页签到卡片 -->
<template>
  <THomeCard :append="false">
    <template #title>签到</template>
    <template #default>
      <div v-if="!isLogin" class="sign-not-login">请先登录</div>
      <div v-else-if="loading" class="sign-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <div v-else-if="signAccounts.length === 0" class="sign-not-login">暂无游戏账户</div>
      <div v-else class="sign-container">
        <div
          v-for="(item, idx) in signAccounts"
          :key="idx"
          class="sign-item"
        >
          <div class="sign-header">
            <div class="sign-icon">
              <img :src="item.info.icon" :alt="item.info.title" />
            </div>
            <div class="sign-info">
              <div class="sign-month">{{ currentMonth }}月 累计签到 {{ item.stat?.total_sign_day ?? 0 }} 天</div>
              <div class="sign-game">{{ item.info.title }} - {{ item.account.regionName }}</div>
            </div>
          </div>
          <div v-if="item.rewards.length > 0" class="sign-rewards">
            <div
              v-for="(reward, ridx) in item.rewards.slice(0, 7)"
              :key="ridx"
              :class="{ 
                current: ridx === currentDay - 1, 
                signed: ridx < (item.stat?.total_sign_day ?? 0)
              }"
              class="sign-reward-item"
            >
              <TMiImg :ori="true" :src="reward.icon" :alt="reward.name" class="reward-icon" />
              <span class="reward-count">×{{ reward.cnt }}</span>
              <div v-if="ridx < (item.stat?.total_sign_day ?? 0)" class="reward-check">
                <v-icon color="success" size="14">mdi-check</v-icon>
              </div>
              <div class="reward-day">{{ ridx + 1 }}</div>
            </div>
          </div>
          <div class="sign-actions">
            <v-btn
              :disabled="item.stat?.is_sign || item.signing"
              :loading="item.signing"
              class="sign-btn"
              size="small"
              prepend-icon="mdi-calendar-check"
              @click="handleSign(item)"
            >
              签到
            </v-btn>
            <v-btn 
              :disabled="true" 
              class="sign-btn resign-btn" 
              size="small"
              prepend-icon="mdi-calendar-refresh" 
              @click="handleResign"
            >
              补签
            </v-btn>
          </div>
        </div>
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import THomeCard from "@comp/pageHome/ph-comp-card.vue";
import lunaReq from "@req/lunaReq.js";
import miscReq from "@req/miscReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

type SignGameInfo = {
  title: string;
  icon: string;
  gid: number;
};

type SignAccount = {
  account: TGApp.Sqlite.Account.Game;
  info: SignGameInfo;
  stat?: TGApp.BBS.Sign.InfoRes;
  rewards: TGApp.BBS.Sign.HomeAward[];
  signing: boolean;
};

type TSignEmits = (e: "success") => void;

const emits = defineEmits<TSignEmits>();
const { cookie, uid } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());

const loading = ref<boolean>(true);
const signAccounts = ref<SignAccount[]>([]);

const currentMonth = computed(() => new Date().getMonth() + 1);
const currentDay = computed(() => new Date().getDate());

watch(
  () => uid.value,
  async () => await loadData(),
);

onMounted(async () => {
  await loadData();
  emits("success");
});

function getGameInfo(biz: string): SignGameInfo {
  const enName = biz.split("_")[0];
  if (!enName) return { title: biz, icon: "/platforms/mhy/mys.webp", gid: 0 };
  const findGame = gameList.value.find((i) => i.op_name === enName);
  if (findGame) return { title: findGame.name, icon: findGame.app_icon, gid: findGame.id };
  return { title: biz, icon: "/platforms/mhy/mys.webp", gid: 0 };
}

async function loadData(): Promise<void> {
  if (!isLogin.value || uid.value === undefined || !cookie.value) {
    loading.value = false;
    return;
  }

  loading.value = true;
  signAccounts.value = [];
  
  try {
    // Get all game accounts
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    
    if (accounts.length === 0) {
      await TGLogger.Warn("[Sign Card] No game accounts found");
      loading.value = false;
      return;
    }

    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };

    // Load data for each account
    for (const account of accounts) {
      const info = getGameInfo(account.gameBiz);
      const signAccount: SignAccount = {
        account,
        info,
        rewards: [],
        signing: false,
      };

      // Get sign-in rewards
      const rewardsResp = await lunaReq.home(account, ck);
      if ("retcode" in rewardsResp) {
        await TGLogger.Error(`[Sign Card] Failed to get rewards for ${info.title}: ${rewardsResp.message}`);
      } else {
        signAccount.rewards = rewardsResp.awards;
      }

      // Get sign-in status
      const statResp = await lunaReq.info(account, ck);
      if ("retcode" in statResp) {
        await TGLogger.Error(`[Sign Card] Failed to get status for ${info.title}: ${statResp.message}`);
      } else {
        signAccount.stat = statResp;
      }

      signAccounts.value.push(signAccount);
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Error loading data: ${error}`);
  } finally {
    loading.value = false;
  }
}

async function handleSign(item: SignAccount): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }

  item.signing = true;
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    const ckSign = { stoken: cookie.value.stoken, stuid: cookie.value.stuid, mid: cookie.value.mid };

    let check = false;
    let challenge: string | undefined = undefined;

    while (!check) {
      const signResp = await lunaReq.sign(item.account, ck, challenge);

      if (challenge !== undefined) challenge = undefined;

      if ("retcode" in signResp) {
        if (signResp.retcode === 1034) {
          await TGLogger.Info("[Sign Card] Captcha required");
          const challengeGet = await miscReq.challenge(ckSign);
          if (challengeGet === false) {
            showSnackbar.error("验证码验证失败");
            break;
          }
          challenge = challengeGet;
          continue;
        }
        await TGLogger.Error(`[Sign Card] Sign-in failed: ${signResp.message}`);
        showSnackbar.error(`签到失败: ${signResp.message}`);
        break;
      }

      if (signResp.success === 0) {
        check = true;
      } else if (signResp.is_risk) {
        await TGLogger.Info("[Sign Card] Risk verification required");
        const gtRes = await showGeetest({
          gt: signResp.gt,
          challenge: signResp.challenge,
          new_captcha: 1,
          success: 1,
        });
        if (gtRes === false) {
          showSnackbar.error("验证码验证失败");
          break;
        }
        challenge = signResp.challenge;
      } else {
        break;
      }
    }

    if (check) {
      showSnackbar.success("签到成功");
      // Refresh only this account's data
      const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
      const statResp = await lunaReq.info(item.account, ck);
      if (!("retcode" in statResp)) {
        item.stat = statResp;
      }
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Sign-in error: ${error}`);
    showSnackbar.error("签到失败，请重试");
  } finally {
    item.signing = false;
  }
}

async function handleResign(): Promise<void> {
  showSnackbar.info("补签功能暂未开放");
}
</script>
<style lang="scss" scoped>
.sign-not-login,
.sign-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--box-text-1);
  font-size: 16px;
}

.sign-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.sign-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--box-bg-2);
  border: 1px solid var(--common-shadow-2);
}

.sign-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sign-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.sign-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.sign-month {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--box-text-1);
  font-weight: 500;
}

.sign-game {
  font-size: 12px;
  color: var(--box-text-2);
}

.sign-rewards {
  display: flex;
  gap: 6px;
  padding: 8px 4px;
  background: var(--box-bg-1);
  border-radius: 6px;
}

.sign-reward-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  border-radius: 6px;
  background: var(--box-bg-2);
  border: 2px solid transparent;
  transition: all 0.2s;
  min-width: 0;
  flex: 1 1 0;

  &.current {
    border-color: var(--tgc-od-blue);
    background: var(--box-bg-3);
  }

  &.signed {
    opacity: 0.7;
  }

  &:hover {
    transform: scale(1.05);
  }
}

.reward-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.reward-count {
  margin-top: 2px;
  font-size: 10px;
  color: var(--box-text-1);
}

.reward-check {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--box-bg-4);
  border-radius: 50%;
}

.reward-day {
  margin-top: 2px;
  font-size: 10px;
  color: var(--box-text-2);
}

.sign-actions {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.sign-btn {
  flex: 1;
  background: var(--tgc-btn-1);
  color: var(--btn-text);

  &.resign-btn {
    background: var(--box-bg-3);
  }
}
</style>
