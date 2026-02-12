<!-- 绘想游迹浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div v-if="props.data" :class="{ share: isShare }" class="tuc-ovc-box">
      <div class="tuc-ovc-top">
        <div class="tuc-ovc-title" @click="share()">
          <img alt="char" src="/UI/combat/charMaster.webp" />
          <span>绘想游迹</span>
        </div>
        <div class="tuc-ovc-append">
          <span>已完成</span>
          <span>{{ finish }}/{{ total }}</span>
        </div>
      </div>
      <div class="tuc-ovc-list">
        <TucOvcItem v-for="(item, idx) in props.data" :key="idx" :item />
      </div>
      <div class="tuc-ovc-share">
        <span>UID {{ props.uid }}</span>
        <span>|</span>
        <span>TeyvatGuide v{{ version }}</span>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, onMounted, ref } from "vue";

import TucOvcItem from "./tuc-ovc-item.vue";

type TucOvCharProps = { data: Array<TGApp.Game.Combat.CharMaster>; uid: string | undefined };

const visible = defineModel<boolean>();
const props = defineProps<TucOvCharProps>();

const isShare = ref<boolean>(false);
const version = ref<string>("");
const finish = computed<number>(
  () => props.data.filter((i) => i.status === gameEnum.combat.charMasterStat.DONE).length,
);
const total = computed<number>(() => props.data.length);

onMounted(async () => {
  version.value = await getVersion();
});

async function share(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".tuc-ovc-box");
  if (element === null) {
    showSnackbar.warn("未获取到分享内容");
    return;
  }
  const fileName = `绘想游迹_${props.uid}_${new Date().getTime()}.png`;
  await showLoading.start("正在生成分享图", fileName);
  isShare.value = true;
  await generateShareImg(fileName, element, 1.2, true);
  isShare.value = false;
  await showLoading.end();
}
</script>
<style lang="scss" scoped>
.tuc-ovc-box {
  position: relative;
  display: flex;
  width: 800px;
  max-height: 600px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 8px;

  &.share {
    overflow-y: auto;

    .tuc-ovc-list {
      overflow-y: unset;
    }
  }
}

.tuc-ovc-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tuc-ovc-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;

  img {
    height: 32px;
    padding: 2px;
    border-radius: 50%;
    background: var(--tgc-od-orange);
    object-fit: contain;
  }
}

.tuc-ovc-append {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tuc-ovc-list {
  position: relative;
  display: grid;
  width: 100%;
  padding-right: 4px;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  overflow-y: auto;
}

.tuc-ovc-share {
  position: absolute;
  z-index: -1;
  right: 4px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 2px;
  font-size: 12px;
}
</style>
