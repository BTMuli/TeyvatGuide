<!-- 单个签到奖励格子 -->
<template>
  <div
    :class="['reward-cell', stateClass, { extra: isExtra }]"
    class="sign-reward-cell"
  >
    <TMiImg :ori="true" :src="reward.icon" :alt="reward.name" class="reward-icon" />
    <span class="reward-count">×{{ reward.cnt }}</span>
    <div v-if="state === 'signed'" class="reward-check">
      <v-icon color="success" size="14">mdi-check</v-icon>
    </div>
    <div v-if="!isExtra" class="reward-day">{{ dayNumber }}</div>
  </div>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

type RewardState = "signed" | "next-reward" | "missed" | "normal";

type Props = {
  reward: TGApp.BBS.Sign.HomeAward;
  dayNumber: number;
  state: RewardState;
  isExtra?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isExtra: false,
});

const stateClass = computed(() => {
  return `state-${props.state}`;
});
</script>

<style lang="scss" scoped>
.sign-reward-cell {
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
  min-height: 80px;

  &.extra {
    border-radius: 50%;
    aspect-ratio: 1;
    padding: 8px;
  }

  &.state-signed {
    opacity: 0.6;
    background: var(--box-bg-3);
  }

  &.state-next-reward {
    border-color: var(--tgc-od-blue);
    border-width: 3px;
    background: var(--box-bg-3);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
    animation: pulse 2s ease-in-out infinite;
    
    /* Higher z-index to ensure it's on top */
    z-index: 10;
    position: relative;
  }

  &.state-missed {
    border-color: var(--tgc-od-orange);
    background: var(--box-bg-3);
    opacity: 0.5;
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 5;
  }
}

.dark .sign-reward-cell {
  &:hover {
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.9);
    transform: scale(1.02);
  }
}

.reward-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.extra .reward-icon {
  width: 32px;
  height: 32px;
}

.reward-count {
  margin-top: 2px;
  font-size: 9px;
  color: var(--box-text-1);
  font-weight: 600;
  white-space: nowrap;
}

.extra .reward-count {
  font-size: 10px;
  font-weight: 700;
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
  z-index: 2;
}

.reward-day {
  margin-top: 1px;
  font-size: 8px;
  color: var(--box-text-3);
  font-weight: 400;
  opacity: 0.5;
}
</style>
