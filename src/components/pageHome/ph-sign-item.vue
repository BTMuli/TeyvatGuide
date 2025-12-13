<!-- 单个游戏账户签到卡片 -->
<template>
  <div class="sign-item">
    <div class="sign-header">
      <div class="sign-icon">
        <img :src="gameInfo.icon" :alt="gameInfo.title" />
      </div>
      <div class="sign-info">
        <div class="sign-month">{{ currentMonth }}月 累计签到 {{ signStat?.total_sign_day ?? 0 }} 天</div>
        <div class="sign-account">{{ account.nickname }} - {{ account.gameUid }} ({{ account.regionName }})</div>
        <div class="sign-game">{{ gameInfo.title }}</div>
      </div>
    </div>
    
    <!-- Extra Rewards Section -->
    <div v-if="hasExtraRewards" class="sign-extra-rewards">
      <div class="extra-header">
        <v-icon size="small" color="orange">mdi-star</v-icon>
        <span class="extra-title">额外奖励</span>
        <span class="extra-days">({{ extraSignedDays }}/{{ extraRewards.length }})</span>
        <span class="extra-time">{{ extraTimeInfo }}</span>
      </div>
      <div class="extra-grid">
        <PhSignRewardCell
          v-for="(reward, idx) in extraRewards"
          :key="`extra-${idx}`"
          :reward="reward"
          :day-number="idx + 1"
          :state="getExtraRewardState(idx)"
          :is-extra="true"
        />
      </div>
    </div>

    <!-- Regular Rewards Section -->
    <div v-if="rewards.length > 0" class="sign-rewards">
      <PhSignRewardCell
        v-for="(reward, ridx) in rewards"
        :key="ridx"
        :reward="reward"
        :day-number="ridx + 1"
        :state="getRewardState(ridx)"
      />
    </div>

    <div class="sign-actions">
      <v-btn
        :disabled="isTodaySigned || signing"
        :loading="signing"
        class="sign-btn"
        size="small"
        prepend-icon="mdi-calendar-check"
        @click="handleSign"
      >
        签到
      </v-btn>
      <v-btn 
        :disabled="!canResign || signing" 
        class="sign-btn resign-btn" 
        size="small"
        prepend-icon="mdi-calendar-refresh" 
        @click="handleResign"
      >
        补签
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts" setup>
import PhSignRewardCell from "@comp/pageHome/ph-sign-reward-cell.vue";
import { computed } from "vue";

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
</script>

<style lang="scss" scoped>
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
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-2);
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

.sign-account {
  font-size: 13px;
  color: var(--box-text-1);
  font-weight: 500;
}

.sign-game {
  font-size: 12px;
  color: var(--box-text-2);
}

.sign-extra-rewards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.1), rgba(255, 215, 0, 0.1));
  border-radius: 8px;
  border: 1px solid rgba(255, 165, 0, 0.3);
}

.extra-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--box-text-1);
  font-weight: 500;
}

.extra-title {
  font-weight: 600;
  color: var(--tgc-od-orange);
}

.extra-days {
  font-size: 11px;
  color: var(--box-text-2);
}

.extra-time {
  margin-left: auto;
  font-size: 10px;
  color: var(--box-text-3);
  opacity: 0.7;
}

.extra-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.sign-rewards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 8px;
  background: var(--box-bg-1);
  border-radius: 8px;
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
