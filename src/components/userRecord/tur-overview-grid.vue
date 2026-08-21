<template>
  <div v-if="!modelValue">暂无数据</div>
  <div v-else>
    <div class="tur-og-box grid5">
      <TurOverviewSub
        :text="modelValue.active_day_number"
        icon="/UI/nav/userRecord.webp"
        title="活跃天数"
      />
      <TurOverviewSub
        :text="modelValue.avatar_number"
        icon="/UI/nav/userAvatar.webp"
        title="获得角色数"
      />
      <TurOverviewSub
        :text="modelValue.full_fetter_avatar_num"
        icon="/icon/material/105.webp"
        title="满好感角色数"
      />
      <TurOverviewSub
        :text="modelValue.achievement_number"
        icon="/icon/achievement/UI_AchievementIcon_A003.webp"
        title="成就达成数"
      />
      <TurOverviewSub
        :text="modelValue.way_point_number"
        icon="/icon/material/220005.webp"
        title="解锁传送点"
      />
    </div>
    <div class="tur-og-box grid4">
      <TurOverviewSub
        :text="modelValue.domain_number"
        icon="/UI/nav/userAbyssLab.webp"
        title="解锁秘境"
      />
      <TurOverviewSub
        :text="modelValue.spiral_abyss"
        icon="/UI/nav/userAbyss.webp"
        title="深境螺旋"
      />
      <TurOverviewSub
        :text="getCombatRoleText(modelValue)"
        icon="/UI/nav/userCombat.webp"
        title="幻想真境剧诗"
      />
      <TurOverviewSub
        :text="getHardChallengeText(modelValue)"
        icon="/UI/nav/userChallenge.webp"
        title="幽境危战"
      />
      <TurOverviewSub
        :text="modelValue.iceculus_number"
        icon="/icon/material/107035.webp"
        title="冰神瞳"
      />
      <TurOverviewSub
        :text="modelValue.anemoculus_number"
        icon="/icon/material/107001.webp"
        title="风神瞳"
      />
      <TurOverviewSub
        :text="modelValue.geoculus_number"
        icon="/icon/material/107003.webp"
        title="岩神瞳"
      />
      <TurOverviewSub
        :text="modelValue.electroculus_number"
        icon="/icon/material/107014.webp"
        title="雷神瞳"
      />
      <TurOverviewSub
        :text="modelValue.dendroculus_number"
        icon="/icon/material/107017.webp"
        title="草神瞳"
      />
      <TurOverviewSub
        :text="modelValue.hydroculus_number"
        icon="/icon/material/107023.webp"
        title="水神瞳"
      />
      <TurOverviewSub
        :text="modelValue.pyroculus_number"
        icon="/icon/material/107028.webp"
        title="火神瞳"
      />
      <TurOverviewSub
        :text="modelValue.moonoculus_number"
        icon="/icon/material/107030.webp"
        title="月神瞳"
      />
    </div>
    <div class="tur-og-box grid5">
      <TurOverviewSub :text="modelValue.luxurious_chest_number" title="华丽宝箱数" />
      <TurOverviewSub :text="modelValue.precious_chest_number" title="珍贵宝箱数" />
      <TurOverviewSub :text="modelValue.exquisite_chest_number" title="精致宝箱数" />
      <TurOverviewSub :text="modelValue.common_chest_number" title="普通宝箱数" />
      <TurOverviewSub :text="modelValue.magic_chest_number" title="奇馈宝箱数" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import gameEnum from "@enum/game.js";

import TurOverviewSub from "./tur-overview-sub.vue";

const { modelValue } = defineProps<{ modelValue: TGApp.Game.Record.Stats }>();

function getCombatRoleText(stats: TGApp.Game.Record.Stats): string {
  return stats.role_combat.is_unlock ? `第 ${stats.role_combat.max_round_id} 幕` : "未解锁";
}

function getHardChallengeText(stats: TGApp.Game.Record.Stats): string {
  const challenge = stats.hard_challenge;
  if (!challenge.is_unlock) return "未解锁";
  if (challenge.difficulty === gameEnum.challenge.diff.NONE) return challenge.name;
  return `${challenge.name}-${gameEnum.challenge.diffDesc(challenge.difficulty)}`;
}
</script>
<style lang="css" scoped>
.tur-og-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 0.33fr);

  &.grid4 {
    grid-template-columns: repeat(4, 0.25fr);
  }

  &.grid5 {
    grid-template-columns: repeat(5, 0.2fr);
  }

  & + & {
    margin-top: 8px;
  }
}
</style>
