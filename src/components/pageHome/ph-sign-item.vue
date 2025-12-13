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
    <div v-if="rewards.length > 0" class="sign-rewards">
      <div
        v-for="(reward, ridx) in rewards"
        :key="ridx"
        :class="{ 
          current: ridx === currentDay - 1, 
          signed: ridx < (signStat?.total_sign_day ?? 0)
        }"
        class="sign-reward-item"
      >
        <TMiImg :ori="true" :src="reward.icon" :alt="reward.name" class="reward-icon" />
        <span class="reward-count">×{{ reward.cnt }}</span>
        <div v-if="ridx < (signStat?.total_sign_day ?? 0)" class="reward-check">
          <v-icon color="success" size="14">mdi-check</v-icon>
        </div>
        <div class="reward-day">{{ ridx + 1 }}</div>
      </div>
    </div>
    <div class="sign-actions">
      <v-btn
        :disabled="signStat?.is_sign || signing"
        :loading="signing"
        class="sign-btn"
        size="small"
        prepend-icon="mdi-calendar-check"
        @click="handleSign"
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
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
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

.sign-rewards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 8px;
  background: var(--box-bg-1);
  border-radius: 8px;
}

.sign-reward-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  border-radius: 8px;
  background: var(--box-bg-2);
  border: 2px solid var(--common-shadow-2);
  transition: all 0.2s;
  min-width: 0;

  &.current {
    border-color: var(--tgc-od-blue);
    background: var(--box-bg-3);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }

  &.signed {
    opacity: 0.6;
    background: var(--box-bg-3);
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.dark .sign-reward-item {
  &:hover {
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }
}

.reward-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.reward-count {
  margin-top: 2px;
  font-size: 9px;
  color: var(--box-text-1);
  font-weight: 500;
}

.reward-check {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: var(--box-bg-4);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.reward-day {
  margin-top: 1px;
  font-size: 9px;
  color: var(--box-text-2);
  font-weight: 500;
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
}

.dark .sign-btn.resign-btn {
  background: var(--box-bg-3);
  color: var(--box-text-2);
}
</style>
