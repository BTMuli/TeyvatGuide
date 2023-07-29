<template>
  <div v-if="props.modelValue === undefined">暂无数据</div>
  <div v-else class="tur-og-box">
    <TurOverviewSub title="活跃天数" :text="data.activeDays" />
    <TurOverviewSub title="成就达成数" :text="data.achievementNumber" />
    <TurOverviewSub title="获得角色数" :text="data.avatarNumber" />
    <TurOverviewSub title="解锁传送点" :text="data.wayPoints" />
    <TurOverviewSub title="解锁秘境" :text="data.domainNumber" />
    <TurOverviewSub title="风神瞳" :text="data.anemoCulus" />
    <TurOverviewSub title="岩神瞳" :text="data.geoCulus" />
    <TurOverviewSub title="深境螺旋" :text="data.sprialAbyss" />
    <TurOverviewSub title="雷神瞳" :text="data.electroCulus" />
    <TurOverviewSub title="草神瞳" :text="data.dendroCulus" />
    <TurOverviewSub title="华丽宝箱数" :text="data.luxuriousChest" />
    <TurOverviewSub title="珍贵宝箱数" :text="data.preciousChest" />
    <TurOverviewSub title="精致宝箱数" :text="data.exquisiteChest" />
    <TurOverviewSub title="普通宝箱数" :text="data.commonChest" />
    <TurOverviewSub title="奇馈宝箱数" :text="data.magicChest" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TurOverviewSub from "./tur-overview-sub.vue";

interface TurOverviewGridProps {
  modelValue?: string;
}

const props = defineProps<TurOverviewGridProps>();
const data = computed<TGApp.Sqlite.Record.Stats>(() => JSON.parse(<string>props.modelValue));
</script>
<style lang="css" scoped>
.tur-og-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(5, 1fr);
}
</style>
