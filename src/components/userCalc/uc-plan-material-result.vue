<!-- 养成计划-材料汇总 -->
<template>
  <div class="ucpm-box">
    <div class="ucpm-toolbar">
      <div>
        <span class="ucpm-title">材料汇总</span>
        <span class="ucpm-subtitle">未完成目标共 {{ materials.length }} 种材料</span>
      </div>
      <v-btn-toggle
        v-model="filter"
        color="var(--tgc-od-orange)"
        density="compact"
        mandatory
        variant="outlined"
      >
        <v-btn value="all">全部</v-btn>
        <v-btn value="missing">不足</v-btn>
        <v-btn value="today">今日可刷</v-btn>
        <v-btn value="ready">已满足</v-btn>
      </v-btn-toggle>
    </div>
    <UcMaterialResult
      v-model:allow-crafting="allowCrafting"
      v-model:use-dust="useDust"
      :bag-materials="bagMaterials"
      :empty-text="emptyText"
      :materials="filteredMaterials"
      :missing-kinds="missingKinds"
      :uid
      :weaken-ready="true"
    />
  </div>
</template>

<script lang="ts" setup>
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import { computed, ref } from "vue";

import { WikiMaterialData } from "@/data/index.js";
import { getServerDay, isMaterialAvailableToday } from "@utils/cultivationPlan.js";

type MaterialFilter = "all" | "missing" | "ready" | "today";

type UcPlanMaterialResultProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  timezone: number;
  uid: number;
};

const props = defineProps<UcPlanMaterialResultProps>();
const allowCrafting = defineModel<boolean>("allowCrafting", { required: true });
const useDust = defineModel<boolean>("useDust", { required: true });
const filter = ref<MaterialFilter>("all");

const filteredMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() => {
  const serverDay = getServerDay(props.timezone);
  let materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  switch (filter.value) {
    case "missing":
      materials = props.materials.filter((material) => material.missing > 0);
      break;
    case "ready":
      materials = props.materials.filter((material) => material.missing === 0);
      break;
    case "today":
      materials = props.materials.filter((material) =>
        isMaterialAvailableToday(material.id, serverDay, WikiMaterialData),
      );
      break;
    default:
      materials = [...props.materials];
  }
  return materials.sort((a, b) => Number(a.missing === 0) - Number(b.missing === 0));
});
const missingKinds = computed<number>(
  () => filteredMaterials.value.filter((material) => material.missing > 0).length,
);
const emptyText = computed<string>(() => {
  if (props.materials.length === 0) return "当前计划没有进行中的养成目标";
  switch (filter.value) {
    case "missing":
      return "当前计划的材料均已满足";
    case "ready":
      return "当前计划还没有已满足的材料";
    case "today":
      return "今天没有轮换秘境材料需要刷取";
    default:
      return "当前计划没有材料需求";
  }
});
</script>

<style lang="scss" scoped>
.ucpm-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ucpm-toolbar,
.ucpm-toolbar > div {
  display: flex;
  align-items: center;
}

.ucpm-toolbar {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.ucpm-toolbar > div {
  gap: 8px;
}

.ucpm-title {
  font-family: var(--font-title);
  font-size: 18px;
}

.ucpm-subtitle {
  color: var(--common-text-sub);
  font-size: 12px;
}

@media (width <= 600px) {
  .ucpm-toolbar > div {
    width: 100%;
    justify-content: space-between;
  }

  :deep(.v-btn-toggle) {
    width: 100%;

    .v-btn {
      flex: 1;
    }
  }
}
</style>
