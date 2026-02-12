<!-- 剧诗统计浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div v-if="data" :class="{ share: isShare }" class="tuc-ovs-box">
      <div class="tuc-ovs-top">
        <span class="tuc-ovs-title" @click="share()"> 真境剧诗统计-第{{ data.ScheduleId }}期 </span>
        <span class="tuc-ovs-sub">
          <span>共{{ data.RecordTotal }}条数据 | </span>
          <span>更新于{{ timestampToDate(data.Timestamp) }}</span>
        </span>
      </div>
      <div class="tuc-ovs-content">
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
import { computed, ref } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucOvStatProps = { data: TGApp.Plugins.Hutao.Combat.Data | undefined };

const props = defineProps<TucOvStatProps>();
const visible = defineModel<boolean>();

const isShare = ref<boolean>(false);
const raw = computed<Array<TGApp.Plugins.Hutao.Base.Rate>>(() => {
  if (!props.data) return [];
  const res = props.data.BackupAvatarRates;
  return res.sort((a, b) => b.Rate - a.Rate);
});

function getBoxData(item: TGApp.Plugins.Hutao.Base.Rate): TItemBoxData {
  if ([10000005, 10000007].includes(item.Item)) {
    return {
      bg: `/icon/bg/5-Star.webp`,
      clickable: false,
      display: "outer",
      icon: `/WIKI/character/${item.Item}.webp`,
      innerHeight: 20,
      innerText: item.Item === 10000005 ? "空" : "荧",
      outerText: `${(item.Rate * 100).toFixed(3)}%`,
      outerHeight: 25,
      lt: `/icon/weapon/单手剑.webp`,
      ltSize: "20px",
      size: "80px",
      height: "100px",
    };
  }
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
    ltSize: "20px",
    size: "80px",
    height: "100px",
  };
}

async function share(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".tuc-ovs-box");
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `真境剧诗统计_${new Date().getTime()}.png`;
  await showLoading.start("正在生成分享图", fileName);
  isShare.value = true;
  await generateShareImg(fileName, element, 1.2, true);
  isShare.value = false;
  await showLoading.end();
}
</script>
<style lang="css" scoped>
.tuc-ovs-box {
  position: relative;
  display: flex;
  width: 800px;
  max-height: 600px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  gap: 8px;

  &.share {
    overflow-y: auto;

    .tuc-ovs-content {
      overflow-y: unset;
    }
  }
}

.tuc-ovs-top {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.tuc-ovs-title {
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.tuc-ovs-sub {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 12px;
  opacity: 0.8;
  white-space: pre;
}

.tuc-ovs-content {
  display: grid;
  width: 100%;
  padding-right: 8px;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  overflow-y: auto;
}
</style>
