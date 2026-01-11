<!-- 近期活动卡片组件（用户）-->
<template>
  <div ref="posRef" class="ph-pos-user-card">
    <div class="ph-puc-top">
      <div class="title">
        <v-icon v-if="isFin" color="var(--tgc-od-green)" title="已完成">
          mdi-checkbox-marked-circle-outline
        </v-icon>
        <v-icon v-else color="var(--tgc-od-white)" title="未完成">mdi-circle</v-icon>
        <span title="点击分享" @click="sharePos()">{{ props.pos.name }}</span>
      </div>
      <div class="subtitle">
        <!-- 处理幽境危战 -->
        <template v-if="props.pos.type === gameEnum.actCalendarType.HardChallenge">
          <div class="challenge-append" title="点击前往幽境页面" @click="toChallenge()">
            <template v-if="!props.pos.hard_challenge_detail.is_unlock">
              <span>未解锁</span>
            </template>
            <template v-else>
              <span>最佳记录</span>
              <span>{{ props.pos.hard_challenge_detail.second }}s</span>
              <img
                :src="`/icon/challenge/UI_LeyLineChallenge_Medal_${props.pos.hard_challenge_detail.difficulty}.webp`"
                :title="getHardChallengeDesc(props.pos.hard_challenge_detail.difficulty)"
                alt="medal"
              />
              <div
                v-if="props.pos.hard_challenge_detail.sub.seconds > 0"
                :title="`紊乱爆发期结束:${endHd}`"
                class="challenge-sub"
              >
                <span>{{ props.pos.hard_challenge_detail.sub.x }}</span>
                <span>/{{ props.pos.hard_challenge_detail.sub.y }}</span>
                <img alt="sub" src="/icon/challenge/pos_sub.webp" />
              </div>
            </template>
          </div>
        </template>
        <!-- 处理真境剧诗 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.RoleCombat">
          <div class="combat-append" title="点击前往剧诗页面" @click="toCombat()">
            <span>{{ getCombatStat(props.pos.role_combat_detail) }}</span>
          </div>
        </template>
        <!-- 处理深境螺旋 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.Tower">
          <div class="abyss-append" title="点击前往深渊页面" @click="toAbyss()">
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
              <img alt="abyss" src="/icon/star/Abyss.webp" />
            </template>
          </div>
        </template>
        <!-- 处理区域探索 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.Explore">
          <span>当前区域探索度: {{ props.pos.explore_detail.explore_percent }}%</span>
        </template>
        <!-- 处理双倍经验 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.Double">
          <span>
            剩余双倍次数: {{ props.pos.double_detail.left }}/{{ props.pos.double_detail.total }}
          </span>
        </template>
        <!-- 处理立本活动 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.LiBen">
          <span>当天{{ props.pos.liben_detail.status === 1 ? "未" : "已" }}兑换</span>
          <span>{{ props.pos.liben_detail.progress }}/{{ props.pos.liben_detail.total }}</span>
          <span>
            {{ props.pos.liben_detail.is_has_taken_special_reward ? "已" : "未" }}领取礼盒
          </span>
        </template>
        <!-- 处理累登活动 TODO:待完善 -->
        <template v-else-if="props.pos.type === gameEnum.actCalendarType.SignIn">
          <span>{{ props.pos.sign_in_detail.progress }}/{{ props.pos.sign_in_detail.total }}</span>
          <span>当天{{ props.pos.sign_in_detail.status === 1 ? "未领取" : "已领取" }}</span>
        </template>
      </div>
    </div>
    <div class="ph-puc-duration">
      <template v-if="isStart">
        <span data-html2canvas-ignore title="剩余时间">{{ stamp2LastTime(restTs * 1000) }}</span>
        <span title="活动时间">
          {{ timestampToDate(Number(props.pos.start_timestamp) * 1000) }} ~
          {{ timestampToDate(Number(props.pos.end_timestamp) * 1000) }}
        </span>
      </template>
      <template v-else>
        <span>未开始</span>
      </template>
    </div>
    <div class="ph-puc-desc" v-html="parseHtmlText(props.pos.desc)" />
    <div class="ph-puc-rewards">
      <div
        v-for="reward in props.pos.reward_list"
        :key="reward.item_id"
        :title="`${reward.name}${reward.num > 0 ? `x${reward.num}` : ''}`"
        class="ph-puc-reward"
        @click="showMaterial(reward)"
      >
        <img :src="`/icon/bg/${reward.rarity}-Star.webp`" alt="bg" class="bg" />
        <TMiImg :alt="reward.name" :ori="true" :src="reward.icon" class="icon" />
        <span v-if="reward.num > 0" class="count">{{ reward.num }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import gameEnum from "@enum/game.js";
import { getHardChallengeDesc } from "@Sql/utils/transUserRecord.js";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText, stamp2LastTime, timestampToDate } from "@utils/toolFunc.js";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

type PhCompPositionUserProps = { pos: TGApp.Game.ActCalendar.ActItem };
type PhCompPositionUserEmits = (e: "clickM", cur: TGApp.Game.ActCalendar.ActReward) => void;

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;
const router = useRouter();

const props = defineProps<PhCompPositionUserProps>();
const emits = defineEmits<PhCompPositionUserEmits>();
const posEl = useTemplateRef<HTMLDivElement>("posRef");

const endTs = ref<number>(0);
const restTs = ref<number>(0);
const durationTs = ref<number>(0);
const endHd = ref<string>();
const isStart = computed<boolean>(() => {
  return props.pos.start_timestamp !== "0";
});
const isFin = computed<boolean>(() => {
  if (props.pos.type === gameEnum.actCalendarType.LiBen) {
    return props.pos.liben_detail.is_has_taken_special_reward;
  }
  return props.pos.is_finished;
});

onMounted(() => {
  endTs.value = Number(props.pos.end_timestamp);
  restTs.value = props.pos.countdown_seconds || 0;
  if (restTs.value > 0) {
    durationTs.value = endTs.value - Number(props.pos.start_timestamp);
  }
  if (timer !== null) clearInterval(timer);
  timer = setInterval(handlePosition, 1000);
  if (
    props.pos.type === "ActTypeHardChallenge" &&
    props.pos.hard_challenge_detail.sub.seconds >= 0
  ) {
    endHd.value = timestampToDate(Date.now() + props.pos.hard_challenge_detail.sub.seconds * 1000);
  }
});

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
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

function getCombatStat(detail: TGApp.Game.ActCalendar.ActRoleCombat): string {
  if (!detail.is_unlock) return "未解锁";
  if (!detail.has_data) return "尚未挑战";
  if (detail.difficulty_id < 5) return `第${detail.max_round_id}幕`;
  return `月谕模式·第${detail.max_round_id}幕·圣牌${detail.tarot_finished_cnt}`;
}

async function sharePos(): Promise<void> {
  if (!posEl.value) return;
  await generateShareImg(`活动-${props.pos.name}.png`, posEl.value, 2);
}
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

    span {
      cursor: pointer;
    }
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
        padding: 2px;
        border-radius: 50%;
        background: #2c313c;
        cursor: pointer;
      }
    }

    .challenge-sub {
      position: relative;
      display: flex;
      align-items: center;

      img {
        background: unset;
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

.ph-puc-desc {
  font-size: 12px;
  opacity: 0.8;
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
    position: relative;
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
