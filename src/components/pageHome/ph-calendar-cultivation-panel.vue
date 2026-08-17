<!-- 首页素材日历-养成目标内容 -->
<template>
  <TOverlayPanel
    ref="panelRef"
    contentMaxHeight="none"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="min(720px, calc(100vw - 160px))"
    :shareCaption
  >
    <template #header>
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
    </template>

    <template #actions>
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
    </template>

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
          <v-chip size="x-small" variant="outlined">优先 {{ entryPriority(entry) }}</v-chip>
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
          <span class="phco-section-hint">当前量与可合成量按目标优先级分配结果统计</span>
        </div>
      </div>
      <div
        v-if="targetMaterials.length > 0"
        :class="{ 'phco-materials--weapon': item.itemType === 'weapon' }"
        class="phco-materials"
      >
        <UcMaterialReq
          v-for="row in targetMaterials"
          :key="row.material.id"
          :highlight="row.isToday"
          :interactive="false"
          :material="row.material"
        />
      </div>
      <div v-else class="phco-material-empty">
        <v-icon size="24">mdi-check-circle-outline</v-icon>
        <span>该目标的当日副本材料已无需补充</span>
      </div>
    </div>

    <template #footer>
      <div class="phco-footer-actions">
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
      </div>
    </template>
  </TOverlayPanel>
</template>

<script lang="ts" setup>
import TOverlayPanel from "@comp/app/t-overlay-panel.vue";
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";
import { getServerDay, isMaterialAvailableToday } from "@/utils/cultivationPlan.js";

type PhCalendarCultivationPanelProps = {
  /** 来源组件标签 */
  src?: string;
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  entryMaterials: ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>;
  item: TGApp.App.Calendar.Item;
  planEntries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  project?: TGApp.Sqlite.Cultivation.Project;
};

type DisplayMaterial = {
  isToday: boolean;
  material: TGApp.App.UserCalc.ResultMaterial;
};
type SelectedMaterialAllocation = { craftable: number; current: number; type: string };

const dayLabels: Record<number, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
};

const emits = defineEmits<{ close: [] }>();
const props = withDefaults(defineProps<PhCalendarCultivationPanelProps>(), {
  src: "素材日历",
});
const router = useRouter();
const panelRef = useTemplateRef<InstanceType<typeof TOverlayPanel>>("panelRef");

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
const selectedMaterialAllocations = computed<Map<number, SelectedMaterialAllocation>>(() => {
  const allocations = new Map<number, SelectedMaterialAllocation>();
  for (const entry of props.entries) {
    for (const material of props.entryMaterials.get(entry.id) ?? []) {
      const current = allocations.get(material.id);
      allocations.set(material.id, {
        craftable: (current?.craftable ?? 0) + material.craftable,
        current: (current?.current ?? 0) + material.owned,
        type: material.type,
      });
    }
  }
  return allocations;
});
const entryPriorities = computed<Map<string, number>>(
  () =>
    new Map(
      props.planEntries
        .filter((entry) => entry.status === "active")
        .sort(comparePersistentEntries)
        .map((entry, index) => [entry.id, index + 1]),
    ),
);
const targetMaterials = computed<Array<DisplayMaterial>>(() =>
  props.item.materials
    .map((calendarMaterial) => {
      const allocation = selectedMaterialAllocations.value.get(calendarMaterial.id);
      const required = props.entries.reduce(
        (total, entry) =>
          total +
          entry.items
            .filter((entryItem) => entryItem.materialId === calendarMaterial.id)
            .reduce((sum, entryItem) => sum + entryItem.required, 0),
        0,
      );
      const owned = allocation?.current ?? 0;
      const craftable = allocation?.craftable ?? 0;
      const available = owned + craftable;
      const wiki = WikiMaterialData.find((item) => item.id === calendarMaterial.id);
      return {
        isToday:
          isTraveler.value &&
          isMaterialAvailableToday(calendarMaterial.id, serverDay.value, WikiMaterialData),
        material: {
          id: calendarMaterial.id,
          name: calendarMaterial.name,
          type: allocation?.type ?? wiki?.type ?? "素材",
          star: calendarMaterial.star,
          required,
          owned,
          craftable,
          craftingCosts: [],
          missing: Math.max(required - available, 0),
          progress: required === 0 ? 100 : Math.min((available / required) * 100, 100),
        },
      };
    })
    .filter((row) => {
      if (row.material.required <= 0) return false;
      if (!isTraveler.value) return true;
      return selectedMaterialAllocations.value.get(row.material.id)?.type === "角色天赋素材";
    })
    .sort((a, b) => b.material.star - a.material.star),
);
const materialDropDays = computed<Array<TGApp.App.Calendar.DropDayLabel>>(() => {
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
const shareCaption = computed<string>(() => `${props.src} · 养成目标 · ${props.item.name}`);

function comparePersistentEntries(
  a: TGApp.Sqlite.Cultivation.EntryWithItems,
  b: TGApp.Sqlite.Cultivation.EntryWithItems,
): number {
  return (
    a.sortOrder - b.sortOrder || a.created.localeCompare(b.created) || a.id.localeCompare(b.id)
  );
}

function entryPriority(entry: TGApp.Sqlite.Cultivation.EntryWithItems): number {
  return entryPriorities.value.get(entry.id) ?? 0;
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

async function shareCultivation(): Promise<void> {
  const element = panelRef.value?.panel ?? null;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const maxHeight = element.style.maxHeight;
  const overflowY = element.style.overflowY;
  element.style.maxHeight = "none";
  element.style.overflowY = "visible";
  try {
    await generateShareImg(`养成目标_${props.item.name}`, element, 1.5);
  } finally {
    element.style.maxHeight = maxHeight;
    element.style.overflowY = overflowY;
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
.phco-title-row,
.phco-attributes,
.phco-attributes > span,
.phco-source,
.phco-entry-top,
.phco-entry-level,
.phco-talents,
.phco-options,
.phco-section-title,
.phco-section-title > div {
  display: flex;
  align-items: center;
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
    font-weight: normal;
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
    font-weight: normal;
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

.phco-footer-actions {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  gap: 8px;
}

@media (width <= 600px) {
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
