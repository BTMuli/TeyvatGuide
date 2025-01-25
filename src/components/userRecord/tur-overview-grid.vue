<template>
  <div v-if="!modelValue">暂无数据</div>
  <div v-else>
    <div class="tur-og-box-3">
      <TurOverviewSub
        :text="modelValue.activeDays"
        icon="/source/UI/userRecord.webp"
        title="活跃天数"
      />
      <TurOverviewSub
        :text="modelValue.sprialAbyss"
        icon="/source/UI/userAbyss.webp"
        title="深境螺旋"
      />
      <TurOverviewSub
        :text="modelValue.combatRole"
        icon="/source/UI/userCombat.webp"
        title="幻想真境剧诗"
      />
    </div>
    <div class="tur-og-box">
      <TurOverviewSub
        :text="modelValue.avatarNumber"
        icon="/source/UI/userAvatar.webp"
        title="获得角色数"
      />
      <TurOverviewSub
        :text="modelValue.avatarFetter"
        icon="/icon/material/105.webp"
        title="满好感角色数"
      />
      <TurOverviewSub :text="modelValue.achievementNumber" icon="icon" title="成就达成数">
        <template #icon>
          <img
            alt="achievement-icon"
            height="25px"
            src="@/assets/icons/achievements.svg"
            width="25px"
          />
        </template>
      </TurOverviewSub>
      <TurOverviewSub
        :text="modelValue.wayPoints"
        icon="/icon/material/220005.webp"
        title="解锁传送点"
      />
      <TurOverviewSub :text="modelValue.domainNumber" title="解锁秘境" />
      <TurOverviewSub
        :text="modelValue.pyroCulus"
        icon="/icon/material/107028.webp"
        title="火神瞳"
      />
      <TurOverviewSub
        :text="modelValue.anemoCulus"
        icon="/icon/material/107001.webp"
        title="风神瞳"
      />
      <TurOverviewSub
        :text="modelValue.geoCulus"
        icon="/icon/material/107003.webp"
        title="岩神瞳"
      />
      <TurOverviewSub
        :text="modelValue.electroCulus"
        icon="/icon/material/107014.webp"
        title="雷神瞳"
      />
      <TurOverviewSub
        :text="modelValue.dendroCulus"
        icon="/icon/material/107017.webp"
        title="草神瞳"
      />
      <TurOverviewSub
        :text="modelValue.hydroCulus"
        icon="/icon/material/107023.webp"
        title="水神瞳"
      />
      <TurOverviewSub :text="modelValue.luxuriousChest" title="华丽宝箱数" />
      <TurOverviewSub :text="modelValue.preciousChest" title="珍贵宝箱数" />
      <TurOverviewSub :text="modelValue.exquisiteChest" title="精致宝箱数" />
      <TurOverviewSub :text="modelValue.commonChest" title="普通宝箱数" />
      <TurOverviewSub :text="modelValue.magicChest" title="奇馈宝箱数" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TurOverviewSub from "./tur-overview-sub.vue";

defineProps<{ modelValue: TGApp.Sqlite.Record.Stats }>();
</script>
<style lang="css" scoped>
.tur-og-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(4, 0.25fr);
}

.tur-og-box-3 {
  display: grid;
  width: 100%;
  margin-bottom: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
