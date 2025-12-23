<!-- 单地区探索数据 -->
<template>
  <div class="tur-ws-box">
    <div class="tur-ws-bg">
      <TMiImg :ori="true" :src="world.bg" alt="bg" />
    </div>
    <div class="tur-ws-icon">
      <TMiImg :src="world.iconLight" :ori="true" alt="icon" />
    </div>
    <div class="tur-ws-content">
      <div class="tur-ws-title">
        <span>{{ world.name }}</span>
        <span v-if="world.offerings?.length === 1" class="tur-ws-sub">
          <img :src="world.offerings[0].icon" alt="offer" />
          <span>{{ world.offerings[0].name }}-</span>
          <span>{{ world.offerings[0].level }}</span>
          <span>级</span>
        </span>
      </div>
      <div class="tur-ws-offerings" v-if="world.offerings && world.offerings.length > 1">
        <span
          v-for="(offer, idx) in world.offerings"
          :key="idx"
          class="tur-ws-sub"
          :title="offer.name + '-' + offer.level + '级'"
        >
          <img :src="offer.icon" alt="offer" />
          <span>{{ offer.level }}</span>
          <span>级</span>
        </span>
      </div>
      <div v-if="world.children.length === 0" class="tur-ws-sub">
        <span>探索度：</span>
        <span>{{ world.exploration / 10 }}</span>
        <span>%</span>
      </div>
      <div v-else>
        <div v-if="world.exploration !== 0" class="tur-ws-sub">
          <span>{{ world.name }}探索度：</span>
          <span>{{ world.exploration / 10 }}</span>
          <span>%</span>
        </div>
        <div v-for="item in world.children" :key="item.id" class="tur-ws-sub">
          <span>{{ item.name }}探索度：</span>
          <span>{{ item.exploration / 10 }}</span>
          <span>%</span>
        </div>
      </div>
      <div
        v-if="
          world.area_exploration_list &&
          world.area_exploration_list.length > 0 &&
          world.exploration < 1000
        "
        class="tur-ws-areas"
      >
        <span
          v-for="area in world.area_exploration_list.filter((i) => i.exploration_percentage < 1000)"
          :key="area.name"
          class="tur-ws-sub"
        >
          <span>{{ area.name }}：</span>
          <span>{{ Math.min(area.exploration_percentage / 10, 100) }}</span>
          <span>%</span>
        </span>
      </div>
      <div v-if="world.reputation" class="tur-ws-sub">
        <span>声望等级：</span>
        <span>{{ world.reputation }}</span>
        <span>级</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

type TurWorldSubProps = { world: TGApp.Sqlite.Record.WorldExplore };

const { theme } = storeToRefs(useAppStore());

defineProps<TurWorldSubProps>();

const imgFilter = computed<string>(() => {
  if (theme.value === "dark") return "none";
  return "invert(0.75)";
});
</script>
<style lang="scss" scoped>
.tur-ws-box {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  column-gap: 4px;
}

.tur-ws-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  object-fit: cover;
}

.tur-ws-icon {
  position: relative;
  z-index: 1;
  width: 64px;
  height: 64px;
}

.tur-ws-icon img {
  width: 100%;
  height: 100%;
  filter: v-bind(imgFilter); /* stylelint-disable-line value-keyword-case */
}

.tur-ws-content {
  position: relative;
  z-index: 1;
  width: calc(100% - 68px);
  height: 100%;
  color: var(--box-text-4);
}

.tur-ws-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px inset var(--common-shadow-8);
  font-family: var(--font-title);
  font-size: 18px;
}

.tur-ws-offerings {
  display: flex;
  align-items: center;
  justify-content: start;
  column-gap: 8px;
}

.tur-ws-areas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
  gap: 4px 8px;
}

.tur-ws-sub {
  display: flex;
  align-items: center;
  justify-content: start;
  font-family: var(--font-text);
  font-size: 14px;
}

.tur-ws-sub img {
  width: 24px;
  height: 24px;
}

.tur-ws-sub :nth-last-child(2) {
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  text-shadow: 0 0 2px #0d1117;
}
</style>
