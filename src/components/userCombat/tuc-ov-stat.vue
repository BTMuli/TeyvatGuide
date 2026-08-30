<!-- 剧诗统计浮窗 -->
<template>
  <TopOverlay
    v-if="data"
    ref="overlayPanel"
    v-model="visible"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="800px"
    shareCaption="真境剧诗统计"
    :titleId
    topOffset="112px"
  >
    <template #header>
      <div class="tuc-ovs-icon">
        <img alt="" src="/platforms/other/hutao.webp" />
      </div>
      <div class="tuc-ovs-heading">
        <h2 :id="titleId">真境剧诗统计</h2>
        <div class="tuc-ovs-meta">
          <span class="tuc-ovs-meta-tag">第 {{ data.ScheduleId }} 期</span>
          <span>共 {{ data.RecordTotal }} 条数据</span>
          <span>更新于 {{ fmtUtil.dateTime(data.Timestamp) }}</span>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :loading="shareLoading"
        aria-label="保存真境剧诗统计分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存真境剧诗统计分享图"
        variant="text"
        @click="share"
      />
      <v-btn
        aria-label="关闭真境剧诗统计"
        density="comfortable"
        icon="mdi-close"
        title="关闭真境剧诗统计"
        variant="text"
        @click="visible = false"
      />
    </template>

    <div class="tuc-ovs-content">
      <TItemBox v-for="item in raw" :key="item.Item" :model-value="getBoxData(item)" />
    </div>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGShare from "@utils/TGShare.js";
import { computed, ref, useId, useTemplateRef } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucOvStatProps = { data: TGApp.Plugins.Hutao.Combat.Data | undefined };

const { data } = defineProps<TucOvStatProps>();
const visible = defineModel<boolean>({ required: true });
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const titleId = useId();
const shareLoading = ref<boolean>(false);

const raw = computed<Array<TGApp.Plugins.Hutao.Base.Rate>>(() => {
  if (!data) return [];
  return data.BackupAvatarRates.toSorted((a, b) => b.Rate - a.Rate);
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
  const panel = overlayPanel.value?.panel ?? null;
  const content = overlayPanel.value?.content ?? null;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `真境剧诗统计_${new Date().getTime()}.png`;
  const contentMaxHeight = content.style.maxHeight;
  const contentOverflowY = content.style.overflowY;
  shareLoading.value = true;
  await showLoading.start("正在生成分享图", fileName);
  content.style.maxHeight = "none";
  content.style.overflowY = "visible";
  try {
    await TGShare.modern(fileName, panel, 1.2, true);
  } finally {
    content.style.maxHeight = contentMaxHeight;
    content.style.overflowY = contentOverflowY;
    await showLoading.end();
    shareLoading.value = false;
  }
}
</script>
<style lang="scss" scoped>
.tuc-ovs-icon {
  display: flex;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  align-items: center;
  justify-content: center;

  img {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
  }
}

.tuc-ovs-content {
  display: grid;
  width: 100%;
  justify-content: center;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, 80px);
}

.tuc-ovs-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tuc-ovs-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.tuc-ovs-meta-tag {
  padding: 0 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-orange);
}
</style>
