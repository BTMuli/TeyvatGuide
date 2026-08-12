<!-- 首页素材日历-养成目标内容 -->
<template>
  <section ref="panelRef" class="phco-panel">
    <header class="phco-header">
      <UcItemIcon :alt="item.name" :icon="itemIcon" :size="84" :star="item.star" />
      <div class="phco-heading">
        <div class="phco-title-row">
          <h2>{{ item.name }}</h2>
          <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
            <v-icon size="15" start>mdi-star</v-icon>
            养成目标
          </v-chip>
          <v-chip v-if="project" size="small" variant="tonal">
            <v-icon size="15" start>mdi-clipboard-text-outline</v-icon>
            {{ project.name }} · UID {{ project.uid }}
          </v-chip>
        </div>
        <div class="phco-attributes">
          <span>
            <v-icon size="16">{{ itemTypeIcon }}</v-icon>
            {{ itemTypeLabel }}
          </span>
          <span>
            <v-icon color="var(--tgc-od-orange)" size="16">mdi-star</v-icon>
            {{ itemRarityLabel }}
          </span>
          <span v-if="item.element">
            <img :alt="`${item.element}元素`" :src="`/icon/element/${item.element}元素.webp`" />
            {{ item.element }}元素
          </span>
          <span>
            <img :alt="item.weapon" :src="`/icon/weapon/${item.weapon}.webp`" class="icon-filter" />
            {{ item.weapon }}
          </span>
        </div>
        <div class="phco-source">
          <img
            v-if="item.source.area"
            :alt="item.source.area"
            :src="`/icon/nation/${item.source.area}.webp`"
          />
          <span>{{ item.source.area ? `${item.source.area} · ` : "" }}{{ item.source.name }}</span>
        </div>
      </div>
      <div class="phco-actions" data-html2canvas-ignore="true">
        <v-btn
          aria-label="保存养成目标分享图"
          density="comfortable"
          icon="mdi-share-variant"
          title="保存养成目标分享图"
          variant="text"
          @click="shareCultivation"
        />
        <v-btn
          aria-label="关闭养成目标详情"
          density="comfortable"
          icon="mdi-close"
          title="关闭"
          variant="text"
          @click="emits('close')"
        />
      </div>
    </header>

    <div class="phco-entries">
      <article v-for="(entry, index) in entries" :key="entry.id" class="phco-entry">
        <div class="phco-entry-top">
          <div class="phco-entry-level">
            <span class="phco-entry-label">目标 {{ index + 1 }}</span>
            <strong>Lv.{{ entry.currentState.level }}</strong>
            <v-icon size="16">mdi-arrow-right</v-icon>
            <strong>Lv.{{ entry.targetState.level }}</strong>
            <div class="phco-options">
              <v-chip color="var(--tgc-od-blue)" size="x-small" variant="tonal">
                {{ entry.calculationMode === "api" ? "接口计算" : "背包计算" }}
              </v-chip>
              <v-chip
                v-if="entry.allowCrafting"
                color="var(--tgc-od-green)"
                size="x-small"
                variant="tonal"
              >
                允许合成
              </v-chip>
              <v-chip v-if="entry.useDust" size="x-small" variant="tonal">使用嬗变之尘</v-chip>
              <v-chip v-if="entry.useSolvent" size="x-small" variant="tonal">使用异梦溶媒</v-chip>
            </div>
          </div>
          <v-chip size="x-small" variant="outlined">优先 {{ entry.sortOrder + 1 }}</v-chip>
        </div>

        <div v-if="entry.targetState.talents.length > 0" class="phco-talents">
          <span class="phco-talents-label">天赋目标</span>
          <v-chip
            v-for="talent in entry.targetState.talents"
            :key="talent.id"
            size="x-small"
            variant="tonal"
          >
            {{ talent.name }} Lv.{{ talent.level }}（当前 Lv.{{
              getCurrentTalentLevel(entry, talent)
            }}）
          </v-chip>
        </div>
      </article>
    </div>

    <div class="phco-material-section">
      <div class="phco-section-title">
        <div>
          <v-icon color="var(--tgc-od-orange)" size="18">mdi-calendar-today</v-icon>
          <strong>当日副本材料</strong>
          <div
            v-if="!isTraveler && materialDropDays.length > 0"
            aria-label="材料可刷时间"
            class="phco-material-days"
          >
            <v-chip
              v-for="day in materialDropDays"
              :key="day.value"
              :color="day.isToday ? 'var(--tgc-od-orange)' : undefined"
              :prepend-icon="day.isToday ? 'mdi-calendar-check-outline' : undefined"
              :variant="day.isToday ? 'tonal' : 'outlined'"
              size="small"
            >
              {{ day.label }}
            </v-chip>
          </div>
        </div>
        <div class="phco-section-meta">
          <span class="phco-section-hint">目标需求为当前角色/武器合计，缺口为整个计划统计</span>
        </div>
      </div>
      <div
        v-if="targetMaterials.length > 0"
        :class="{ 'phco-materials--weapon': item.itemType === 'weapon' }"
        class="phco-materials"
      >
        <article
          v-for="material in targetMaterials"
          :key="material.id"
          :class="{ 'phco-material--today': material.isToday }"
          class="phco-material"
        >
          <UcItemIcon
            :alt="material.name"
            :icon="`/icon/material/${material.id}.webp`"
            :size="42"
            :star="material.star"
          />
          <div class="phco-material-info">
            <strong>{{ material.name }}</strong>
            <span class="phco-material-rarity">{{ material.star }} 星素材</span>
          </div>
          <v-chip
            :color="
              material.currentOwned < material.targetRequired
                ? 'var(--tgc-od-red)'
                : 'var(--tgc-od-green)'
            "
            size="small"
            variant="tonal"
          >
            {{ formatCount(material.currentOwned) }}/{{ formatCount(material.targetRequired) }}
          </v-chip>
        </article>
      </div>
      <div v-else class="phco-material-empty">
        <v-icon size="24">mdi-check-circle-outline</v-icon>
        <span>该目标的当日副本材料已无需补充</span>
      </div>
    </div>

    <footer ref="footerRef" class="phco-footer">
      <v-btn prepend-icon="mdi-book-open-page-variant-outline" variant="text" @click="openDetail">
        {{ item.itemType === "character" ? "角色详情" : "武器详情" }}
      </v-btn>
      <v-btn
        color="var(--tgc-od-orange)"
        prepend-icon="mdi-clipboard-text-outline"
        variant="tonal"
        @click="openPlan"
      >
        查看养成计划
      </v-btn>
    </footer>

    <footer class="phco-share">{{ shareCaption }} · Rendered by TeyvatGuide v{{ version }}</footer>
  </section>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";
import { getServerDay, isMaterialAvailableToday } from "@/utils/cultivationPlan.js";

type PhCalendarCultivationPanelProps = {
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  item: TGApp.App.Calendar.Item;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  project?: TGApp.Sqlite.Cultivation.Project;
};
type PhCalendarCultivationPanelEmits = { close: [] };

type TargetMaterial = TGApp.App.Calendar.Material & {
  currentOwned: number;
  isToday: boolean;
  targetRequired: number;
};
type DropDayLabel = { isToday: boolean; label: string; value: number };

const dayLabels: Record<number, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
};

const props = defineProps<PhCalendarCultivationPanelProps>();
const emits = defineEmits<PhCalendarCultivationPanelEmits>();
const router = useRouter();
const panelRef = useTemplateRef<HTMLElement>("panelRef");
const footerRef = useTemplateRef<HTMLElement>("footerRef");
const version = ref<string>();

const itemIcon = computed<string>(() => `/WIKI/${props.item.itemType}/${props.item.id}.webp`);
const itemTypeIcon = computed<string>(() =>
  props.item.itemType === "character" ? "mdi-account-outline" : "mdi-sword",
);
const itemTypeLabel = computed<string>(() =>
  props.item.itemType === "character" ? "角色" : "武器",
);
const itemRarityLabel = computed<string>(() =>
  props.item.star === 105 ? "特殊五星" : `${props.item.star} 星`,
);
const isTraveler = computed<boolean>(
  () => props.item.id === 10000005 || props.item.id === 10000007,
);
const serverDay = computed<number>(() => getServerDay(props.project?.timezone ?? 8));
const materialResultMap = computed<Map<number, TGApp.App.UserCalc.ResultMaterial>>(
  () => new Map(props.materials.map((material) => [material.id, material])),
);
const targetMaterials = computed<Array<TargetMaterial>>(() =>
  props.item.materials
    .map((material) => {
      const targetRequired = props.entries.reduce(
        (total, entry) =>
          total +
          (entry.items.find((entryItem) => entryItem.materialId === material.id)?.required ?? 0),
        0,
      );
      const currentOwned = materialResultMap.value.get(material.id)?.owned ?? 0;
      return {
        ...material,
        currentOwned,
        isToday:
          isTraveler.value &&
          isMaterialAvailableToday(material.id, serverDay.value, WikiMaterialData),
        targetRequired,
      };
    })
    .filter((material) => {
      if (material.targetRequired <= 0) return false;
      if (!isTraveler.value) return true;
      return materialResultMap.value.get(material.id)?.type === "角色天赋素材";
    })
    .sort((a, b) => b.star - a.star),
);
const materialDropDays = computed<Array<DropDayLabel>>(() => {
  if (isTraveler.value) return [];
  const days = new Set<number>();
  if (props.item.dropDays.length > 0) {
    for (const day of props.item.dropDays) days.add(day === 0 ? 7 : day);
  }
  const currentDay = serverDay.value || 7;
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => ({
      isToday: day === currentDay,
      label: dayLabels[day] ?? `周${day}`,
      value: day,
    }));
});
const shareCaption = computed<string>(() => `${props.item.name} · 养成目标`);

function formatCount(count: number): string {
  return count.toLocaleString("zh-CN");
}

function getCurrentTalentLevel(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  talent: TGApp.Sqlite.Cultivation.TalentState,
): number {
  return (
    entry.currentState.talents.find((item) => item.id === talent.id)?.level ??
    entry.currentState.talents.find((item) => item.name === talent.name)?.level ??
    1
  );
}

onMounted(async () => {
  version.value = await getVersion();
});

async function shareCultivation(): Promise<void> {
  const element = panelRef.value;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const maxHeight = element.style.maxHeight;
  const overflowY = element.style.overflowY;
  element.style.maxHeight = "none";
  element.style.overflowY = "visible";
  const footer = footerRef.value;
  const footerDisplay = footer?.style.display ?? "";
  if (footer !== null) footer.style.display = "none";
  try {
    await generateShareImg(`养成目标_${props.item.name}`, element, 1.5);
  } finally {
    element.style.maxHeight = maxHeight;
    element.style.overflowY = overflowY;
    if (footer !== null) footer!.style!.display = footerDisplay;
  }
}

async function openDetail(): Promise<void> {
  emits("close");
  await router.push(`/wiki/${props.item.itemType}/${props.item.id}`);
}

async function openPlan(): Promise<void> {
  emits("close");
  await router.push("/user/cultivation");
}
</script>

<style lang="scss" scoped>
.phco-panel {
  display: flex;
  overflow: hidden;
  width: min(720px, calc(100vw - 160px));
  max-height: calc(100% - 32px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 18px 48px #00000066;
}

.phco-header,
.phco-title-row,
.phco-attributes,
.phco-attributes > span,
.phco-source,
.phco-entry-top,
.phco-entry-level,
.phco-talents,
.phco-options,
.phco-section-title,
.phco-section-title > div,
.phco-material,
.phco-footer {
  display: flex;
  align-items: center;
}

.phco-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  gap: 4px;
}

.phco-header {
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 14px;
}

.phco-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.phco-title-row {
  flex-wrap: wrap;
  gap: 8px;

  h2 {
    margin: 0;
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 500;
  }
}

.phco-attributes {
  flex-wrap: wrap;
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 10px;

  > span {
    gap: 4px;
  }

  img {
    width: 18px;
    height: 18px;
    filter: var(--icon-filter);
    object-fit: contain;
  }
}

.phco-source {
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 6px;
}

.phco-source img {
  width: 20px;
  height: 20px;
  filter: var(--icon-filter);
  object-fit: contain;
}

.phco-entries {
  display: grid;
  padding: 14px 16px 0;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.phco-entry {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.phco-entry-top {
  justify-content: space-between;
  gap: 8px;

  .phco-entry-level {
    flex-shrink: 0;
    gap: 5px;
  }

  strong {
    color: var(--tgc-od-orange);
    font-family: var(--font-title);
    font-size: 16px;
  }
}

.phco-entry-label,
.phco-talents-label {
  margin-right: 4px;
  color: var(--common-text-sub);
  font-size: 12px;
}

.phco-talents,
.phco-options {
  flex-wrap: wrap;
  gap: 4px;
}

.phco-options {
  min-width: 0;
}

.phco-material-section {
  display: flex;
  flex-direction: column;
  padding: 14px 16px 16px;
  gap: 10px;
}

.phco-section-title {
  justify-content: space-between;
  gap: 12px;

  > div {
    gap: 6px;
  }

  .phco-section-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .phco-material-days {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .phco-section-hint {
    color: var(--common-text-sub);
    font-size: 12px;
    text-align: right;
  }
}

.phco-materials {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);

  &.phco-materials--weapon {
    grid-template-columns: repeat(2, 1fr);
  }
}

.phco-material {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  gap: 8px;

  &.phco-material--today {
    border-color: var(--tgc-od-orange);
    border-left-width: 3px;
    background: var(--common-shadow-t-1);
  }
}

.phco-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;

  strong {
    overflow: hidden;
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .phco-material-rarity {
    color: var(--common-text-sub);
    font-size: 12px;
  }
}

.phco-material-empty {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  color: var(--common-text-sub);
  gap: 8px;
}

.phco-footer {
  justify-content: flex-end;
  padding: 10px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.phco-share {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}

@media (width <= 600px) {
  .phco-header {
    align-items: flex-start;
  }

  .phco-section-title {
    flex-direction: column;
    align-items: flex-start;

    .phco-section-hint {
      text-align: left;
    }

    .phco-section-meta {
      justify-content: flex-start;
    }
  }
}
</style>
