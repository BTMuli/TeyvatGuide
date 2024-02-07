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
      <div class="tur-ws-sub" v-if="data.children.length === 0">
        <span>探索度：</span>
        <span>{{ data.exploration / 10 }}</span>
        <span>%</span>
      </div>
      <div v-else>
        <div class="tur-ws-sub" v-if="data.exploration !== 0">
          <span>{{ data.name }}探索度：</span>
          <span>{{ data.exploration / 10 }}</span>
          <span>%</span>
        </div>
        <div class="tur-ws-sub" v-for="item in data.children" :key="item.id">
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
import { UnlistenFn } from "@tauri-apps/api/helpers/event";
import { onMounted, onUnmounted, ref } from "vue";

import { saveImgLocal } from "../../utils/TGShare";

interface TurWorldSubProps {
  theme: "default" | "dark";
  data: TGApp.Sqlite.Record.WorldExplore;
}

const props = defineProps<TurWorldSubProps>();
let themeListener: UnlistenFn;
const bg = ref<string>();
const icon = ref<string>();
const iconLight = ref<string>();
const iconDark = ref<string>();
const offer = ref<string>();

onMounted(async () => {
  themeListener = await event.listen("readTheme", (e) => {
    const theme = <string>e.payload;
    if (theme === "dark") {
      icon.value = iconLight.value;
    } else {
      icon.value = iconDark.value;
    }
  });
  bg.value = `url('${await saveImgLocal(props.data.bg)}')`;
  iconLight.value = await saveImgLocal(props.data.iconLight);
  iconDark.value = await saveImgLocal(props.data.iconDark);
  if (props.data.offering) {
    offer.value = await saveImgLocal(props.data.offering.icon);
  }
  props.theme === "dark" ? (icon.value = iconLight.value) : (icon.value = iconDark.value);
});

onUnmounted(() => {
  if (themeListener) {
    themeListener();
  }
  const urlList = [iconLight.value, iconDark.value, offer.value];
  urlList.forEach((url) => {
    URL.revokeObjectURL(typeof url === "string" ? url : "");
  });
  const reg = /url\(['"]?([^'"]*)['"]?\)/;
  if (bg.value) {
    const bgOri = bg.value?.replace("url('", "").replace("')", "");
    const bgUrl = bgOri.match(reg);
    if (bgUrl) {
      URL.revokeObjectURL(bgUrl[1]);
    }
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
