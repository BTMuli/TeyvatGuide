<!-- 首页养成计划摘要 -->
<template>
  <section class="phc-section">
    <div v-if="project" class="phc-box">
      <div class="phc-overview">
        <div v-if="todayMaterials.length > 0" class="phc-today">
          <v-icon size="18">mdi-calendar-today</v-icon>
          <strong>今日可刷</strong>
          <span>{{ todayMaterials.map((material) => material.name).join("、") }}</span>
        </div>
        <div class="phc-actions">
          <div class="phc-stats">
            <div class="phc-stat active">
              <strong>{{ activeEntries.length }}</strong>
              <span>进行中</span>
            </div>
            <div :class="{ warning: missingKinds > 0 }" class="phc-stat materials">
              <strong>{{ missingKinds }}</strong>
              <span>{{ missingKinds > 0 ? "材料不足" : "材料齐备" }}</span>
            </div>
          </div>
          <v-btn append-icon="mdi-arrow-right" size="small" variant="text" @click="openPlan">
            查看详情
          </v-btn>
        </div>
      </div>
      <div v-if="activeEntries.length > 0" class="phc-targets">
        <div
          v-for="entry in activeEntries.slice(0, 5)"
          :key="entry.id"
          class="phc-target"
          role="button"
          tabindex="0"
          title="查看养成目标"
          @click="emits('target-click', entry)"
          @keydown.enter.prevent="emits('target-click', entry)"
          @keydown.space.prevent="emits('target-click', entry)"
        >
          <div class="phc-target-icon">
            <img :alt="entry.name" :src="entry.icon" />
          </div>
          <div class="phc-target-info">
            <span>{{ entry.name }}</span>
            <small>
              Lv.{{ entry.currentState.level }}
              <v-icon size="12">mdi-arrow-right</v-icon>
              Lv.{{ entry.targetState.level }}
            </small>
          </div>
          <div
            v-if="getMissingMaterials(entry).length > 0"
            class="phc-target-materials"
            title="缺失材料"
          >
            <img
              v-for="material in getMissingMaterials(entry).slice(0, 4)"
              :key="material.id"
              :alt="material.name"
              :src="`/icon/material/${material.id}.webp`"
              :title="`${material.name}：缺少 ${material.missing.toLocaleString('zh-CN')}`"
            />
            <span v-if="getMissingMaterials(entry).length > 4">
              +{{ getMissingMaterials(entry).length - 4 }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="phc-empty compact">
        <v-icon size="32">mdi-check-circle-outline</v-icon>
        <span>当前计划没有进行中的目标</span>
      </div>
    </div>
    <div v-else class="phc-empty">
      <v-icon size="40">mdi-clipboard-plus-outline</v-icon>
      <span>尚未创建养成计划</span>
      <v-btn color="var(--tgc-od-orange)" size="small" variant="tonal" @click="openPlan">
        前往创建
      </v-btn>
    </div>
  </section>
</template>

<script lang="ts" setup>
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useUserStore from "@store/user.js";
import {
  aggregateEntryMaterials,
  buildCultivationResults,
  getServerDay,
  isMaterialAvailableToday,
} from "@utils/cultivationPlan.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";

type PhCompCultivationEmits = {
  (
    event: "data-loaded",
    project: TGApp.Sqlite.Cultivation.Project | undefined,
    entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>,
    materials: Array<TGApp.App.UserCalc.ResultMaterial>,
  ): void;
  (event: "success"): void;
  (event: "target-click", entry: TGApp.Sqlite.Cultivation.EntryWithItems): void;
};

const emits = defineEmits<PhCompCultivationEmits>();
const router = useRouter();
const { account } = storeToRefs(useUserStore());
const project = shallowRef<TGApp.Sqlite.Cultivation.Project>();
const entries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const resultMaterials = shallowRef<Array<TGApp.App.UserCalc.ResultMaterial>>([]);

const activeEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() =>
  entries.value.filter((entry) => entry.status === "active"),
);
const missingKinds = computed<number>(
  () => resultMaterials.value.filter((material) => material.missing > 0).length,
);
const missingMaterialMap = computed<Map<number, TGApp.App.UserCalc.ResultMaterial>>(
  () =>
    new Map(
      resultMaterials.value
        .filter((material) => material.missing > 0)
        .map((material) => [material.id, material]),
    ),
);
const todayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() => {
  if (!project.value) return [];
  const serverDay = getServerDay(project.value.timezone);
  return resultMaterials.value.filter(
    (material) =>
      material.missing > 0 && isMaterialAvailableToday(material.id, serverDay, WikiMaterialData),
  );
});

onMounted(async () => {
  try {
    const projects = await TSCultivationPlan.getChosenProjects();
    const loginUid = Number(account.value.gameUid);
    project.value =
      projects.find((item) => item.uid === loginUid) ??
      projects.sort((a, b) => b.updated.localeCompare(a.updated))[0];
    if (!project.value) return;
    const [entryData, bagData] = await Promise.all([
      TSCultivationPlan.getEntries(project.value.id),
      TSUserBagMaterial.getMaterial(project.value.uid),
    ]);
    entries.value = entryData;
    resultMaterials.value = buildCultivationResults(
      aggregateEntryMaterials(entryData),
      new Map(bagData.map((material) => [material.id, material.count])),
      WikiMaterialData,
      true,
      false,
      false,
    );
  } finally {
    emits("data-loaded", project.value, entries.value, resultMaterials.value);
    emits("success");
  }
});

async function openPlan(): Promise<void> {
  await router.push("/user/cultivation");
}

function getMissingMaterials(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  return entry.items
    .map((item) => missingMaterialMap.value.get(item.materialId))
    .filter((material): material is TGApp.App.UserCalc.ResultMaterial => material !== undefined);
}
</script>

<style lang="scss" scoped>
.phc-box,
.phc-overview,
.phc-actions,
.phc-stats,
.phc-stat,
.phc-target,
.phc-target-info,
.phc-today {
  display: flex;
}

.phc-section {
  min-height: 208px;
}

.phc-actions {
  flex: none;
  align-items: center;
  gap: 8px;
}

.phc-box,
.phc-stat,
.phc-target-info {
  flex-direction: column;
}

.phc-box {
  gap: 14px;
}

.phc-overview {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.phc-target small,
.phc-empty {
  color: var(--common-text-sub);
}

.phc-stats {
  flex: none;
  gap: 8px;
}

.phc-stat {
  min-width: 76px;
  align-items: flex-end;
  padding: 6px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);

  strong {
    color: var(--tgc-od-green);
    font-family: var(--font-title);
    font-size: 18px;
    line-height: 20px;
  }

  span {
    color: var(--common-text-sub);
    font-size: 12px;
  }

  &.active strong,
  &.warning strong {
    color: var(--tgc-od-orange);
  }
}

.phc-targets {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.phc-target {
  min-width: 0;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--tgc-od-blue) 30%, var(--common-shadow-1));
  border-radius: 8px;
  background: color-mix(in srgb, var(--tgc-od-blue) 8%, var(--box-bg-1));
  cursor: pointer;
  gap: 10px;

  &:focus-visible,
  &:hover {
    border-color: var(--tgc-od-orange);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--tgc-od-orange) 45%, transparent);
  }
}

.phc-target-materials {
  display: flex;
  min-width: 0;
  flex: none;
  align-items: center;
  margin-left: auto;
  gap: 3px;

  img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--common-shadow-t-2);
    object-fit: contain;
  }

  span {
    color: var(--tgc-od-red);
    font-family: var(--font-title);
    font-size: 12px;
  }
}

.phc-target-icon {
  display: grid;
  overflow: hidden;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 8px;
  background: var(--common-shadow-1);
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.phc-target-info {
  min-width: 0;

  > span {
    overflow: hidden;
    font-family: var(--font-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: flex;
    align-items: center;
    gap: 3px;
  }
}

.phc-empty {
  display: flex;
  min-height: 112px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &.compact {
    min-height: 72px;
    flex-direction: row;
  }
}

.phc-today {
  min-width: 0;
  flex: 1;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--tgc-od-orange) 10%, transparent);
  color: var(--tgc-od-orange);
  gap: 8px;

  span {
    overflow: hidden;
    color: var(--app-page-content);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (width <= 600px) {
  .phc-overview {
    flex-direction: column;
    align-items: stretch;
  }

  .phc-stats,
  .phc-stat {
    flex: 1;
  }

  .phc-stat {
    align-items: flex-start;
  }
}
</style>
