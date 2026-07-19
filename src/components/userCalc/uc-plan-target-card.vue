<!-- 养成计划-目标卡片 -->
<template>
  <v-card
    :class="{ completed: entry.status === 'completed', fulfilled }"
    class="ucptc-card"
    variant="outlined"
  >
    <div class="ucptc-main">
      <UcItemIcon :alt="entry.name" :icon="entry.icon" :size="64" :star="entry.star" />
      <div class="ucptc-info">
        <div class="ucptc-name-row">
          <span class="ucptc-name">{{ entry.name }}</span>
          <v-chip v-if="entry.status === 'active' && !fulfilled" size="x-small" variant="outlined">
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
        <span v-if="entry.targetState.talents.length > 0" class="ucptc-talents">
          天赋目标 {{ entry.targetState.talents.map((talent) => talent.level).join(" / ") }}
        </span>
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
      <v-btn
        :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="small"
        variant="text"
        @click="expanded = !expanded"
      >
        {{ expanded ? "收起材料" : `查看 ${entry.items.length} 种材料` }}
      </v-btn>
      <div class="ucptc-action-end">
        <template v-if="entry.status === 'active' && !fulfilled">
          <v-btn
            :disabled="!canMoveUp"
            icon="mdi-arrow-up"
            size="small"
            title="提高优先级"
            variant="text"
            @click="emits('move', entry.id, -1)"
          />
          <v-btn
            :disabled="!canMoveDown"
            icon="mdi-arrow-down"
            size="small"
            title="降低优先级"
            variant="text"
            @click="emits('move', entry.id, 1)"
          />
        </template>
        <v-btn
          :title="entry.status === 'completed' ? '恢复目标' : '标记完成'"
          :icon="entry.status === 'completed' ? 'mdi-restore' : 'mdi-check-circle-outline'"
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

    <v-expand-transition>
      <div v-if="expanded" class="ucptc-materials">
        <div
          v-for="material in displayMaterials"
          :key="material.item.materialId"
          :class="{ fulfilled: material.fulfilled }"
          class="ucptc-material"
        >
          <img
            :alt="materialName(material.item.materialId)"
            :src="materialIcon(material.item.materialId)"
          />
          <div class="ucptc-material-info">
            <div>
              <span class="ucptc-material-name">
                {{ materialName(material.item.materialId) }}
              </span>
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
    </v-expand-transition>
  </v-card>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import { computed, ref } from "vue";

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
  move: [entryId: string, offset: number];
  remove: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  status: [
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
    status: TGApp.Sqlite.Cultivation.EntryStatus,
  ];
};

const props = defineProps<UcPlanTargetCardProps>();
const emits = defineEmits<UcPlanTargetCardEmits>();
const expanded = ref<boolean>(true);

type TargetMaterialView = {
  fulfilled: boolean;
  item: TGApp.Sqlite.Cultivation.Item;
  prepared: number;
  progress: number;
};

const statusLabel = computed<string>(() => {
  if (props.entry.status === "completed") return "已完成";
  if (props.fulfilled) return "材料已满足";
  return props.entry.type === "avatar" ? "角色" : "武器";
});
const materialResultMap = computed<Map<number, TGApp.App.UserCalc.ResultMaterial>>(
  () => new Map(props.materials.map((material) => [material.id, material])),
);
const displayMaterials = computed<Array<TargetMaterialView>>(() =>
  props.entry.items
    .map((item) => {
      const result = materialResultMap.value.get(item.materialId);
      const ratio = result?.required
        ? Math.min((result.owned + result.craftable) / result.required, 1)
        : 0;
      const progress = ratio * 100;
      return {
        fulfilled: progress >= 100,
        item,
        prepared: Math.floor(item.required * ratio),
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

function formatCount(count: number): string {
  return count.toLocaleString("zh-CN");
}
</script>

<style lang="scss" scoped>
.ucptc-card {
  border-color: var(--common-shadow-1);
  background: var(--box-bg-1);
  transition: opacity 160ms ease;

  &.fulfilled {
    opacity: 0.62;
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

.ucptc-progress-row {
  gap: 8px;

  :deep(.v-progress-linear) {
    flex: 1;
  }
}

.ucptc-actions {
  justify-content: space-between;
  padding: 4px 8px;
  border-top: 1px solid var(--common-shadow-1);
}

.ucptc-materials {
  display: grid;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 6px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.ucptc-material {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--common-shadow-t-1);
  gap: 6px;
  transition: opacity 160ms ease;

  &.fulfilled {
    opacity: 0.52;
  }

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
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
