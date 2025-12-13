<!-- 单个游戏账户签到卡片 -->
<template>
  <div ref="signItemRef" class="sign-item">
    <div class="sign-header">
      <div :title="gameInfo.title" class="sign-icon" @click="shareItem()">
        <img :alt="gameInfo.title" :src="gameInfo.icon" />
      </div>
      <div class="sign-info">
        <div class="sign-month">
          <span class="hint">{{ currentMonth }}</span>
          <span>月</span>
          <span>累计签到</span>
          <span class="hint">{{ signStat?.total_sign_day ?? 0 }}</span>
          <span>天</span>
          <span class="hint">{{ signStat?.is_sign ? "已签到" : "未签到" }}</span>
        </div>
        <div class="sign-account">
          {{ account.nickname }} - {{ account.gameUid }} ({{ account.regionName }})
        </div>
      </div>
    </div>
    <!-- 额外签到奖励部分 TODO：需测试 -->
    <div v-if="hasExtraRewards" class="sign-extra-rewards">
      <div class="extra-header">
        <v-icon color="orange" size="small">mdi-star</v-icon>
        <span class="extra-title">额外奖励</span>
        <span class="extra-days">({{ extraSignedDays }}/{{ extraRewards.length }})</span>
        <span class="extra-time">{{ extraTimeInfo }}</span>
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
        :reward="reward"
        :state="getRewardState(ridx)"
      />
    </div>
    <!-- 签到操作 -->
    <div class="sign-actions" data-html2canvas-ignore>
      <v-btn
        :disabled="isTodaySigned || signing"
        :loading="signing"
        class="sign-btn"
        prepend-icon="mdi-calendar-check"
        size="small"
        @click="handleSign"
      >
        签到
      </v-btn>
      <v-btn
        :disabled="!canResign || signing"
        class="sign-btn resign-btn"
        prepend-icon="mdi-calendar-refresh"
        size="small"
        @click="handleResign"
      >
        补签
      </v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import PhSignRewardCell from "@comp/pageHome/ph-sign-reward-cell.vue";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, useTemplateRef } from "vue";

type SignGameInfo = {
  title: string;
  icon: string;
  gid: number;
};

type Props = {
  account: TGApp.Sqlite.Account.Game;
  gameInfo: SignGameInfo;
  signStat?: TGApp.BBS.Sign.InfoRes;
  rewards: TGApp.BBS.Sign.HomeAward[];
  extraRewards: TGApp.BBS.Sign.HomeAward[];
  hasExtraRewards: boolean;
  extraTimeRange?: { start: string; end: string };
  signing: boolean;
};

type Emits = {
  (e: "sign"): void;
  (e: "resign"): void;
};

const props = defineProps<Props>();
const emits = defineEmits<Emits>();

const signItemEl = useTemplateRef<HTMLDivElement>("signItemRef");

const currentMonth = computed(() => new Date().getMonth() + 1);
const currentDay = computed(() => new Date().getDate());

// Total days signed (from API)
const totalSignedDays = computed(() => props.signStat?.total_sign_day ?? 0);

// Extra sign-in days
const extraSignedDays = computed(() => props.signStat?.short_sign_day ?? 0);

// Whether today is already signed
const isTodaySigned = computed(() => props.signStat?.is_sign ?? false);

// Can resign if: there are missed days (currentDay - 1 > totalSignedDays) and today is already signed
const canResign = computed(() => {
  const missed = currentDay.value - 1 - totalSignedDays.value;
  return missed > 0 && isTodaySigned.value;
});

// Extra rewards time range info
const extraTimeInfo = computed(() => {
  if (!props.extraTimeRange) return "";
  return `${props.extraTimeRange.start} ~ ${props.extraTimeRange.end}`;
});

// Get reward state for regular rewards
function getRewardState(index: number): "signed" | "next-reward" | "missed" | "normal" {
  const signedDays = totalSignedDays.value;
  const today = currentDay.value;

  // Already signed
  if (index < signedDays) {
    return "signed";
  }

  // Next reward to receive
  if (index === signedDays && !isTodaySigned.value) {
    return "next-reward";
  }

  // Missed days (between signed count and current date)
  if (index < today - 1 && index >= signedDays) {
    return "missed";
  }

  return "normal";
}

// Get reward state for extra rewards
function getExtraRewardState(index: number): "signed" | "next-reward" | "missed" | "normal" {
  const signedDays = extraSignedDays.value;

  // Already signed
  if (index < signedDays) {
    return "signed";
  }

  // Next reward to receive (extra rewards don't have missed state, only available during event)
  if (index === signedDays && !isTodaySigned.value) {
    return "next-reward";
  }

  return "normal";
}

function handleSign() {
  emits("sign");
}

function handleResign() {
  emits("resign");
}

async function shareItem(): Promise<void> {
  if (!signItemEl.value) return;
  const fileName = `游戏签到_${props.gameInfo.title}_${props.account.gameUid}`;
  await generateShareImg(fileName, signItemEl.value, 2);
}
</script>
<style lang="scss" scoped>
.sign-item {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 8px;
}

.sign-header {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-2);
  gap: 8px;
}

.sign-icon {
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

.sign-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.sign-month {
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

.sign-account {
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
