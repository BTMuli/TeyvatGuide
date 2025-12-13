<!-- 首页签到卡片 -->
<template>
  <THomeCard :append="isLogin">
    <template #title>签到</template>
    <template v-if="isLogin" #title-append>
      <PhUserSwitch
        :nickname="briefInfo.nickname"
        :current-uid="uid ?? ''"
        @switch-user="handleUserSwitch"
      />
    </template>
    <template #default>
      <div v-if="!isLogin" class="sign-not-login">请先登录</div>
      <div v-else-if="loading" class="sign-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <div v-else-if="signAccounts.length === 0" class="sign-not-login">暂无游戏账户</div>
      <div v-else class="sign-container">
        <PhSignItem
          v-for="item in signAccounts"
          :key="item.account.gameUid"
          :account="item.account"
          :game-info="item.info"
          :sign-stat="item.stat"
          :rewards="item.rewards"
          :extra-rewards="item.extraRewards"
          :has-extra-rewards="item.hasExtraRewards"
          :extra-time-range="item.extraTimeRange"
          :signing="item.signing"
          @sign="handleSign(item)"
          @resign="handleResign"
        />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import THomeCard from "@comp/pageHome/ph-comp-card.vue";
import PhSignItem from "@comp/pageHome/ph-sign-item.vue";
import PhUserSwitch from "@comp/pageHome/ph-user-switch.vue";
import lunaReq from "@req/lunaReq.js";
import miscReq from "@req/miscReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

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
  extraRewards: TGApp.BBS.Sign.HomeAward[];
  hasExtraRewards: boolean;
  extraTimeRange?: { start: string; end: string };
  signing: boolean;
};

type TSignEmits = (e: "success") => void;

const emits = defineEmits<TSignEmits>();
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());

const loading = ref<boolean>(true);
const signAccounts = ref<SignAccount[]>([]);

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
    signAccounts.value = [];
    return;
  }

  loading.value = true;
  signAccounts.value = [];
  
  try {
    // Get all game accounts for current user
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    
    if (accounts.length === 0) {
      await TGLogger.Warn("[Sign Card] No game accounts found");
      loading.value = false;
      return;
    }

    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };

    // Load data for all accounts concurrently
    const promises = accounts.map(async (gameAccount) => {
      const info = getGameInfo(gameAccount.gameBiz);
      const signAccount: SignAccount = {
        account: gameAccount,
        info,
        rewards: [],
        extraRewards: [],
        hasExtraRewards: false,
        signing: false,
      };

      // Get sign-in rewards and status concurrently
      const [rewardsResp, statResp] = await Promise.allSettled([
        lunaReq.home(gameAccount, ck),
        lunaReq.info(gameAccount, ck),
      ]);

      if (rewardsResp.status === 'fulfilled') {
        const rewards = rewardsResp.value;
        if ("retcode" in rewards) {
          await TGLogger.Error(`[Sign Card] Failed to get rewards for ${info.title}: ${rewards.message}`);
        } else {
          signAccount.rewards = rewards.awards;
          
          // Handle extra rewards
          if (rewards.short_extra_award?.has_extra_award && rewards.short_extra_award.list.length > 0) {
            signAccount.hasExtraRewards = true;
            signAccount.extraRewards = rewards.short_extra_award.list;
            signAccount.extraTimeRange = {
              start: rewards.short_extra_award.start_time,
              end: rewards.short_extra_award.end_time,
            };
          }
        }
      }

      if (statResp.status === 'fulfilled') {
        const stat = statResp.value;
        if ("retcode" in stat) {
          await TGLogger.Error(`[Sign Card] Failed to get status for ${info.title}: ${stat.message}`);
        } else {
          signAccount.stat = stat;
        }
      }

      return signAccount;
    });

    signAccounts.value = await Promise.all(promises);
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Error loading data: ${error}`);
  } finally {
    loading.value = false;
  }
}

async function handleUserSwitch(newUid: string): Promise<void> {
  // Data will automatically reload via uid watcher
  await TGLogger.Info(`[Sign Card] User switched to ${newUid}`);
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 12px;
  padding: 8px;
}
</style>
