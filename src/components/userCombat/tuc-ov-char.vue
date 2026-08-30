<!-- 绘想游迹浮窗 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="800px"
    :titleId
    topOffset="112px"
  >
    <template #header>
      <div class="tuc-ovc-icon">
        <img alt="" class="tuc-ovc-icon-blur" src="/UI/combat/charMaster.webp" />
        <img alt="" class="tuc-ovc-icon-main" src="/UI/combat/charMaster.webp" />
      </div>
      <div class="tuc-ovc-heading">
        <h2 :id="titleId">绘想游迹</h2>
        <div class="tuc-ovc-progress">
          <span>完成进度</span>
          <strong>{{ finish }} / {{ total }}</strong>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :loading="shareLoading"
        aria-label="保存绘想游迹分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存绘想游迹分享图"
        variant="text"
        @click="share"
      />
      <v-btn
        aria-label="关闭绘想游迹"
        density="comfortable"
        icon="mdi-close"
        title="关闭绘想游迹"
        variant="text"
        @click="visible = false"
      />
    </template>

    <div class="tuc-ovc-list">
      <TucOvcItem v-for="item in data" :key="item.avatar_id" :item />
    </div>

    <template #share>
      <span>UID {{ uid }}</span>
      <span> · TeyvatGuide v{{ version }}</span>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import { getVersion } from "@tauri-apps/api/app";
import TGShare from "@utils/TGShare.js";
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";

import TucOvcItem from "./tuc-ovc-item.vue";

type TucOvCharProps = { data: Array<TGApp.Game.Combat.CharMaster>; uid: string | undefined };

const { data, uid } = defineProps<TucOvCharProps>();
const visible = defineModel<boolean>({ required: true });
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const titleId = useId();

const version = ref<string>("");
const shareLoading = ref<boolean>(false);
const finish = computed<number>(
  () => data.filter((item) => item.status === gameEnum.combat.charMasterStat.DONE).length,
);
const total = computed<number>(() => data.length);

onMounted(async () => {
  version.value = await getVersion();
});

async function share(): Promise<void> {
  const panel = overlayPanel.value?.panel ?? null;
  const content = overlayPanel.value?.content ?? null;
  if (panel === null || content === null) {
    showSnackbar.warn("未获取到分享内容");
    return;
  }
  const fileName = `绘想游迹_${uid}_${new Date().getTime()}`;
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
.tuc-ovc-icon {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--common-shadow-t-2);

  img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
}

.tuc-ovc-icon-main {
  position: relative;
  z-index: 1;
  filter: var(--icon-filter);
}

.tuc-ovc-icon-blur {
  position: absolute;
  filter: blur(4px);
  opacity: 0.7;

  .default & {
    filter: brightness(0.35) blur(4px);
  }
}

.tuc-ovc-heading {
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

.tuc-ovc-progress {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;

  strong {
    color: var(--tgc-od-orange);
    font-weight: 600;
  }
}

.tuc-ovc-list {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
