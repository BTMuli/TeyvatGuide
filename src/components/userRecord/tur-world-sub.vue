<template>
  <div
    class="tur-ws-box"
    :style="{
      backgroundImage: `url('${getUrl.bg}')`,
      backgroundPositionX: 'right',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat'
    }"
  >
    <div class="tur-ws-icon">
      <img :src="getUrl.icon" alt="icon">
    </div>
    <div class="tur-ws-content">
      <div class="tur-ws-title">
        {{ data.name }}
      </div>
      <div class="tur-ws-sub">
        <span>探索度：</span>
        <span>{{ data.exploration / 10 }}</span>
        <span>%</span>
      </div>
      <div v-if="data.type==='Reputation'" class="tur-ws-sub">
        <span>声望等级：</span>
        <span>{{ data.level }}</span>
        <span>级</span>
      </div>
      <div v-if="data.offerings.length>0" class="tur-ws-sub">
        <img :src="getUrl.offer" alt="offer">
        <span>{{ data.offerings[0].name }}等级：</span>
        <span>{{ data.offerings[0].level }}</span>
        <span>级</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>

// vue
import { onMounted, ref } from "vue";
// tauri
import { event } from "@tauri-apps/api";
// utils
import { saveImgLocal } from "../../utils/TGShare";

interface TurWorldSubProps {
  theme: "default" | "dark",
  data: TGApp.Sqlite.Record.WorldExplore
}

const props = defineProps<TurWorldSubProps>();
const getUrl = ref({
  bg: "",
  icon: "",
  iconLight: "",
  iconDark: "",
  offer: "",
});

onMounted(async () => {
  await listenOnTheme();
  getUrl.value.bg = await saveImgLocal(props.data.bg);
  getUrl.value.iconLight = await saveImgLocal(props.data.iconLight);
  getUrl.value.iconDark = await saveImgLocal(props.data.iconDark);
  if (props.data.offerings.length > 0) {
    getUrl.value.offer = await saveImgLocal(props.data.offerings[0].icon);
  }
  props.theme === "dark"
    ? getUrl.value.icon = getUrl.value.iconLight
    : getUrl.value.icon = getUrl.value.iconDark;
});

async function listenOnTheme () {
  await event.listen("readTheme", (e) => {
    const theme = e.payload as string;
    if (theme === "dark") {
      getUrl.value.icon = getUrl.value.iconLight;
    } else {
      getUrl.value.icon = getUrl.value.iconDark;
    }
  });
}
</script>
<style lang="css" scoped>
.tur-ws-box {
  padding: 10px;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--common-bg);
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
  color: var(--common-text-2);
  width: calc(100% - 60px);
  height: 100%;
}

.tur-ws-title {
  font-family: var(--font-title);
  font-size: 20px;
  border-bottom: 1px inset var(--common-text-2);
}

.tur-ws-sub {
  display: flex;
  align-items: center;
  font-family: var(--font-text);
  font-size: 14px;
  justify-content: start;
}

.tur-ws-sub img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.tur-ws-sub :nth-last-child(2) {
  color: var(--common-color-white);
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .tur-ws-sub :nth-last-child(2) {
  color: var(--common-color-yellow);
  text-shadow: none;
}
</style>
