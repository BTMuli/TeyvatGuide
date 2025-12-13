<!-- 单个签到奖励格子 TODO:额外奖励格子需要测试 -->
<template>
  <div
    :class="['reward-cell', stateClass, { extra: isExtra, clickable: isClickableComputed }]"
    :title="getTitle()"
    class="sign-reward-cell"
    @click="handleClick"
  >
    <img :alt="reward.name" :src="reward.icon" class="reward-icon" />
    <span class="reward-count">{{ reward.cnt }}</span>
    <div v-if="state === RewardState.SIGNED" class="reward-check">
      <img alt="finish" src="/source/UI/finish.webp" />
    </div>
    <div v-if="!isExtra" class="reward-day">{{ dayNumber }}</div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

// Reward state enum TODO:完善类型
const RewardState = <const>{
  NORMAL: 0,
  SIGNED: 1,
  NEXT_REWARD: 2,
  MISSED: 3,
};
export type RewardStateEnum = (typeof RewardState)[keyof typeof RewardState];

type Props = {
  reward: TGApp.BBS.Sign.HomeAward;
  dayNumber: number;
  state: RewardStateEnum;
  isExtra?: boolean;
  isClickable?: boolean; // Explicitly control if this cell is clickable
};

type Emits = {
  (e: "click"): void;
};

const props = withDefaults(defineProps<Props>(), {
  isExtra: false,
  isClickable: undefined, // Default to undefined, will be computed if not provided
});
const emits = defineEmits<Emits>();

const STATE_CLASS_MAP: Record<RewardStateEnum, string> = {
  [RewardState.NORMAL]: "state-normal",
  [RewardState.SIGNED]: "state-signed",
  [RewardState.NEXT_REWARD]: "state-next-reward",
  [RewardState.MISSED]: "state-missed",
};

const stateClass = computed(() => {
  return STATE_CLASS_MAP[props.state];
});

const isClickableComputed = computed(() => {
  // If isClickable prop is explicitly provided, use it
  if (props.isClickable !== undefined) {
    return props.isClickable;
  }
  // Otherwise, fall back to default logic
  return props.state === RewardState.NEXT_REWARD || props.state === RewardState.MISSED;
});

function getTitle(): string {
  let title = `${props.reward.name}x${props.reward.cnt}`;
  if (props.state === RewardState.NEXT_REWARD) {
    title += " - 点击签到";
  } else if (props.state === RewardState.MISSED) {
    if (isClickableComputed.value) {
      title += " - 点击补签";
    } else {
      title += " - 漏签";
    }
  }
  return title;
}

function handleClick(): void {
  if (isClickableComputed.value) {
    emits("click");
  }
}
</script>
<style lang="scss" scoped>
.sign-reward-cell {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 4px;
  padding-bottom: 4px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-3);

  &.extra {
    padding: 8px;
    border-radius: 50%;
    aspect-ratio: 1;
  }

  &.state-signed {
    background: var(--box-bg-4);
    color: var(--box-text-4);

    .reward-icon {
      opacity: 0.5;
    }
  }

  &.state-next-reward {
    position: relative;
    border-width: 1px;
    border-color: var(--tgc-od-blue);
    animation: pulse 2s ease-in-out infinite;
    background: var(--box-bg-3);
    box-shadow: 0 0 12px rgb(59 130 246 / 60%);
  }

  &.state-missed {
    border-color: var(--tgc-od-red);
    opacity: 0.6;
  }

  &.clickable {
    cursor: pointer;

    &:active {
      transform: scale(0.95);
    }
  }

  &:hover {
    z-index: 5;
    box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
    transform: scale(1.05);
  }
}

.dark .sign-reward-cell {
  &:hover {
    box-shadow: 0 2px 8px rgb(255 255 255 / 10%);
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 12px rgb(59 130 246 / 60%);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 20px rgb(59 130 246 / 90%);
    transform: scale(1.02);
  }
}

.reward-icon {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.extra .reward-icon {
  width: 32px;
  height: 32px;
}

.reward-count {
  position: absolute;
  z-index: 0;
  top: -2px;
  right: 2px;
  font-size: 9px;
  font-style: italic;
  opacity: 0.5;
}

.extra .reward-count {
  font-size: 10px;
  font-weight: 700;
}

.reward-check {
  position: absolute;
  z-index: 2;
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;

  img {
    width: 32px;
    height: 32px;
  }
}

.reward-day {
  position: absolute;
  z-index: 0;
  bottom: -8px;
  left: -4px;
  color: var(--tgc-od-orange);
  font-family: var(--font-title);
  opacity: 0.4;
}
</style>
