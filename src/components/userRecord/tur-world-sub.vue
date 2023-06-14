<template>
  <div
    class="tur-ws-box"
    :style="{
      backgroundImage: 'url(' + data.bg + ')',
      backgroundPositionX: 'right',
      backgroundSize: 'auto 100%',
      backgroundRepeat: 'no-repeat'
    }"
  >
    <div class="tur-ws-icon">
      <img :src="iconShow" alt="icon">
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
        <img :src="data.offerings[0].icon" alt="offer">
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

interface TurWorldSubProps {
  theme: "default" | "dark",
  data: TGApp.Sqlite.Record.WorldExplore
}

const props = defineProps<TurWorldSubProps>();
const iconShow = ref("");

onMounted(async () => {
  props.theme === "dark" ? iconShow.value = props.data.iconLight : iconShow.value = props.data.iconDark;
  await listenOnTheme();
});

async function listenOnTheme() {
  await event.listen("readTheme", (e) => {
    const theme = e.payload as string;
    if (theme === "dark") {
      iconShow.value = props.data.iconLight;
    } else {
      iconShow.value = props.data.iconDark;
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
  color: var(--common-color-white);
  text-shadow: 0 0 5px rgb(0 0 0 / 20%);
  width: calc(100% - 60px);
  height: 100%;
}

.tur-ws-title {
  font-family: var(--font-title);
  font-size: 20px;
  border-bottom: 1px inset var(--common-color-white);
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
  text-shadow: #fec90b 0 0 5px;
}
</style>
