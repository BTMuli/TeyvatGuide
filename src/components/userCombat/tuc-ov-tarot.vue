<!-- 月谕圣牌浮窗 -->
<template>
  <TopOverlay
    v-if="data"
    ref="overlayPanel"
    v-model="visible"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="800px"
    :titleId
    topOffset="112px"
  >
    <template #header>
      <div class="tuc-ovt-icon">
        <img alt="" src="/UI/combat/tarotDefault.webp" />
      </div>
      <div class="tuc-ovt-heading">
        <h2 :id="titleId">月谕圣牌</h2>
        <div class="tuc-ovt-progress">
          <span>已解锁</span>
          <strong>{{ finish }} / {{ total }}</strong>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :loading="shareLoading"
        aria-label="保存月谕圣牌分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存月谕圣牌分享图"
        variant="text"
        @click="share"
      />
      <v-btn
        aria-label="关闭月谕圣牌"
        density="comfortable"
        icon="mdi-close"
        title="关闭月谕圣牌"
        variant="text"
        @click="visible = false"
      />
    </template>

    <div class="tuc-ovt-list">
      <TucOvtItem v-for="item in data.list" :key="item.name" :item />
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
import TucOvtItem from "@comp/userCombat/tuc-ovt-item.vue";
import { getVersion } from "@tauri-apps/api/app";
import TGShare from "@utils/TGShare.js";
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";

type TucOvTarotProps = { data: TGApp.Game.Combat.TarotState | undefined; uid: string | undefined };

const { data, uid } = defineProps<TucOvTarotProps>();
const visible = defineModel<boolean>({ required: true });
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const titleId = useId();

const version = ref<string>("");
const shareLoading = ref<boolean>(false);
const finish = computed<number>(() => data?.curr_num ?? 0);
const total = computed<number>(() => data?.total_num ?? 22);

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
  const fileName = `月谕圣牌_${uid}_${new Date().getTime()}`;
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
.tuc-ovt-icon {
  display: flex;
  width: 28px;
  height: 48px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  margin-right: -4px;

  img {
    height: 48px;
    object-fit: contain;
  }
}

.tuc-ovt-list {
  display: grid;
  width: 100%;
  margin-bottom: 20px;
  gap: 8px;
  grid-template-columns: repeat(16, minmax(0, 1fr));

  > :deep(.tuc-ovti-box) {
    grid-column: span 2;
  }

  > :deep(.tuc-ovti-box:first-child),
  > :deep(.tuc-ovti-box:nth-child(16)) {
    grid-column: 2 / span 2;
  }
}

.tuc-ovt-heading {
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

.tuc-ovt-progress {
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
</style>
