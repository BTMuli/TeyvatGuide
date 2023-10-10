<template>
  <div
    class="tur-hs-box"
    :style="{
      backgroundImage: 'url(' + getUrl.bg + ')',
      backgroundSize: 'cover',
    }"
  >
    <div class="tur-hs-name">
      {{ data.name }}
    </div>
    <div class="tur-hs-title">
      <img :src="getUrl.icon" alt="comfort" />
      {{ data.comfortName }}
    </div>
    <div class="tur-hs-text-grid">
      <div class="tur-hs-text">
        <div>{{ data.level }}</div>
        <div>信任等阶</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.comfort }}</div>
        <div>最高洞天仙力</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.furniture }}</div>
        <div>获得摆设数</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.visit }}</div>
        <div>历史访客数</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import { saveImgLocal } from "../../utils/TGShare";

interface TurHomeSubProps {
  data: TGApp.Sqlite.Record.Home;
}

const props = defineProps<TurHomeSubProps>();
const getUrl = ref({
  icon: "",
  bg: "",
});

onMounted(async () => {
  getUrl.value.icon = await saveImgLocal(props.data.comfortIcon);
  getUrl.value.bg = await saveImgLocal(props.data.bg);
});
</script>
<style lang="css" scoped>
.tur-hs-box {
  position: relative;
  border-radius: 5px;
}

.tur-hs-name {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--tgc-white-1);
  font-family: var(--font-text);
  font-size: 16px;
}

.tur-hs-title {
  display: flex;
  align-items: center;
  padding: 10px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 20px;
}

.tur-hs-title img {
  width: 30px;
  height: 30px;
  margin-right: 5px;
}

.tur-hs-text-grid {
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 10px;
  backdrop-filter: blur(5px);
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: var(--tgc-white-1);
  text-align: center;
}

.tur-hs-text :nth-child(1) {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
}

.tur-hs-text :nth-child(2) {
  font-family: var(--font-title);
  font-size: 16px;
}
</style>
