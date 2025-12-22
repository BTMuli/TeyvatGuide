<!-- 单个游戏账户签到卡片 -->
<template>
  <div ref="signItemRef" class="ph-si-box">
    <div class="ph-si-top">
      <div :title="gameInfo.title" class="ph-sit-icon" @click="shareItem()">
        <img :alt="gameInfo.title" :src="gameInfo.icon" />
      </div>
      <div class="ph-sit-info">
        <div class="ph-sit-title">
          <span class="hint">{{ signInfo?.month }}</span>
          <span>月</span>
          <span>累计签到</span>
          <span class="hint">{{ signStat?.total_sign_day ?? 0 }}</span>
          <span>天</span>
          <span class="hint">{{ signStat?.is_sign ? "已签到" : "未签到" }}</span>
        </div>
        <div class="ph-sit-sub">
          {{ account.nickname }} - {{ account.gameUid }} ({{ account.regionName }})
        </div>
      </div>
      <v-btn
        v-if="props.account.gameBiz !== 'hk4e_cn'"
        class="ph-sit-delete"
        data-html2canvas-ignore
        icon="mdi-delete"
        size="x-small"
        @click="tryDelete()"
      />
    </div>
    <!-- 额外签到奖励部分 -->
    <div v-if="hasExtraRewards" class="sign-extra-rewards">
      <div class="extra-header">
        <v-icon color="orange" size="small">mdi-star</v-icon>
        <span class="extra-title">额外奖励</span>
        <span class="extra-days">({{ extraSignedDays }}/{{ extraRewards.length }})</span>
        <span class="extra-time">{{ extraTimeStr }}</span>
      </div>
      <div class="extra-grid">
        <PhSignRewardCell
          v-for="(reward, idx) in extraRewards"
          :key="`extra-${idx}`"
          :day-number="idx + 1"
          :is-extra="true"
          :reward="reward"
          :state="getExtraRewardState(idx)"
        />
      </div>
    </div>
    <!-- 签到日历 -->
    <div v-if="rewards.length > 0" class="sign-rewards">
      <PhSignRewardCell
        v-for="(reward, ridx) in rewards"
        :key="ridx"
        :day-number="ridx + 1"
        :is-clickable="getRewardClickable(ridx)"
        :reward="reward"
        :state="getRewardState(ridx)"
        @click="handleRewardCellClick(ridx)"
      />
    </div>
    <!-- 签到操作 -->
    <div class="sign-actions" data-html2canvas-ignore>
      <template v-if="signInfo && signStat">
        <v-btn
          :disabled="isTodaySigned || isSign || isResign"
          :loading="isSign"
          class="sign-btn"
          size="small"
          @click="handleSign"
        >
          <template #prepend>
            <v-icon v-if="isTodaySigned" color="green">mdi-check-circle</v-icon>
            <v-icon v-else>mdi-calendar-check</v-icon>
          </template>
          {{ isTodaySigned ? "已签到" : "签到" }}
        </v-btn>
        <v-btn
          :disabled="!canResign || isSign || isResign"
          :loading="isResign"
          class="sign-btn resign-btn"
          prepend-icon="mdi-calendar-refresh"
          size="small"
          @click="handleResign"
        >
          补签{{ resignCount > 0 ? ` (${resignCount})` : "" }}
        </v-btn>
      </template>
      <v-btn
        :disabled="isRefresh"
        :loading="isRefresh"
        class="sign-btn"
        prepend-icon="mdi-refresh"
        size="small"
        @click="refreshData()"
      >
        刷新数据
      </v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhSignRewardCell, { RewardStateEnum } from "@comp/pageHome/ph-sign-reward-cell.vue";
import lunaReq from "@req/lunaReq.js";
import miscReq from "@req/miscReq.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { computed, ref, useTemplateRef } from "vue";

const RewardState = <const>{
  NORMAL: 0,
  SIGNED: 1,
  NEXT_REWARD: 2,
  MISSED: 3,
};

type SignGameInfo = { title: string; icon: string; gid: number };
type PhSignItemProps = {
  account: TGApp.Sqlite.Account.Game;
  info?: TGApp.BBS.Sign.HomeRes;
  stat?: TGApp.BBS.Sign.InfoRes;
};
type PhSignItemEmits = {
  (e: "delete", account: TGApp.Sqlite.Account.Game): void;
};

const props = defineProps<PhSignItemProps>();
const emits = defineEmits<PhSignItemEmits>();

const { cookie } = storeToRefs(useUserStore());
const { gameList } = storeToRefs(useBBSStore());

const signItemEl = useTemplateRef<HTMLDivElement>("signItemRef");

const isSign = ref<boolean>(false);
const isResign = ref<boolean>(false);
const isRefresh = ref<boolean>(false);
const signInfo = ref<TGApp.BBS.Sign.HomeRes | undefined>(props.info);
const signStat = ref<TGApp.BBS.Sign.InfoRes | undefined>(props.stat);
const resignInfo = ref<TGApp.BBS.Sign.ResignInfoRes | undefined>(undefined);

const gameInfo = computed<SignGameInfo>(() => {
  const biz = props.account.gameBiz;
  const enName = biz.split("_")[0];
  if (!enName) return { title: biz, icon: "/platforms/mhy/mys.webp", gid: 0 };
  const findGame = gameList.value.find((i) => i.op_name === enName);
  if (findGame) return { title: findGame.name, icon: findGame.app_icon, gid: findGame.id };
  return { title: biz, icon: "/platforms/mhy/mys.webp", gid: 0 };
});
const rewards = computed<Array<TGApp.BBS.Sign.HomeAward>>(() => signInfo.value?.awards ?? []);
const extraRewards = computed<Array<TGApp.BBS.Sign.HomeAward>>(() => {
  if (!signInfo.value) return [];
  if (
    signInfo.value.short_extra_award.has_extra_award &&
    signInfo.value.short_extra_award.list.length > 0
  ) {
    return signInfo.value.short_extra_award.list;
  }
  return [];
});
const hasExtraRewards = computed<boolean>(() => extraRewards.value.length > 0);
const extraTimeStr = computed<string>(() => {
  if (!signInfo.value) return "";
  if (!signInfo.value.short_extra_award.has_extra_award) return "";
  return `${signInfo.value.short_extra_award.start_time}~${signInfo.value.short_extra_award.end_time}`;
});
const currentDay = computed<number>(() => new Date().getDate());
const totalSignedDays = computed<number>(() => signStat.value?.total_sign_day ?? 0);
const extraSignedDays = computed<number>(() => signStat.value?.short_sign_day ?? 0);
const isTodaySigned = computed<boolean>(() => signStat.value?.is_sign ?? false);
const canResign = computed<boolean>(() => {
  if (!signStat.value?.is_sign) return false;
  if (resignInfo.value?.quality_cnt === 0) return false;
  const missed = currentDay.value - 1 - totalSignedDays.value;
  return missed > 0 && isTodaySigned.value;
});
const resignCount = computed<number>(() => resignInfo.value?.quality_cnt ?? 0);

// 刷新数据
async function refreshData(): Promise<void> {
  if (!cookie.value) return;
  isRefresh.value = true;
  const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
  try {
    const infoResp = await lunaReq.sign.info(props.account, ck);
    console.log("signInfo", infoResp);
    if ("retcode" in infoResp) {
      showSnackbar.warn(`刷新信息失败: ${infoResp.retcode} ${infoResp.message}`);
    } else signInfo.value = infoResp;
    const statResp = await lunaReq.sign.stat(props.account, ck);
    console.log("signStat", statResp);
    if ("retcode" in statResp) {
      showSnackbar.warn(`刷新状态失败: ${statResp.retcode} ${statResp.message}`);
    } else signStat.value = statResp;
    showSnackbar.success(`成功刷新签到信息`);
  } catch (e) {
    console.error(e);
  }
  isRefresh.value = false;
}

// Get reward state for regular rewards
function getRewardState(index: number): RewardStateEnum {
  const signedDays = totalSignedDays.value;
  const today = currentDay.value;
  // Already signed
  if (index < signedDays) {
    return RewardState.SIGNED;
  }
  // Next reward to receive
  if (index === signedDays && !isTodaySigned.value) {
    return RewardState.NEXT_REWARD;
  }
  // Missed days (between signed count and current date)
  if (index < today - 1 && index >= signedDays) {
    return RewardState.MISSED;
  }
  return RewardState.NORMAL;
}

// Get reward state for extra rewards
function getExtraRewardState(index: number): RewardStateEnum {
  const signedDays = extraSignedDays.value;
  // Already signed
  if (index < signedDays) return RewardState.SIGNED;
  // Next reward to receive (extra rewards don't have missed state, only available during event)
  if (index === signedDays && !isTodaySigned.value) return RewardState.NEXT_REWARD;
  return RewardState.NORMAL;
}

// Get if reward cell is clickable (for missed days, only first missed day is clickable)
function getRewardClickable(index: number): boolean {
  const state = getRewardState(index);
  if (state === RewardState.NEXT_REWARD) {
    return true;
  } else if (state === RewardState.MISSED) {
    // Only the first missed day is clickable for resign
    // According to MiHoYo rules, you can only make up the first missed day
    const signedDays = signStat.value?.total_sign_day ?? 0;
    return index === signedDays;
  }
  return false;
}

// Handle reward cell click
function handleRewardCellClick(index: number): void {
  const state = getRewardState(index);
  if (state === RewardState.NEXT_REWARD) {
    // Click on next reward cell triggers sign-in
    handleSign();
  } else if (state === RewardState.MISSED) {
    // Only allow clicking the first missed day for resign
    // According to MiHoYo rules, you can only make up the first missed day
    const signedDays = signStat.value?.total_sign_day ?? 0;
    if (index === signedDays) {
      // This is the first missed day, allow resign
      handleResign();
    }
    // If it's not the first missed day, do nothing (clicking won't trigger resign)
  }
}

async function loadResignInfo(): Promise<void> {
  if (!cookie.value) return;
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    const resignResp = await lunaReq.resign.info(props.account, ck);
    console.log(resignResp);
    if ("retcode" in resignResp) {
      await TGLogger.Warn(`[Sign Item] Failed to load resign info: ${resignResp.message}`);
    } else {
      resignInfo.value = resignResp;
      await TGLogger.Info(`[Sign Item] Resign info loaded for ${props.account.gameUid}`);
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Item] Load resign info error: ${error}`);
  }
}

// Update local data after successful sign/resign without API call
function updateLocalDataAfterSign(): void {
  if (!signStat.value) return;
  // Increment sign count
  signStat.value.total_sign_day += 1;
  // Mark as signed today
  signStat.value.is_sign = true;
  // Update extra sign day if has extra award
  if (signInfo.value?.short_extra_award.has_extra_award) {
    signStat.value.short_sign_day += 1;
  }
}

function updateLocalDataAfterResign(): void {
  if (!signStat.value || !resignInfo.value) return;
  // Increment sign count
  signStat.value.total_sign_day += 1;
  // Decrement missed count
  if (signStat.value.sign_cnt_missed > 0) {
    signStat.value.sign_cnt_missed -= 1;
  }
  // Decrement resign count
  if (resignInfo.value.quality_cnt > 0) {
    resignInfo.value.quality_cnt -= 1;
  }
  if (signInfo.value) signInfo.value.resign = true;
}

async function handleSign(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  isSign.value = true;
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    const ckSign = {
      stoken: cookie.value.stoken,
      stuid: cookie.value.stuid,
      mid: cookie.value.mid,
    };

    let check = false;
    let challenge: string | undefined = undefined;

    while (!check) {
      const signResp = await lunaReq.sign.oper(props.account, ck, challenge);
      if (challenge !== undefined) challenge = undefined;
      if ("retcode" in signResp) {
        if (signResp.retcode === 1034) {
          await TGLogger.Info("[Sign Item] Captcha required");
          const challengeGet = await miscReq.challenge(ckSign);
          if (challengeGet === false) {
            showSnackbar.error("验证码验证失败");
            break;
          }
          challenge = challengeGet;
          continue;
        }
        await TGLogger.Error(`[Sign Item] Sign-in failed: ${signResp.message}`);
        showSnackbar.error(`签到失败: ${signResp.message}`);
        break;
      }

      if (signResp.success === 0) {
        check = true;
      } else if (signResp.is_risk) {
        await TGLogger.Info("[Sign Item] Risk verification required");
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
      updateLocalDataAfterSign();
      // Load resign info only if there are missed days
      const missedDays = signStat.value?.sign_cnt_missed ?? 0;
      if (missedDays > 0) {
        await loadResignInfo();
      }
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Item] Sign-in error: ${error}`);
    showSnackbar.error("签到失败，请重试");
  } finally {
    isSign.value = false;
  }
}

async function handleResign(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  // Check if can resign
  const missedDays = signStat.value?.sign_cnt_missed ?? 0;
  if (missedDays === 0) {
    showSnackbar.warn("没有漏签天数，无需补签");
    return;
  }
  // Load resign info first
  await loadResignInfo();

  if (!resignInfo.value) {
    showSnackbar.error("获取补签信息失败");
    return;
  }
  const resignCnt = resignInfo.value.quality_cnt;
  // Check resign count
  if (resignCnt <= 0) {
    showSnackbar.warn("补签次数不足");
    return;
  }

  // Check coin
  const coinCost = resignInfo.value.coin_cost;
  const coinCnt = resignInfo.value.coin_cnt;
  if (coinCnt < coinCost) {
    showSnackbar.warn(`米游币不足，需要 ${coinCost} 米游币`);
    return;
  }

  // Confirm resign
  const confirmMsg = `漏签天数: ${missedDays} 剩余补签次数: ${resignInfo.value.quality_cnt}\n花费: ${coinCost} 米游币 当前米游币: ${coinCnt}`;
  const confirmed = await showDialog.check("确认补签?", confirmMsg);
  if (!confirmed) {
    showSnackbar.cancel("已取消补签");
    return;
  }

  isResign.value = true;
  try {
    const ck = { cookie_token: cookie.value.cookie_token, account_id: cookie.value.account_id };
    const ckSign = {
      stoken: cookie.value.stoken,
      stuid: cookie.value.stuid,
      mid: cookie.value.mid,
    };

    let check = false;
    let challenge: string | undefined = undefined;

    while (!check) {
      const resignResp = await lunaReq.resign.oper(props.account, ck, challenge);
      if (challenge !== undefined) challenge = undefined;
      if ("retcode" in resignResp) {
        if (resignResp.retcode === 1034) {
          await TGLogger.Info("[Sign Item] Captcha required for resign");
          const challengeGet = await miscReq.challenge(ckSign);
          if (challengeGet === false) {
            showSnackbar.error("验证码验证失败");
            break;
          }
          challenge = challengeGet;
          continue;
        }
        await TGLogger.Error(`[Sign Item] Resign failed: ${resignResp.message}`);
        showSnackbar.error(`补签失败: ${resignResp.message}`);
        break;
      }

      // Resign successful
      check = true;
      updateLocalDataAfterResign();
      showSnackbar.success(
        `补签成功，剩余补签次数${resignCnt - 1}次，剩余米游币${coinCnt - coinCost}`,
      );
    }
  } catch (error) {
    await TGLogger.Error(`[Sign Item] Resign error: ${error}`);
    showSnackbar.error("补签失败，请重试");
  } finally {
    isResign.value = false;
  }
}

async function tryDelete(): Promise<void> {
  const infoStr = `${gameInfo.value.title}-${props.account.regionName}-${props.account.gameUid}`;
  const check = await showDialog.check(`确定删除?`, `${infoStr}\n删除后仅能通过刷新游戏账号恢复`);
  if (!check) {
    showSnackbar.cancel(`已取消删除${infoStr}`);
    return;
  }
  emits("delete", props.account);
}

async function shareItem(): Promise<void> {
  if (!signItemEl.value) return;
  const fileName = `游戏签到_${gameInfo.value.title}_${props.account.gameUid}`;
  await generateShareImg(fileName, signItemEl.value, 2);
}
</script>
<style lang="scss" scoped>
.ph-si-box {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 8px;
}

.ph-si-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-2);
  gap: 4px;
}

.ph-sit-delete {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--tgc-btn-1);
  color: var(--tgc-od-red);

  &:hover {
    opacity: 1;
  }
}

.ph-sit-icon {
  overflow: hidden;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.ph-sit-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.ph-sit-title {
  display: flex;
  color: var(--box-text-1);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 500;

  .hint {
    color: var(--tgc-od-red);
  }
}

.ph-sit-sub {
  color: var(--box-text-1);
  font-size: 13px;
  font-weight: 500;
}

.sign-extra-rewards {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid rgb(255 165 0 / 30%);
  border-radius: 8px;
  background: linear-gradient(135deg, rgb(255 165 0 / 10%), rgb(255 215 0 / 10%));
  gap: 6px;
}

.extra-header {
  display: flex;
  align-items: center;
  color: var(--box-text-1);
  font-size: 12px;
  font-weight: 500;
  gap: 6px;
}

.extra-title {
  color: var(--tgc-od-orange);
  font-weight: 600;
}

.extra-days {
  color: var(--box-text-2);
  font-size: 11px;
}

.extra-time {
  margin-left: auto;
  color: var(--box-text-3);
  font-size: 10px;
  opacity: 0.7;
}

.extra-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
}

.sign-rewards {
  display: grid;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
  grid-template-columns: repeat(7, 1fr);
}

.sign-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.sign-btn {
  flex: 1;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-weight: 500;

  &.resign-btn {
    background: var(--box-bg-3);
    color: var(--box-text-2);
  }

  &:not(:disabled).resign-btn {
    background: var(--tgc-od-orange);
    color: var(--tgc-white-1);
  }
}

.dark .sign-btn.resign-btn {
  background: var(--box-bg-3);
  color: var(--box-text-2);

  &:not(:disabled) {
    background: var(--tgc-od-orange);
    color: var(--tgc-white-1);
  }
}
</style>
