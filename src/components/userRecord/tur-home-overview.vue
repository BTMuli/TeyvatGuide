<!-- 尘歌壶数据汇总 -->
<template>
  <div class="tur-ho-container">
    <div class="tur-hoc-overview">
      <template v-if="overview">
        <div class="tur-hoco-item">
          <img :src="overview.comfort_level_icon" alt="icon" class="tur-hoco-value-icon" />
          <span class="tur-hoco-value">{{ overview.comfort_level_name }}</span>
        </div>
        <div class="tur-hoco-item">
          <span class="tur-hoco-value">{{ props.homes.length }}</span>
          <span class="tur-hoco-description">解锁洞天</span>
        </div>
        <div class="tur-hoco-item">
          <span class="tur-hoco-value">{{ overview.level }}</span>
          <span class="tur-hoco-description">信任等阶</span>
        </div>
        <div class="tur-hoco-item">
          <span class="tur-hoco-value">{{ overview.comfort_num }}</span>
          <span class="tur-hoco-description">最高洞天仙力</span>
        </div>
        <div class="tur-hoco-item">
          <span class="tur-hoco-value">{{ overview.item_num }}</span>
          <span class="tur-hoco-description">获得摆设数</span>
        </div>
        <div class="tur-hoco-item">
          <span class="tur-hoco-value">{{ overview.visit_num }}</span>
          <span class="tur-hoco-description">历史访客数</span>
        </div>
      </template>
      <div v-else class="tur-hoco-item">
        <span class="tur-hoco-value">0</span>
        <span class="tur-hoco-description">暂未解锁洞天</span>
      </div>
    </div>
    <div v-if="props.homes.length > 0" class="tur-hoc-list">
      <TurHomeItem
        v-for="(item, idx) in props.homes"
        :key="idx"
        :icon="item.icon"
        :name="item.name"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TurHomeItem from "./tur-home-item.vue";

type TurHomeOverviewProps = { homes: Array<TGApp.Game.Record.Home> };

const props = defineProps<TurHomeOverviewProps>();
const overview = computed<TGApp.Game.Record.Home | undefined>(() => props.homes[0]);
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
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
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

  .tur-hoco-value {
    color: var(--tgc-od-orange);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
  }

  .tur-hoco-description {
    color: var(--box-text-4);
    font-family: var(--font-text);
    font-size: 16px;
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
