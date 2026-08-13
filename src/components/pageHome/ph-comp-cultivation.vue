<!-- 首页养成计划摘要 -->
<template>
  <section class="phc-section">
    <div v-if="project" class="phc-box">
      <div class="phc-overview">
        <div v-if="todayMaterials.length > 0" class="phc-today">
          <v-icon size="18">mdi-calendar-today</v-icon>
          <strong>今日可刷</strong>
          <div class="phc-today-materials">
            <div v-for="material in todayMaterials" :key="material.id" class="phc-today-material">
              <UcItemIcon
                :alt="material.name"
                :icon="`/icon/material/${material.id}.webp`"
                :size="28"
                :star="material.star"
              />
              <strong class="phc-today-material-name">{{ material.name }}</strong>
            </div>
          </div>
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
        <PhCompCultivationTarget
          v-for="entry in activeEntries"
          :key="entry.id"
          :entry
          :has-today-material="hasTodayMaterial(entry)"
          :missing-materials="getMissingMaterials(entry)"
          :uid="project.uid"
          @target-click="emits('target-click', $event)"
        />
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
import PhCompCultivationTarget from "@comp/pageHome/ph-comp-cultivation-target.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useUserStore from "@store/user.js";
import {
  allocatePlanMaterials,
  getServerDay,
  isMaterialAvailableToday,
  mergePlanInventory,
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
    displayEntries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>,
    entryMaterials: ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>,
  ): void;
  (event: "success"): void;
  (event: "target-click", entry: TGApp.Sqlite.Cultivation.EntryWithItems): void;
};

const emits = defineEmits<PhCompCultivationEmits>();
const router = useRouter();
const { account } = storeToRefs(useUserStore());
const project = shallowRef<TGApp.Sqlite.Cultivation.Project>();
const entries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const inventory = shallowRef<ReadonlyMap<number, number>>(new Map());
const bagMaterials = shallowRef<ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>>(new Map());
const planInventory = computed<ReadonlyMap<number, number>>(() =>
  mergePlanInventory(inventory.value, bagMaterials.value, entries.value),
);
const allocation = computed(() =>
  allocatePlanMaterials(entries.value, planInventory.value, WikiMaterialData),
);
const resultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(
  () => allocation.value.materials,
);

const missingKinds = computed<number>(
  () => resultMaterials.value.filter((material) => material.missing > 0).length,
);
const entryMaterialResults = computed<Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>>(
  () => allocation.value.entries,
);
const todayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() => {
  if (!project.value) return [];
  const serverDay = getServerDay(project.value.timezone);
  return resultMaterials.value.filter(
    (material) =>
      material.missing > 0 && isMaterialAvailableToday(material.id, serverDay, WikiMaterialData),
  );
});
const activeEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() =>
  entries.value.filter((entry) => entry.status === "active").sort(compareEntries),
);

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
    bagMaterials.value = new Map(bagData.map((material) => [material.id, material]));
    inventory.value = new Map(bagData.map((material) => [material.id, material.count]));
  } finally {
    emits(
      "data-loaded",
      project.value,
      entries.value,
      activeEntries.value,
      entryMaterialResults.value,
    );
    emits("success");
  }
});

async function openPlan(): Promise<void> {
  await router.push("/user/cultivation");
}

function getMissingMaterials(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  return (entryMaterialResults.value.get(entry.id) ?? []).filter(
    (material) => material.missing > 0,
  );
}

function hasTodayMaterial(entry: TGApp.Sqlite.Cultivation.EntryWithItems): boolean {
  if (!project.value) return false;
  const serverDay = getServerDay(project.value.timezone);
  return entry.items.some(
    (item) =>
      (entryMaterialResults.value.get(entry.id)?.find((material) => material.id === item.materialId)
        ?.missing ?? 0) > 0 &&
      isMaterialAvailableToday(item.materialId, serverDay, WikiMaterialData),
  );
}

function compareEntries(
  a: TGApp.Sqlite.Cultivation.EntryWithItems,
  b: TGApp.Sqlite.Cultivation.EntryWithItems,
): number {
  const aFulfilled = getMissingMaterials(a).length === 0;
  const bFulfilled = getMissingMaterials(b).length === 0;
  const fulfilledDiff = Number(aFulfilled) - Number(bFulfilled);
  if (fulfilledDiff !== 0) return fulfilledDiff;
  if (!aFulfilled) {
    const todayDiff = Number(hasTodayMaterial(b)) - Number(hasTodayMaterial(a));
    if (todayDiff !== 0) return todayDiff;
  }
  return a.sortOrder - b.sortOrder;
}
</script>

<style lang="scss" scoped>
.phc-box,
.phc-overview,
.phc-actions,
.phc-stats,
.phc-stat,
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
.phc-stat {
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.phc-today {
  min-width: 0;
  flex: 1;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  color: var(--tgc-od-orange);
  gap: 8px;
}

.phc-today-materials,
.phc-today-material {
  display: flex;
  align-items: center;
}

.phc-today-materials {
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.phc-today-material {
  gap: 4px;
}

.phc-today-material-name {
  color: var(--app-page-content);
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: normal;
  white-space: nowrap;
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

  .phc-targets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 420px) {
  .phc-targets {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
