<template>
  <TOverlay v-model="visible">
    <div v-if="data" class="tuc-overlay-box">
      <div class="tuc-overlay-top">
        <span class="tuc-overlay-title" @click="share()">
          真境剧诗统计-第{{ data.ScheduleId }}期
        </span>
        <span class="tuc-overlay-sub">
          <span>共{{ data.RecordTotal }}条数据 | </span>
          <span>更新于{{ timestampToDate(data.Timestamp) }}</span>
        </span>
      </div>
      <div class="tuc-overlay-content">
        <TItemBox v-for="(item, index) in raw" :key="index" :model-value="getBoxData(item)" />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { computed } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucOverlayProps = { data: TGApp.Plugins.Hutao.Combat.Data | undefined };

const props = defineProps<TucOverlayProps>();
const visible = defineModel<boolean>();
const raw = computed<Array<TGApp.Plugins.Hutao.Base.Rate>>(() => {
  if (!props.data) return [];
  const res = props.data.BackupAvatarRates;
  return res.sort((a, b) => b.Rate - a.Rate);
});

function getBoxData(item: TGApp.Plugins.Hutao.Base.Rate): TItemBoxData {
  const avatar = AppCharacterData.find((i) => i.id === item.Item);
  return {
    bg: `/icon/bg/${avatar?.star ?? 3}-Star.webp`,
    clickable: false,
    display: "outer",
    icon: `/WIKI/character/${item.Item}.webp`,
    innerHeight: 20,
    innerText: avatar?.name ?? "旅行者",
    outerText: `${(item.Rate * 100).toFixed(3)}%`,
    outerHeight: 25,
    lt:
      avatar === undefined
        ? ""
        : avatar.element !== ""
          ? `/icon/element/${avatar.element}元素.webp`
          : `/icon/weapon/${avatar.weapon}.webp`,
    ltSize: "15px",
    size: "75px",
    height: "100px",
  };
}

async function share(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".tuc-overlay-box");
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `真境剧诗_${new Date().getTime()}.png`;
  await showLoading.start("正在生成分享图", fileName);
  await generateShareImg(fileName, element, 1.2, true);
  await showLoading.end();
}
</script>
<style lang="css" scoped>
.tuc-overlay-box {
  display: flex;
  width: 800px;
  height: 600px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  background: var(--app-page-bg);
  gap: 10px;
}

.tuc-overlay-top {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.tuc-overlay-title {
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.tuc-overlay-sub {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 12px;
  opacity: 0.8;
  white-space: pre;
}

.tuc-overlay-content {
  display: grid;
  width: 100%;
  padding-right: 10px;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
}
</style>
