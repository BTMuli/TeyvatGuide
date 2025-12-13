<!-- 首页签到卡片 -->
<template>
  <THomeCard :append="false">
    <template #title>签到</template>
    <template #default>
      <div v-if="!isLogin" class="sign-not-login">请先登录</div>
      <div v-else-if="loading" class="sign-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <div v-else class="sign-container">
        <div class="sign-header">
          <div class="sign-icon">
            <img v-if="gameInfo" :src="gameInfo.icon" :alt="gameInfo.title" />
          </div>
          <div class="sign-info">
            <div class="sign-month">{{ currentMonth }}月 累计签到 {{ totalSignDays }} 天</div>
            <div v-if="signStat" class="sign-status">
              <v-icon v-if="signStat.is_sign" color="success" size="small">
                mdi-check-circle
              </v-icon>
              <span :class="signStat.is_sign ? 'signed' : 'unsigned'">
                {{ signStat.is_sign ? "今日已签到" : "今日未签到" }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="rewardsList.length > 0" class="sign-rewards">
          <div
            v-for="(reward, idx) in rewardsList"
            :key="idx"
            :class="{ current: idx === currentDay - 1, signed: idx < totalSignDays }"
            class="sign-reward-item"
          >
            <TMiImg :ori="true" :src="reward.icon" :alt="reward.name" class="reward-icon" />
            <span class="reward-count">{{ reward.cnt }}</span>
            <div v-if="idx < totalSignDays" class="reward-check">
              <v-icon color="success" size="16">mdi-check</v-icon>
            </div>
            <div class="reward-day">{{ idx + 1 }}</div>
          </div>
        </div>
        <div class="sign-actions">
          <v-btn
            :disabled="signStat?.is_sign || signing"
            :loading="signing"
            class="sign-btn"
            @click="handleSign"
          >
            <v-icon left>mdi-calendar-check</v-icon>
            签到
          </v-btn>
          <v-btn :disabled="true" class="sign-btn resign-btn" @click="handleResign">
            <v-icon left>mdi-calendar-refresh</v-icon>
            补签
          </v-btn>
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

type TSignEmits = (e: "success") => void;

const emits = defineEmits<TSignEmits>();
const { cookie, uid } = storeToRefs(useUserStore());
const { isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());

const loading = ref<boolean>(true);
const signing = ref<boolean>(false);
const gameAccount = ref<TGApp.Sqlite.Account.Game>();
const gameInfo = ref<SignGameInfo>();
const signStat = ref<TGApp.BBS.Sign.InfoRes>();
const rewardsList = ref<TGApp.BBS.Sign.HomeAward[]>([]);

const currentMonth = computed(() => new Date().getMonth() + 1);
const currentDay = computed(() => new Date().getDate());
const totalSignDays = computed(() => signStat.value?.total_sign_day ?? 0);

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
  try {
    // Get primary game account (原神)
    const accounts = await TSUserAccount.game.getAccount(uid.value);
    const ysAccount = accounts.find((ac) => ac.gameBiz === "hk4e_cn");

    if (!ysAccount) {
      await TGLogger.Warn("[Sign Card] No Genshin account found");
      loading.value = false;
      return;
    }

    gameAccount.value = ysAccount;
    gameInfo.value = getGameInfo(ysAccount.gameBiz);

    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };

    // Get sign-in rewards
    const rewardsResp = await lunaReq.home(ysAccount, ck);
    if ("retcode" in rewardsResp) {
      await TGLogger.Error(`[Sign Card] Failed to get rewards: ${rewardsResp.message}`);
      showSnackbar.error(`获取签到奖励失败: ${rewardsResp.message}`);
    } else {
      rewardsList.value = rewardsResp.awards;
    }

    // Get sign-in status
    const statResp = await lunaReq.info(ysAccount, ck);
    if ("retcode" in statResp) {
      await TGLogger.Error(`[Sign Card] Failed to get status: ${statResp.message}`);
      showSnackbar.error(`获取签到状态失败: ${statResp.message}`);
    } else {
      signStat.value = statResp;
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Error loading data: ${error}`);
  } finally {
    loading.value = false;
  }
}

async function handleSign(): Promise<void> {
  if (!cookie.value || !gameAccount.value) {
    showSnackbar.warn("请先登录");
    return;
  }

  signing.value = true;
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    const ckSign = { stoken: cookie.value.stoken, stuid: cookie.value.stuid, mid: cookie.value.mid };

    let check = false;
    let challenge: string | undefined = undefined;

    while (!check) {
      const signResp = await lunaReq.sign(gameAccount.value, ck, challenge);

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
      await loadData();
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Card] Sign-in error: ${error}`);
    showSnackbar.error("签到失败，请重试");
  } finally {
    signing.value = false;
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

.sign-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sign-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.sign-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sign-month {
  font-family: var(--font-title);
  font-size: 18px;
  color: var(--box-text-1);
  font-weight: 500;
}

.sign-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;

  .signed {
    color: var(--tgc-od-green);
  }

  .unsigned {
    color: var(--box-text-2);
  }
}

.sign-rewards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding: 8px;
  background: var(--box-bg-2);
  border-radius: 8px;
}

.sign-reward-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--box-bg-1);
  border: 2px solid transparent;
  transition: all 0.2s;

  &.current {
    border-color: var(--tgc-od-blue);
    background: var(--box-bg-3);
  }

  &.signed {
    opacity: 0.6;
  }

  &:hover {
    transform: scale(1.05);
  }
}

.reward-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.reward-count {
  margin-top: 4px;
  font-size: 12px;
  color: var(--box-text-1);
}

.reward-check {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--box-bg-4);
  border-radius: 50%;
}

.reward-day {
  margin-top: 2px;
  font-size: 11px;
  color: var(--box-text-2);
}

.sign-actions {
  display: flex;
  gap: 12px;
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
