<!-- 养成计划-目标卡片 -->
<template>
  <v-card
    :class="{
      completed: entry.status === 'completed',
      fulfilled,
      today: entry.status === 'active' && !fulfilled && hasTodayMaterial,
    }"
    class="ucptc-card"
    variant="outlined"
  >
    <div class="ucptc-main">
      <UcItemIcon :alt="entry.name" :icon="entry.icon" :size="64" :star="entry.star" />
      <div class="ucptc-info">
        <div class="ucptc-name-row">
          <span class="ucptc-name">{{ entry.name }}</span>
          <v-chip v-if="entry.status === 'active'" size="x-small" variant="outlined">
            优先 {{ priority }}
          </v-chip>
          <v-chip
            :color="fulfilled ? 'var(--tgc-od-green)' : undefined"
            size="x-small"
            variant="tonal"
          >
            {{ statusLabel }}
          </v-chip>
          <v-chip
            v-if="entry.status === 'active' && !fulfilled && hasTodayMaterial"
            color="var(--tgc-od-orange)"
            size="x-small"
            variant="tonal"
          >
            今日可刷
          </v-chip>
        </div>
        <span class="ucptc-level">
          Lv.{{ entry.currentState.level }} → Lv.{{ entry.targetState.level }}
        </span>
        <div v-if="talentLevels.length > 0" class="ucptc-talents">
          <span>天赋</span>
          <span
            v-for="talent in talentLevels"
            :key="talent.id"
            :title="talent.name"
            class="ucptc-talent"
          >
            {{ talent.label }}：{{ talent.currentLevel }} → {{ talent.targetLevel }}
          </span>
        </div>
        <div class="ucptc-options">
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
          <v-chip v-if="entry.useSolvent" size="x-small" variant="tonal">使用溶媒</v-chip>
        </div>
        <div class="ucptc-progress-row">
          <v-progress-linear
            :color="fulfilled ? 'var(--tgc-od-green)' : 'var(--tgc-od-orange)'"
            :model-value="progress"
            height="5"
            rounded
          />
          <span>{{ progress.toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <div class="ucptc-actions">
      <div class="ucptc-action-end">
        <template v-if="entry.status === 'active'">
          <v-btn
            :disabled="!canMoveUp"
            icon="mdi-arrow-left"
            size="small"
            title="提高优先级"
            variant="text"
            @click="emits('move', entry.id, -1)"
          />
          <v-btn
            :disabled="!canMoveDown"
            icon="mdi-arrow-right"
            size="small"
            title="降低优先级"
            variant="text"
            @click="emits('move', entry.id, 1)"
          />
        </template>
        <v-btn
          :icon="entry.status === 'completed' ? 'mdi-restore' : 'mdi-check-circle-outline'"
          :title="entry.status === 'completed' ? '恢复目标' : '标记完成'"
          size="small"
          variant="text"
          @click="emits('status', entry, entry.status === 'completed' ? 'active' : 'completed')"
        />
        <v-btn
          icon="mdi-pencil-outline"
          size="small"
          title="编辑目标"
          variant="text"
          @click="emits('edit', entry)"
        />
        <v-btn
          color="var(--tgc-od-red)"
          icon="mdi-delete-outline"
          size="small"
          title="删除目标"
          variant="text"
          @click="emits('remove', entry)"
        />
      </div>
    </div>

    <div class="ucptc-materials">
      <div
        v-for="material in displayMaterials"
        :key="material.item.materialId"
        :class="{ fulfilled: material.fulfilled }"
        class="ucptc-material"
        role="button"
        tabindex="0"
        @pointerdown.stop
        @pointerup.stop="selectMaterial(material.item.materialId)"
        @keydown.enter.stop="selectMaterial(material.item.materialId)"
        @keydown.space.prevent.stop="selectMaterial(material.item.materialId)"
      >
        <div class="ucptc-material-icon">
          <img :src="materialBackground(material.item.materialId)" alt="" class="background" />
          <img
            :alt="materialName(material.item.materialId)"
            :src="materialIcon(material.item.materialId)"
            class="icon"
          />
        </div>
        <div class="ucptc-material-info">
          <div>
            <span class="ucptc-material-name">{{ materialName(material.item.materialId) }}</span>
            <span
              >{{ formatCount(material.prepared) }} /
              {{ formatCount(material.item.required) }}</span
            >
          </div>
          <v-progress-linear
            :color="material.fulfilled ? 'var(--tgc-od-green)' : 'var(--tgc-od-orange)'"
            :model-value="material.progress"
            height="4"
            rounded
          />
        </div>
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import { computed } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type UcPlanTargetCardProps = {
  canMoveDown: boolean;
  canMoveUp: boolean;
  entry: TGApp.Sqlite.Cultivation.EntryWithItems;
  fulfilled: boolean;
  hasTodayMaterial: boolean;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  priority: number;
  progress: number;
};

type UcPlanTargetCardEmits = {
  edit: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  material: [materialId: number];
  move: [entryId: string, offset: number];
  remove: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  status: [
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
    status: TGApp.Sqlite.Cultivation.EntryStatus,
  ];
};

const props = defineProps<UcPlanTargetCardProps>();
const emits = defineEmits<UcPlanTargetCardEmits>();

function selectMaterial(materialId: number): void {
  emits("material", materialId);
}

type TargetMaterialView = {
  fulfilled: boolean;
  item: TGApp.Sqlite.Cultivation.Item;
  prepared: number;
  progress: number;
};

type TalentLevelView = {
  currentLevel: number;
  id: number;
  label: string;
  name: string;
  targetLevel: number;
};

const TALENT_LABELS = <const>["A", "E", "Q"];

const statusLabel = computed<string>(() => {
  if (props.entry.status === "completed") return "已完成";
  if (props.fulfilled) return "已满足";
  return "进行中";
});
const talentLevels = computed<Array<TalentLevelView>>(() => {
  const currentLevelMap = new Map(
    props.entry.currentState.talents.map((talent) => [talent.id, talent.level]),
  );
  const currentLevelByName = new Map(
    props.entry.currentState.talents.map((talent) => [talent.name, talent.level]),
  );
  return props.entry.targetState.talents.map((talent, index) => ({
    currentLevel: currentLevelMap.get(talent.id) ?? currentLevelByName.get(talent.name) ?? 1,
    id: talent.id,
    label: TALENT_LABELS[index] ?? String(index + 1),
    name: talent.name,
    targetLevel: talent.level,
  }));
});
const materialResultMap = computed<Map<number, TGApp.App.UserCalc.ResultMaterial>>(
  () => new Map(props.materials.map((material) => [material.id, material])),
);
const displayMaterials = computed<Array<TargetMaterialView>>(() =>
  props.entry.items
    .map((item) => {
      const result = materialResultMap.value.get(item.materialId);
      const prepared = result ? Math.min(result.owned + result.craftable, item.required) : 0;
      const ratio = item.required > 0 ? prepared / item.required : 0;
      const progress = ratio * 100;
      return {
        fulfilled: progress >= 100,
        item,
        prepared,
        progress,
      };
    })
    .sort((a, b) => Number(a.fulfilled) - Number(b.fulfilled)),
);

function materialName(materialId: number): string {
  return (
    WikiMaterialData.find((material) => material.id === materialId)?.name ?? `材料 ${materialId}`
  );
}

function materialIcon(materialId: number): string {
  return `/icon/material/${materialId}.webp`;
}

function materialBackground(materialId: number): string {
  const star = WikiMaterialData.find((material) => material.id === materialId)?.star ?? 1;
  return `/icon/bg/${star}-Star.webp`;
}

function formatCount(count: number): string {
  return count.toLocaleString("zh-CN");
}
</script>

<style lang="scss" scoped>
.ucptc-card {
  display: flex;
  overflow: hidden;
  height: calc(100% - 2px);
  min-height: 0;
  flex-direction: column;
  border-color: var(--common-shadow-1);
  background: var(--box-bg-1);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;

  &.today {
    border-color: var(--tgc-od-orange);
    background:
      linear-gradient(
        to right,
        color-mix(in srgb, var(--tgc-od-orange) 16%, transparent),
        transparent 68%
      ),
      var(--box-bg-1);
    box-shadow: inset 3px 0 color-mix(in srgb, var(--tgc-od-orange) 75%, transparent);
  }

  &.completed {
    opacity: 0.48;
  }
}

.ucptc-main {
  display: flex;
  padding: 12px;
  gap: 12px;
}

.ucptc-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.ucptc-name-row,
.ucptc-options,
.ucptc-progress-row,
.ucptc-actions,
.ucptc-action-end,
.ucptc-material {
  display: flex;
  align-items: center;
}

.ucptc-name-row {
  flex-wrap: wrap;
  gap: 6px;
}

.ucptc-options {
  flex-wrap: wrap;
  gap: 4px;
}

.ucptc-name {
  font-family: var(--font-title);
  font-size: 16px;
}

.ucptc-level {
  color: var(--tgc-od-orange);
}

.ucptc-talents,
.ucptc-material,
.ucptc-progress-row span {
  color: var(--common-text-sub);
  font-size: 12px;
}

.ucptc-talents {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.ucptc-talent {
  color: var(--common-text-title);
  white-space: nowrap;
}

.ucptc-progress-row {
  gap: 8px;

  :deep(.v-progress-linear) {
    flex: 1;
  }
}

.ucptc-actions {
  justify-content: flex-end;
  padding: 4px 8px;
  border-top: 1px solid var(--common-shadow-1);
}

.ucptc-materials {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: start;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 6px;
  grid-auto-rows: minmax(44px, min-content);
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  overflow-y: auto;
}

.ucptc-material {
  min-width: 0;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--common-shadow-t-1);
  cursor: pointer;
  gap: 6px;
  transition: opacity 160ms ease;

  &.fulfilled {
    opacity: 0.52;
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
  }
}

.ucptc-material-icon {
  position: relative;
  overflow: hidden;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 4px;

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
    object-fit: contain;
  }

  .background {
    object-fit: cover;
  }
}

.ucptc-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
}

.ucptc-material-name {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
