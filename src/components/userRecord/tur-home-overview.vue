<!-- 尘歌壶数据汇总 -->
<template>
  <div class="tur-ho-container">
    <div class="tur-hoc-overview">
      <div v-if="overview" class="tur-hoco-item">
        <img :src="overview.comfortIcon" alt="icon" />
        <span>{{ overview.comfortName }}</span>
      </div>
      <div class="tur-hoco-item">
        <span>{{ props.homes.length }}</span>
        <span>解锁洞天</span>
      </div>
      <div class="tur-hoco-item">
        <span>{{ overview.level ?? 0 }}</span>
        <span>信任等阶</span>
      </div>
      <div class="tur-hoco-item">
        <span>{{ overview.comfort ?? 0 }}</span>
        <span>最高洞天仙力</span>
      </div>
      <div class="tur-hoco-item">
        <span>{{ overview.furniture ?? 0 }}</span>
        <span>获得摆设数</span>
      </div>
      <div class="tur-hoco-item">
        <span>{{ overview.visit ?? 0 }}</span>
        <span>历史访客数</span>
      </div>
    </div>
    <div v-if="props.homes.length > 0" class="tur-hoc-list">
      <TurHomeName
        v-for="(item, idx) in props.homes"
        :key="idx"
        :icon="item.bg"
        :name="item.name"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TurHomeName from "./tur-home-item.vue";

type TurHomeOverviewProps = { homes: Array<TGApp.Sqlite.Record.Home> };

const props = defineProps<TurHomeOverviewProps>();
const overview = computed<TGApp.Sqlite.Record.Home>(() => props.homes[0] ?? undefined);
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tur-ho-container {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 8px;
}

.tur-hoc-overview {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  column-gap: 16px;
}

.tur-hoco-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;

  img {
    width: 24px;
    height: 24px;
  }

  span {
    &:first-child {
      color: var(--tgc-yellow-1);
      font-family: var(--font-text);
      text-shadow: 0 0 2px #0d1117;
    }

    &:last-child {
      font-family: var(--font-title);
      font-size: 16px;
    }
  }
}

.tur-hoc-list {
  position: relative;
  display: grid;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(360px, 0.5fr));
}
</style>
