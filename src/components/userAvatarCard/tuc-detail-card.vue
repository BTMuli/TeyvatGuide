<template>
  <div class="duc-do-container">
    <img :src="nameCard" class="duc-doc-bg" v-if="nameCard !== false" alt="bg" />
    <div class="duc-doc-bgc" />
    <!-- 左上角色跟武器 -->
    <div class="duc-doc-lt">
      <DucDetailOlt :data="props.modelValue.avatar" mode="character" />
      <DucDetailOlt :data="props.modelValue.weapon" mode="weapon" />
      <div class="duc-relic">
        <DucDetailRelic
          v-for="(relic, index) in relicList"
          :key="index"
          :model-value="relic"
          :pos="index + 1"
        />
      </div>
    </div>
    <v-btn
      class="duc-doc-btn"
      @click="share"
      variant="outlined"
      :loading="loading"
      data-html2canvas-ignore
    >
      <v-icon>mdi-share-variant</v-icon>
      <span>分享</span>
    </v-btn>
    <!-- 右侧天赋 -->
    <div class="duc-doc-rt">
      <DucDetailOrt :model-value="props.modelValue.skills" />
    </div>
    <!-- 左下命座 -->
    <div class="duc-doc-lb">
      <DucDetailOlb :model-value="props.modelValue.constellations" />
    </div>
    <!-- 底部水印信息 -->
    <div class="duc-doc-bt">
      UID: {{ props.modelValue.uid }} Updated: {{ props.modelValue.updated }} | Rendered by
      TeyvatGuide v{{ version }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAvatar from "@Sqlite/modules/userAvatar.js";
import { app } from "@tauri-apps/api";
import { computed, onMounted, ref, watch } from "vue";

import DucDetailOlb from "./duc-detail-olb.vue";
import DucDetailOlt from "./duc-detail-olt.vue";
import DucDetailOrt from "./duc-detail-ort.vue";
import DucDetailRelic from "./duc-detail-relic.vue";

import { generateShareImg } from "@/utils/TGShare.js";

type DucDetailOverlayProps = { modelValue: TGApp.Sqlite.Character.UserRole };
type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type RelicList = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const props = defineProps<DucDetailOverlayProps>();
const version = ref<string>();
const loading = ref<boolean>(false);

const relicList = computed<RelicList>(() => {
  return [
    props.modelValue.relics.find((item) => item.pos === 1) || false,
    props.modelValue.relics.find((item) => item.pos === 2) || false,
    props.modelValue.relics.find((item) => item.pos === 3) || false,
    props.modelValue.relics.find((item) => item.pos === 4) || false,
    props.modelValue.relics.find((item) => item.pos === 5) || false,
  ];
});

const nameCard = ref<string | false>(false);

onMounted(async () => {
  version.value = await app.getVersion();
  loadData();
});
watch(() => props.modelValue, loadData);

function loadData(): void {
  const card = TSUserAvatar.getAvatarCard(props.modelValue.cid);
  nameCard.value = `/source/nameCard/profile/${card}.webp`;
}

async function share(): Promise<void> {
  const detailBox = document.querySelector<HTMLElement>(".duc-do-container");
  if (detailBox === null) {
    showSnackbar.error("未找到角色详情");
    return;
  }
  const fileName = `【角色详情】-${props.modelValue.avatar.name}`;
  loading.value = true;
  await generateShareImg(fileName, detailBox);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.duc-do-container {
  position: relative;
  overflow: hidden;
  width: 800px;
  border-radius: 5px;
  aspect-ratio: 21 / 10;
  background: var(--box-bg-1);
}

.duc-doc-bg {
  position: absolute;
  right: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.duc-doc-bgc {
  position: absolute;
  right: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 20%);
}

.duc-doc-lt {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  row-gap: 10px;
}

.duc-relic {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 10px;
}

.duc-doc-btn {
  position: absolute;
  bottom: 90px;
  left: 370px;
  color: var(--tgc-white-1);
}

.duc-doc-rt {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px;
}

.duc-doc-lb {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 5px;
}

.duc-doc-bt {
  position: absolute;
  right: 10px;
  bottom: -1px;
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 2px var(--tgc-dark-2);
}
</style>
