<template>
  <div v-if="!props.modelValue">暂无数据</div>
  <div v-else>
    <div class="tur-og-box-3">
      <TurOverviewSub
        title="活跃天数"
        :text="props.modelValue.activeDays"
        icon="/source/UI/userRecord.webp"
      />
      <TurOverviewSub
        title="深境螺旋"
        :text="props.modelValue.sprialAbyss"
        icon="/source/UI/userAbyss.webp"
      />
      <TurOverviewSub
        title="幻想真境剧诗"
        :text="props.modelValue.combatRole"
        icon="/icon/material/201.webp"
      />
    </div>
    <div class="tur-og-box">
      <TurOverviewSub
        title="获得角色数"
        :text="props.modelValue.avatarNumber"
        icon="/source/UI/userAvatar.webp"
      />
      <TurOverviewSub
        title="满好感角色数"
        :text="props.modelValue.avatarFetter"
        icon="/icon/material/105.webp"
      />
      <TurOverviewSub title="成就达成数" :text="props.modelValue.achievementNumber" icon="icon">
        <template #icon>
          <img
            src="../../assets/icons/achievements.svg"
            alt="achievement-icon"
            width="25px"
            height="25px"
          />
        </template>
      </TurOverviewSub>
      <TurOverviewSub
        title="解锁传送点"
        :text="props.modelValue.wayPoints"
        icon="/icon/material/220005.webp"
      />
      <TurOverviewSub title="解锁秘境" :text="props.modelValue.domainNumber" />
      <TurOverviewSub
        title="火神瞳"
        :text="props.modelValue.pyroCulus"
        icon="/icon/material/107028.webp"
      />
      <TurOverviewSub
        title="风神瞳"
        :text="props.modelValue.anemoCulus"
        icon="/icon/material/107001.webp"
      />
      <TurOverviewSub
        title="岩神瞳"
        :text="props.modelValue.geoCulus"
        icon="/icon/material/107003.webp"
      />
      <TurOverviewSub
        title="雷神瞳"
        :text="props.modelValue.electroCulus"
        icon="/icon/material/107014.webp"
      />
      <TurOverviewSub
        title="草神瞳"
        :text="props.modelValue.dendroCulus"
        icon="/icon/material/107017.webp"
      />
      <TurOverviewSub
        title="水神瞳"
        :text="props.modelValue.hydroCulus"
        icon="/icon/material/107023.webp"
      />
      <TurOverviewSub title="华丽宝箱数" :text="props.modelValue.luxuriousChest" />
      <TurOverviewSub title="珍贵宝箱数" :text="props.modelValue.preciousChest" />
      <TurOverviewSub title="精致宝箱数" :text="props.modelValue.exquisiteChest" />
      <TurOverviewSub title="普通宝箱数" :text="props.modelValue.commonChest" />
      <TurOverviewSub title="奇馈宝箱数" :text="props.modelValue.magicChest" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TurOverviewSub from "./tur-overview-sub.vue";

interface TurOverviewGridProps {
  modelValue: TGApp.Sqlite.Record.Stats;
}

const props = defineProps<TurOverviewGridProps>();
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
