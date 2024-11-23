<template>
  <div class="tur-ws-box">
    <div class="tur-ws-icon">
      <img :src="icon" alt="icon" />
    </div>
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
import { Event, UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useAppStore } from "../../store/modules/app.js";

interface TurWorldSubProps {
  data: TGApp.Sqlite.Record.WorldExplore;
}

const props = defineProps<TurWorldSubProps>();
let themeListener: UnlistenFn | null = null;
const icon = ref<string>();
const offer = ref<string>();
const appStore = useAppStore();

const bg = computed<string>(() => {
  return `url('${props.data.bg}')`;
});
const imgFilter = computed<string>(() => {
  if (props.data.name !== "纳塔") return "none";
  if (appStore.theme === "dark") return "none";
  return "invert(0.75)";
});

onMounted(async () => {
  themeListener = await event.listen("readTheme", (e: Event<string>) => {
    const theme = e.payload;
    if (theme === "dark") icon.value = props.data.iconLight;
    else icon.value = props.data.iconDark;
  });
  if (props.data.offering) offer.value = props.data.offering.icon;
  if (appStore.theme === "dark") icon.value = props.data.iconLight;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--common-shadow-t-4) v-bind(bg) no-repeat;
  background-position-x: right;
  background-size: cover;
}

.tur-ws-icon {
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
