<!-- 当前存档的成就系列概览与分享 -->
<template>
  <Teleport to="body">
    <TopOverlay
      v-model="visible"
      class="overview-overlay"
      panelWidth="800px"
      panelMaxHeight="min(720px, calc(100dvh - 32px))"
      contentMaxHeight="none"
      titleId="achi-overview-title"
      :showShare="false"
    >
      <template #header>
        <div ref="shareHeader" class="overview-header">
          <div class="overview-title-row">
            <h2 id="achi-overview-title" class="overview-title">成就概览</h2>
            <div class="overview-actions" data-html2canvas-ignore="true">
              <v-btn
                :disabled="loading || failed"
                :loading="sharing"
                aria-label="保存成就概览分享图"
                density="compact"
                icon="mdi-share-variant"
                title="保存成就概览分享图"
                variant="text"
                @click="share"
              />
              <v-btn
                aria-label="关闭"
                density="compact"
                icon="mdi-close"
                variant="text"
                @click="visible = false"
              />
            </div>
          </div>
          <div class="overview-meta">
            <span>存档 {{ uid }}</span>
            <span>版本 {{ gameVersion }}</span>
          </div>
          <template v-if="!loading && !failed">
            <section class="overview-summary" aria-label="整体完成情况">
              <div class="overview-metric">
                <span>已完成成就</span>
                <p>
                  <strong>{{ fmtUtil.num(summary.fin) }}</strong
                  ><span> / {{ fmtUtil.num(summary.total) }}</span>
                </p>
                <span>剩余 {{ fmtUtil.num(summary.total - summary.fin) }} 项</span>
              </div>
              <div class="overview-metric">
                <span>全完成系列</span>
                <p>
                  <strong>{{ fmtUtil.num(summary.completeSeries) }}</strong
                  ><span> / {{ fmtUtil.num(series.length) }}</span>
                </p>
                <span>共 {{ fmtUtil.num(series.length) }} 个系列</span>
              </div>
              <div class="overview-metric">
                <span>对应原石</span>
                <p class="overview-reward">
                  <img src="/icon/material/201.webp" alt="原石" width="24" height="24" />
                  <strong>{{ fmtUtil.num(summary.reward) }}</strong>
                </p>
                <span>尚余 {{ fmtUtil.num(summary.totalReward - summary.reward) }}</span>
              </div>
            </section>
            <div class="overview-progress">
              <progress :value="summary.fin" :max="summary.total || 1" aria-label="整体成就进度" />
              <span>{{ percentage(summary.fin, summary.total) }}%</span>
            </div>
            <p class="overview-note">
              按当前存档统计，包含各阶段成就；原石为对应奖励，不代表已领取。
            </p>
          </template>
        </div>
      </template>
      <template #actions><span hidden /></template>
      <div v-if="loading" class="overview-state" role="status">正在读取成就记录…</div>
      <div v-else-if="failed" class="overview-state" role="alert">
        <p>成就记录读取失败，请重试。</p>
        <v-btn variant="text" @click="refresh">重新加载</v-btn>
      </div>
      <div v-else ref="shareContent" class="overview-sheet">
        <div class="overview-grid">
          <article
            v-for="item in series"
            :key="item.id"
            class="overview-series"
            :class="{ 'is-complete': item.total > 0 && item.fin === item.total }"
          >
            <div class="series-heading">
              <img
                class="series-icon"
                :src="`/icon/achievement/${item.icon}.webp`"
                alt=""
                width="56"
                height="56"
              />
              <h4 class="series-title">{{ item.name }}</h4>
              <span class="series-status">{{ percentage(item.fin, item.total) }}%</span>
            </div>
            <div class="series-stats">
              <p class="series-count" :aria-label="`成就 ${item.fin} / ${item.total}`">
                {{ fmtUtil.num(item.fin) }}<span> / {{ fmtUtil.num(item.total) }}</span>
              </p>
              <span class="series-reward">
                <img src="/icon/material/201.webp" alt="原石" width="16" height="16" />
                {{ fmtUtil.num(item.reward) }} / {{ fmtUtil.num(item.totalReward) }}
              </span>
            </div>
            <progress
              :value="item.fin"
              :max="item.total || 1"
              :aria-label="`${item.name}完成进度`"
            />
          </article>
        </div>
      </div>
      <template #share>
        <div ref="shareCredit" class="overview-credit">
          <span>TeyvatGuide v{{ appVersion }} · 成就概览</span>
          <span v-if="capturedDate">{{ capturedDate }}</span>
        </div>
      </template>
    </TopOverlay>
  </Teleport>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { getVersion } from "@tauri-apps/api/app";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import fmtUtil from "@utils/fmtUtil.js";
import TGShare from "@utils/TGShare.js";
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import { AppAchiData } from "@/data/index.js";

type SeriesOverview = {
  id: number;
  name: string;
  icon: string;
  total: number;
  fin: number;
  reward: number;
  totalReward: number;
};

const { uid } = defineProps<{ uid: number }>();
const visible = defineModel<boolean>({ required: true });
const shareHeader = useTemplateRef<HTMLDivElement>("shareHeader");
const shareCredit = useTemplateRef<HTMLDivElement>("shareCredit");
const shareContent = useTemplateRef<HTMLDivElement>("shareContent");
const records = shallowRef<Array<TGApp.App.Achievement.RenderItem>>([]);
const loading = ref<boolean>(true);
const failed = ref<boolean>(false);
const sharing = ref<boolean>(false);
const appVersion = ref<string>("...");
const capturedDate = ref<string>("");
const gameVersion = AppAchiData.gameVersion;
let requestId = 0;
let disposed = false;
let unlisten: UnlistenFn | undefined;

const series = computed<Array<SeriesOverview>>(() => {
  const completed = new Set(
    records.value.filter((item) => item.isCompleted).map((item) => item.id),
  );
  return [...AppAchiData.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const finished = category.achievements.filter((item) => completed.has(item.id));
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        total: category.achievements.length,
        fin: finished.length,
        reward: finished.reduce((sum, item) => sum + item.reward, 0),
        totalReward: category.achievements.reduce((sum, item) => sum + item.reward, 0),
      };
    });
});
const summary = computed<Omit<SeriesOverview, "id" | "name" | "icon"> & { completeSeries: number }>(
  () =>
    series.value.reduce(
      (sum, item) => ({
        total: sum.total + item.total,
        fin: sum.fin + item.fin,
        reward: sum.reward + item.reward,
        totalReward: sum.totalReward + item.totalReward,
        completeSeries: sum.completeSeries + Number(item.total > 0 && item.fin === item.total),
      }),
      { total: 0, fin: 0, reward: 0, totalReward: 0, completeSeries: 0 },
    ),
);

function percentage(fin: number, total: number): string {
  return (total === 0 ? 0 : (fin * 100) / total).toFixed(1);
}

async function refresh(): Promise<void> {
  const currentRequest = ++requestId;
  loading.value = true;
  failed.value = false;
  try {
    const data = await TSUserAchi.getAchievements(uid);
    if (disposed || currentRequest !== requestId) return;
    records.value = data;
    capturedDate.value = new Date().toLocaleDateString("zh-CN");
  } catch {
    if (!disposed && currentRequest === requestId) failed.value = true;
  } finally {
    if (!disposed && currentRequest === requestId) loading.value = false;
  }
}

async function share(): Promise<void> {
  const element = shareContent.value;
  const header = shareHeader.value;
  const credit = shareCredit.value;
  if (!element || !header || !credit || sharing.value || loading.value || failed.value) return;
  const target = element.cloneNode(false);
  if (!(target instanceof HTMLElement)) return;
  target.style.cssText = `position: fixed; left: -10000px; top: 0; display: flex; flex-direction: column; gap: 12px; width: 1280px; padding: 24px; box-sizing: border-box;`;
  target.append(header.cloneNode(true), element.cloneNode(true), credit.cloneNode(true));
  target.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  const grid = target.querySelector<HTMLElement>(".overview-grid");
  if (grid) grid.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
  document.body.append(target);
  sharing.value = true;
  try {
    // 原生 progress 的内部伪元素无法稳定保留到截图，用普通 DOM 固定导出外观。
    const progressColor = getComputedStyle(target).getPropertyValue("--tgc-yellow-3").trim();
    for (const progress of target.querySelectorAll<HTMLProgressElement>("progress")) {
      const style = getComputedStyle(progress);
      const track = document.createElement("div");
      track.style.cssText = `width: 100%; height: ${style.height}; flex-shrink: 1; overflow: hidden; border-radius: ${style.borderRadius}; background: ${style.backgroundColor};`;
      const fill = document.createElement("div");
      const ratio = Math.min(1, Math.max(0, progress.value / progress.max));
      fill.style.cssText = `width: ${ratio * 100}%; height: 100%; background: ${progressColor};`;
      track.append(fill);
      progress.replaceWith(track);
    }
    await TGShare.modern(`成就概览_${uid}`, target, 2);
  } catch {
    showSnackbar.error("分享失败，请重试");
  } finally {
    target.remove();
    sharing.value = false;
  }
}

watch(() => uid, refresh, { immediate: true });
onMounted(async () => {
  appVersion.value = await getVersion();
  const stop = await listen("updateAchi", refresh);
  if (disposed) stop();
  else unlisten = stop;
});
onUnmounted(() => {
  disposed = true;
  unlisten?.();
});
</script>

<style lang="scss" scoped>
.overview-overlay {
  :deep(.tolp-header) {
    flex-shrink: 0;
    padding: 12px 16px;
  }

  :deep(.tolp-actions) {
    display: none;
  }

  :deep(.tolp-content) {
    align-items: center;
    padding: 12px 10px;
    scrollbar-gutter: stable both-edges;
  }
}

.overview-header {
  width: 100%;
  min-width: 0;
  color: var(--box-text-1);
  font-size: 12px;
  line-height: 16px;

  p,
  h2 {
    margin: 0;
  }
}

.overview-title-row,
.overview-actions,
.overview-meta,
.overview-progress {
  display: flex;
  align-items: center;
}

.overview-title-row {
  justify-content: space-between;
  gap: 12px;
}

.overview-title {
  color: var(--common-text-title);
  font-size: 18px;
  line-height: 28px;
}

.overview-actions {
  gap: 4px;
}

.overview-meta {
  flex-wrap: wrap;
  margin-top: 4px;
  color: var(--box-text-4);
  gap: 4px 16px;
}

.overview-summary {
  display: grid;
  margin: 12px 0 8px;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-metric {
  display: grid;
  gap: 4px;

  span {
    color: var(--box-text-4);
  }

  p {
    line-height: 28px;
  }

  strong {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
  }
}

.overview-reward {
  display: flex;
  align-items: center;
  gap: 4px;
}

.overview-progress {
  gap: 12px;

  span {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
}

.overview-header .overview-note {
  margin-top: 8px;
  color: var(--box-text-4);
}

.overview-sheet {
  width: 100%;
  flex-shrink: 0;
  background: var(--app-page-bg);
  color: var(--box-text-1);
  margin-inline: auto;
}

progress {
  display: block;
  overflow: hidden;
  width: 100%;
  height: 4px;
  border: 0;
  border-radius: 2px;
  background: var(--common-shadow-2);

  &::-webkit-progress-bar {
    background: var(--common-shadow-2);
  }

  &::-webkit-progress-value {
    background: var(--tgc-yellow-3);
  }
}

.overview-grid {
  display: grid;
  align-content: start;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-series {
  display: grid;
  min-width: 0;
  align-content: start;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 4px;
  grid-template-rows: 1fr auto auto;
  text-align: center;

  &.is-complete {
    border-color: var(--tgc-yellow-3);
  }
}

.series-heading {
  display: grid;
  grid-template-rows: 56px 1fr 16px;
  place-items: center center;

  img {
    flex-shrink: 0;
    object-fit: contain;
  }
}

.series-icon {
  padding: 8px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--box-bg-t-1) 40%, transparent) 0%,
    color-mix(in srgb, var(--box-bg-t-1) 20%, transparent) 25%,
    transparent 60%
  );
}

.series-title {
  display: flex;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  margin: 0;
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: normal;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.series-status {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.series-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  gap: 8px;
  white-space: nowrap;
}

.series-count {
  margin: 0;
  font-size: 14px;
  line-height: 20px;

  span {
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.series-reward {
  display: inline-flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 11px;
  gap: 4px;
  line-height: 16px;
}

.overview-credit {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 11px;
  gap: 4px 12px;
  line-height: 16px;
}

.overview-state {
  padding: 24px;
  text-align: center;
}

@media (width <= 760px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-summary {
    gap: 8px;
  }

  .overview-metric strong {
    font-size: 18px;
  }
}

@media (width <= 520px) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
