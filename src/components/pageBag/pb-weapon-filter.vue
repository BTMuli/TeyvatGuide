<!-- 武器筛选浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="pbwf-container">
      <div class="pbwf-tabs">
        <v-btn
          v-for="tab in tabs"
          :key="tab.key"
          :active="activeTab === tab.key"
          activeColor="blue"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </v-btn>
      </div>
      <div class="pbwf-content">
        <!-- 基础筛选 -->
        <div v-show="activeTab === 'basic'" class="pbwf-section">
          <div class="pbwf-item">
            <div class="pbwf-title">星级</div>
            <v-item-group v-model="selectedStar" class="pbwf-select" multiple>
              <div v-for="item in starList" :key="item.value">
                <v-item v-slot="{ isSelected, toggle }" :value="item.value">
                  <v-btn :active="isSelected" activeColor="blue" size="small" @click="toggle">
                    <v-icon>{{ isSelected ? "mdi-star" : "mdi-star-outline" }}</v-icon>
                    <span>{{ item.text }}</span>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
          <div class="pbwf-item">
            <div class="pbwf-title">武器类型</div>
            <v-item-group v-model="selectedWeaponType" class="pbwf-select" multiple>
              <div v-for="item in weaponTypeList" :key="item.value">
                <v-item v-slot="{ isSelected, toggle }" :value="item.value">
                  <v-btn
                    :active="isSelected"
                    :title="item.text"
                    activeColor="blue"
                    size="small"
                    @click="toggle"
                  >
                    <img
                      :alt="item.text"
                      :src="`/icon/weapon/${item.value}.webp`"
                      class="pbwf-icon"
                    />
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
          <div class="pbwf-item">
            <div class="pbwf-title">精炼等级</div>
            <v-item-group v-model="selectedRefine" class="pbwf-select" multiple>
              <div v-for="item in refineList" :key="item.value">
                <v-item v-slot="{ isSelected, toggle }" :value="item.value">
                  <v-btn :active="isSelected" activeColor="blue" size="small" @click="toggle">
                    <span>{{ item.text }}</span>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
          <div class="pbwf-item">
            <div class="pbwf-title">状态</div>
            <v-item-group v-model="selectedStatus" class="pbwf-select" multiple>
              <div v-for="item in statusList" :key="item.key">
                <v-item v-slot="{ isSelected, toggle }" :value="item.key">
                  <v-btn
                    :active="isSelected"
                    :title="item.label"
                    activeColor="blue"
                    size="small"
                    @click="toggle"
                  >
                    <v-icon>{{ item.icon }}</v-icon>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
        </div>
        <!-- 副词条筛选 -->
        <div v-show="activeTab === 'subProp'" class="pbwf-section">
          <div class="pbwf-item">
            <v-item-group v-model="selectedSubProp" class="pbwf-select" multiple>
              <div v-for="item in subPropList" :key="item.id">
                <v-item v-slot="{ isSelected, toggle }" :value="item.id">
                  <v-btn
                    :active="isSelected"
                    activeColor="blue"
                    class="pbwf-pm-btn"
                    size="small"
                    @click="toggle"
                  >
                    <img v-if="item.icon !== ''" :src="item.icon" alt="icon" />
                    <span>{{ item.name }}</span>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
        </div>
      </div>
      <div class="pbwf-submit">
        <v-btn variant="tonal" @click="resetFilter">重置</v-btn>
        <v-btn @click="confirmSelect">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import { ref, watch } from "vue";
import { AppPropMapData, wwWeapon } from "@/data/index.js";

export type WeaponFilterValue = {
  star: Array<number>;
  weaponType: Array<string>;
  refine: Array<number>;
  subProp: Array<number>;
  locked: boolean | null;
};

type PbWeaponFilterEmits = (e: "filter", v: WeaponFilterValue) => void;

const emits = defineEmits<PbWeaponFilterEmits>();

const tabs = [
  { key: "basic", label: "基础筛选" },
  { key: "subProp", label: "副词条筛选" },
];

const starList = [
  { text: "1星", value: 1 },
  { text: "2星", value: 2 },
  { text: "3星", value: 3 },
  { text: "4星", value: 4 },
  { text: "5星", value: 5 },
];

const weaponTypeList = [
  { text: "单手剑", value: "单手剑" },
  { text: "双手剑", value: "双手剑" },
  { text: "长柄武器", value: "长柄武器" },
  { text: "法器", value: "法器" },
  { text: "弓", value: "弓" },
];

const refineList = [
  { text: "1精", value: 1 },
  { text: "2精", value: 2 },
  { text: "3精", value: 3 },
  { text: "4精", value: 4 },
  { text: "5精", value: 5 },
];

const statusList = [{ key: "locked", label: "锁定", icon: "mdi-lock" }];

const subPropList = (() => {
  const propSet = new Set<number>();
  for (const weapon of wwWeapon) {
    if (weapon.curves) {
      for (const curve of weapon.curves) {
        if (curve.curve !== 1101) propSet.add(curve.prop);
      }
    }
  }
  return Array.from(propSet).map((propId) => {
    const propInfo = AppPropMapData[propId];
    return {
      id: propId,
      name: propInfo ? propInfo.filter_name : `属性${propId}`,
      icon: propInfo.icon,
    };
  });
})();

const activeTab = ref<string>("basic");
const selectedStar = ref<Array<number>>([]);
const selectedWeaponType = ref<Array<string>>([]);
const selectedRefine = ref<Array<number>>([]);
const selectedSubProp = ref<Array<number>>([]);
const selectedStatus = ref<Array<string>>([]);

const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      selectedStar.value = [];
      selectedWeaponType.value = [];
      selectedRefine.value = [];
      selectedSubProp.value = [];
      selectedStatus.value = [];
      resetModel.value = false;
    }
  },
);

function resetFilter(): void {
  selectedStar.value = [];
  selectedWeaponType.value = [];
  selectedRefine.value = [];
  selectedSubProp.value = [];
  selectedStatus.value = [];
  confirmSelect();
}

function confirmSelect(): void {
  const value: WeaponFilterValue = {
    star: selectedStar.value,
    weaponType: selectedWeaponType.value,
    refine: selectedRefine.value,
    subProp: selectedSubProp.value,
    locked: selectedStatus.value.includes("locked") ? true : null,
  };
  emits("filter", value);
  visible.value = false;
}
</script>
<style lang="css" scoped>
.pbwf-container {
  display: flex;
  width: 500px;
  max-height: 600px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--box-bg-1);
  row-gap: 8px;
}

.pbwf-tabs {
  display: flex;
  width: 100%;
  font-family: var(--font-title);
  gap: 8px;
}

.pbwf-content {
  width: 100%;
  max-height: 450px;
  overflow-y: auto;
}

.pbwf-section {
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 8px;
}

.pbwf-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.pbwf-title {
  color: var(--common-text-title);
  font-size: 16px;
  white-space: nowrap;
}

.pbwf-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pbwf-icon {
  width: 24px;
  height: 24px;
  filter: invert(0.5);

  .dark & {
    filter: unset;
  }
}

.pbwf-pm-btn {
  img {
    width: 16px;
    height: 16px;
    margin-right: 2px;
    filter: invert(0.5);
  }

  .dark & {
    img {
      filter: unset;
    }
  }
}

.pbwf-submit {
  display: flex;
  padding-top: 8px;
  margin-left: auto;
  gap: 12px;
}
</style>
