<template>
  <div class="tur-ws-box">
    <div class="tur-ws-bg"><img :src="data.bg" alt="bg" /></div>
    <div class="tur-ws-icon"><img :src="icon" alt="icon" /></div>
    <div class="tur-ws-content">
      <div class="tur-ws-title">
        <span>{{ data.name }}</span>
        <span v-if="data.offering" class="tur-ws-sub">
          <img :src="offer" alt="offer" />
          <span>{{ data.offering.name }}等级：</span>
          <span>{{ data.offering.level }}</span>
          <span>级</span>
        </span>
      </div>
      <div v-if="data.children.length === 0" class="tur-ws-sub">
        <span>探索度：</span>
        <span>{{ data.exploration / 10 }}</span>
        <span>%</span>
      </div>
      <div v-else>
        <div v-if="data.exploration !== 0" class="tur-ws-sub">
          <span>{{ data.name }}探索度：</span>
          <span>{{ data.exploration / 10 }}</span>
          <span>%</span>
        </div>
        <div v-for="item in data.children" :key="item.id" class="tur-ws-sub">
          <span>{{ item.name }}探索度：</span>
          <span>{{ item.exploration / 10 }}</span>
          <span>%</span>
        </div>
      </div>
      <div v-if="data.reputation" class="tur-ws-sub">
        <span>声望等级：</span>
        <span>{{ data.reputation }}</span>
        <span>级</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useAppStore } from "@/store/modules/app.js";

type TurWorldSubProps = { data: TGApp.Sqlite.Record.WorldExplore };

let themeListener: UnlistenFn | null = null;
const { theme } = storeToRefs(useAppStore());
const props = defineProps<TurWorldSubProps>();
const icon = ref<string>();
const offer = ref<string>();

const imgFilter = computed<string>(() => {
  if (props.data.name !== "纳塔") return "none";
  if (theme.value === "dark") return "none";
  return "invert(0.75)";
});

onMounted(async () => {
  themeListener = await event.listen<string>("readTheme", (e: Event<string>) => {
    if (e.payload === "dark") icon.value = props.data.iconLight;
    else icon.value = props.data.iconDark;
  });
  if (props.data.offering) offer.value = props.data.offering.icon;
  if (theme.value === "dark") icon.value = props.data.iconLight;
  else icon.value = props.data.iconDark;
});

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
});
</script>
<style lang="css" scoped>
.tur-ws-box {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
}

.tur-ws-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  object-fit: cover;
}

.tur-ws-icon {
  z-index: 1;
  width: 60px;
  height: 60px;
  padding: 5px;
}

.tur-ws-icon img {
  width: 100%;
  height: 100%;
  filter: v-bind(imgFilter);
}

.tur-ws-content {
  z-index: 1;
  width: calc(100% - 60px);
  height: 100%;
  color: var(--box-text-4);
}

.tur-ws-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px inset var(--common-shadow-8);
  font-family: var(--font-title);
  font-size: 20px;
}

.tur-ws-sub {
  display: flex;
  align-items: center;
  justify-content: start;
  font-family: var(--font-text);
  font-size: 14px;
}

.tur-ws-sub img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.tur-ws-sub :nth-last-child(2) {
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
}
</style>
