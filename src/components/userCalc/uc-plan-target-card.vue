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
      <div class="ucptc-heading">
        <UcItemIcon
          :alt="entry.name"
          :icon="entry.icon"
          :primaryBadge="weaponBadge"
          :size="64"
          :star="entry.star"
        />
        <div class="ucptc-info">
          <div class="ucptc-name-row">
            <span class="ucptc-name">{{ entry.name }}</span>
            <span v-if="entry.status === 'active'" class="ucptc-priority">
              <span>优先级</span>
              <strong>{{ priority }}</strong>
            </span>
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
        </div>
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
          height="8"
          rounded
        />
        <span>{{ progress.toFixed(0) }}%</span>
      </div>
    </div>

    <div class="ucptc-actions">
      <div v-if="entry.status === 'active'" class="ucptc-action-priority">
        <v-btn
          :disabled="!canMoveUp"
          aria-label="置顶养成目标"
          icon="mdi-page-first"
          size="small"
          title="置顶"
          variant="text"
          @click="emits('move', entry.id, 'top')"
        />
        <v-btn
          :disabled="!canMoveUp"
          aria-label="提高养成目标优先级"
          icon="mdi-arrow-left"
          size="small"
          title="提高优先级"
          variant="text"
          @click="emits('move', entry.id, -1)"
        />
        <v-btn
          :disabled="!canMoveDown"
          aria-label="降低养成目标优先级"
          icon="mdi-arrow-right"
          size="small"
          title="降低优先级"
          variant="text"
          @click="emits('move', entry.id, 1)"
        />
        <v-btn
          :disabled="!canMoveDown"
          aria-label="置底养成目标"
          icon="mdi-page-last"
          size="small"
          title="置底"
          variant="text"
          @click="emits('move', entry.id, 'bottom')"
        />
      </div>
      <div class="ucptc-action-end">
        <v-btn
          aria-label="查看养成目标汇总"
          icon="mdi-chart-box-outline"
          size="small"
          title="查看汇总"
          variant="text"
          @click="emits('summary', entry)"
        />
        <v-btn
          :aria-label="entry.status === 'completed' ? '恢复养成目标' : '标记养成目标完成'"
          :icon="entry.status === 'completed' ? 'mdi-restore' : 'mdi-check-circle-outline'"
          :title="entry.status === 'completed' ? '恢复目标' : '标记完成'"
          size="small"
          variant="text"
          @click="emits('status', entry, entry.status === 'completed' ? 'active' : 'completed')"
        />
        <v-btn
          aria-label="编辑养成目标"
          icon="mdi-pencil-outline"
          size="small"
          title="编辑目标"
          variant="text"
          @click="emits('edit', entry)"
        />
        <v-btn
          aria-label="删除养成目标"
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
      <UcMaterialReq
        v-for="material in displayMaterials"
        :key="material.id"
        :material
        weakenReady
        @pointerdown.stop
        @select="selectMaterial(material.id)"
      />
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import { computed } from "vue";

import { AppCharacterData, AppWeaponData, WikiMaterialData } from "@/data/index.js";

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
  move: [entryId: string, position: -1 | 1 | "bottom" | "top"];
  remove: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  summary: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
  status: [
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
    status: TGApp.Sqlite.Cultivation.EntryStatus,
  ];
};

const props = defineProps<UcPlanTargetCardProps>();
const emits = defineEmits<UcPlanTargetCardEmits>();

const weaponBadge = computed<string | undefined>(() => {
  const items = props.entry.type === "avatar" ? AppCharacterData : AppWeaponData;
  const weapon = items.find((item) => item.id === props.entry.itemId)?.weapon;
  return weapon ? `/icon/weapon/${weapon}.webp` : undefined;
});

function selectMaterial(materialId: number): void {
  emits("material", materialId);
}

const TALENT_LABELS = <const>["A", "E", "Q"];

const statusLabel = computed<string>(() => {
  if (props.entry.status === "completed") return "已完成";
  if (props.fulfilled) return "已满足";
  return "进行中";
});
const talentLevels = computed<Array<TGApp.App.UserCalc.TalentLevelView>>(() => {
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
const displayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  (props.materials.length > 0
    ? [...props.materials]
    : props.entry.items.map((item) => {
        const wiki = WikiMaterialData.find((material) => material.id === item.materialId);
        return {
          id: item.materialId,
          name: wiki?.name ?? `材料 ${item.materialId}`,
          type: wiki?.type ?? "未知类型",
          star: wiki?.star ?? 1,
          required: item.required,
          owned: 0,
          craftable: 0,
          craftingCosts: [],
          missing: item.required,
          progress: 0,
        };
      })
  ).sort((a, b) => Number(a.missing === 0) - Number(b.missing === 0)),
);
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
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}

.ucptc-heading {
  display: flex;
  gap: 12px;
}

.ucptc-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
}

.ucptc-name-row,
.ucptc-options,
.ucptc-progress-row,
.ucptc-actions,
.ucptc-action-priority,
.ucptc-action-end {
  display: flex;
  align-items: center;
}

.ucptc-name-row {
  flex-wrap: wrap;
  gap: 8px;
}

.ucptc-priority {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--common-shadow-t-1);
  color: var(--common-text-sub);
  font-size: 10px;
  gap: 2px;
  line-height: 16px;
  white-space: nowrap;

  strong {
    color: var(--tgc-od-orange);
    font-family: var(--font-title);
    font-variant-numeric: tabular-nums;
  }
}

.ucptc-options {
  min-width: 0;
  gap: 4px;
  overflow-x: auto;

  > :deep(.v-chip) {
    flex-shrink: 0;
  }
}

.ucptc-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 24px;
}

.ucptc-level {
  color: var(--tgc-od-orange);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
}

.ucptc-talents,
.ucptc-progress-row span {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucptc-talents {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.ucptc-talent {
  color: var(--common-text-sub);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ucptc-progress-row {
  margin-top: -4px;
  margin-bottom: -4px;
  gap: 8px;

  :deep(.v-progress-linear) {
    flex: 1;
  }
}

.ucptc-actions {
  justify-content: space-between;
  padding: 4px 8px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 4px;
}

.ucptc-action-priority,
.ucptc-action-end {
  min-width: 0;
}

.ucptc-action-end {
  margin-left: auto;
}

.ucptc-materials {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: stretch;
  padding: 8px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
  overflow-x: auto;

  > :deep(.ucmr-item) {
    flex-shrink: 0;
  }
}
</style>
