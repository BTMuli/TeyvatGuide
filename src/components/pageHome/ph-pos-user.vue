<template>
  <div class="ph-pos-user-card">
    <div class="ph-puc-top">
      <div class="title">
        <v-icon title="已完成" color="var(--tgc-od-green)" v-if="props.pos.is_finished">
          mdi-checkbox-marked-circle-outline
        </v-icon>
        <v-icon v-else title="未完成" color="var(--tgc-od-white)">mdi-circle</v-icon>
        <span>{{ props.pos.name }}</span>
      </div>
      <div class="subtitle">
        <!-- 处理幽境危战 -->
        <template v-if="props.pos.type === ActCalendarTypeEnum.HardChallenge">
          <div class="challenge-append" @click="toChallenge()" title="点击前往幽境页面">
            <template v-if="!props.pos.hard_challenge_detail.is_unlock">
              <span>未解锁</span>
            </template>
            <template v-else>
              <span>最佳记录</span>
              <span>{{ props.pos.hard_challenge_detail.second }}s</span>
              <img
                :title="getHardChallengeDesc(props.pos.hard_challenge_detail.difficulty)"
                :src="`/icon/challenge/UI_LeyLineChallenge_Medal_${props.pos.hard_challenge_detail.difficulty}.webp`"
                alt="medal"
              />
            </template>
          </div>
        </template>
        <!-- 处理真境剧诗 -->
        <template v-else-if="props.pos.type === ActCalendarTypeEnum.RoleCombat">
          <div class="combat-append" @click="toCombat()" title="点击前往剧诗页面">
            <template v-if="!props.pos.role_combat_detail.is_unlock">
              <span>未解锁</span>
            </template>
            <template v-else-if="!props.pos.role_combat_detail.has_data">
              <span>尚未挑战</span>
            </template>
            <span v-else>第{{ props.pos.role_combat_detail.max_round_id }}幕</span>
          </div>
        </template>
        <!-- 处理深境螺旋 -->
        <template v-else-if="props.pos.type === ActCalendarTypeEnum.Tower">
          <div class="abyss-append" @click="toAbyss()" title="点击前往深渊页面">
            <template v-if="!props.pos.tower_detail.is_unlock">
              <span>未解锁</span>
            </template>
            <template v-else-if="!props.pos.tower_detail.has_data">
              <span>尚未挑战</span>
            </template>
            <template v-else>
              <span>
                {{ props.pos.tower_detail.max_star }}/{{ props.pos.tower_detail.total_star }}
              </span>
              <img src="/icon/star/Abyss.webp" alt="abyss" />
            </template>
          </div>
        </template>
        <!-- 处理区域探索 -->
        <template v-else-if="props.pos.type === ActCalendarTypeEnum.Explore">
          <span>当前区域探索度: {{ props.pos.explore_detail.explore_percent }}%</span>
        </template>
        <!-- 处理双倍经验 -->
        <template v-else-if="props.pos.type === ActCalendarTypeEnum.Double">
          <span>
            剩余双倍次数: {{ props.pos.double_detail.left }}/{{ props.pos.double_detail.total }}
          </span>
        </template>
      </div>
    </div>
    <div class="ph-puc-duration">
      <template v-if="isStart">
        <span title="剩余时间">{{ stamp2LastTime(restTs * 1000) }}</span>
        <span title="活动时间">
          {{ timestampToDate(Number(props.pos.start_timestamp) * 1000) }} ~
          {{ timestampToDate(Number(props.pos.end_timestamp) * 1000) }}
        </span>
      </template>
      <template v-else>
        <span>未开始</span>
      </template>
    </div>
    <div class="ph-puc-rewards">
      <div
        :title="`${reward.name}${reward.num > 0 ? `x${reward.num}` : ''}`"
        v-for="reward in props.pos.reward_list"
        :key="reward.item_id"
        class="ph-puc-reward"
        @click="showMaterial(reward)"
      >
        <img :src="`/icon/bg/${reward.rarity}-Star.webp`" class="bg" alt="bg" />
        <TMiImg :ori="true" :alt="reward.name" :src="reward.icon" class="icon" />
        <span v-if="reward.num > 0" class="count">{{ reward.num }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { ActCalendarTypeEnum } from "@enum/game.js";
import { getHardChallengeDesc } from "@Sql/utils/transUserRecord.js";
import { stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

type PhCompPositionUserProps = { pos: TGApp.Game.ActCalendar.ActItem };
type PhCompPositionUserEmits = (e: "clickM", cur: TGApp.Game.ActCalendar.ActReward) => void;

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const router = useRouter();

const props = defineProps<PhCompPositionUserProps>();
const emits = defineEmits<PhCompPositionUserEmits>();

const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const isStart = computed<boolean>(() => {
  return props.pos.start_timestamp !== "0";
});

onMounted(() => {
  endTs.value = Number(props.pos.end_timestamp);
  restTs.value = props.pos.countdown_seconds || 0;
  if (restTs.value > 0) {
    durationTs.value = endTs.value - Number(props.pos.start_timestamp);
  }
  if (timer !== null) clearInterval(timer);
  timer = setInterval(handlePosition, 1000);
});

function handlePosition(): void {
  if (restTs.value < 1) {
    if (timer !== null) clearInterval(timer);
    timer = null;
    restTs.value = 0;
    return;
  }
  restTs.value = endTs.value - Math.floor(Date.now() / 1000);
}

async function toChallenge(): Promise<void> {
  await router.push({ name: "幽境危战" });
}

async function toCombat(): Promise<void> {
  await router.push({ name: "真境剧诗" });
}

async function toAbyss(): Promise<void> {
  await router.push({ name: "深境螺旋" });
}

function showMaterial(reward: TGApp.Game.ActCalendar.ActReward): void {
  emits("clickM", reward);
}

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
});
</script>
<style lang="scss" scoped>
.ph-pos-user-card {
  position: relative;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  row-gap: 4px;
}

.ph-puc-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  column-gap: 8px;

  .title {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: 4px;
    font-family: var(--font-title);
  }

  .subtitle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: 4px;
    font-size: 12px;

    .challenge-append,
    .combat-append,
    .abyss-append {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      column-gap: 4px;
      cursor: pointer;
      user-select: none;

      img {
        width: 24px;
        height: 24px;
        cursor: pointer;
      }
    }
  }
}

.ph-puc-duration {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 12px;
  user-select: none;

  span:last-child {
    font-size: 10px;
    opacity: 0.6;
  }
}

.ph-puc-rewards {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.ph-puc-reward {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 48px;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-2);
  cursor: pointer;

  .bg {
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .icon {
    z-index: 1;
    width: 40px;
    height: 40px;
    transition: all 0.3s;
  }

  .count {
    position: absolute;
    z-index: 2;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
    background: #00000080;
    color: var(--tgc-white-1);
    font-family: var(--font-title);
    font-size: 10px;
    text-align: center;
  }

  &:hover .icon {
    transform: scale(1.1);
  }
}
</style>
