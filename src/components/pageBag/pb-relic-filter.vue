<!-- 圣遗物筛选浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="pbrf-container">
      <div class="pbrf-tabs">
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
      <div class="pbrf-content">
        <!-- 基础筛选 -->
        <div v-show="activeTab === 'basic'" class="pbrf-section">
          <div class="pbrf-item">
            <div class="pbrf-title">部位</div>
            <v-item-group v-model="selectedSlot" class="pbrf-select" multiple>
              <div v-for="item in slotList" :key="item.value">
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
                      :src="`/icon/relic/${item.value}.webp`"
                      class="pbrf-icon"
                    />
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
          <div class="pbrf-item">
            <div class="pbrf-title">星级</div>
            <v-item-group v-model="selectedStar" class="pbrf-select" multiple>
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
          <div class="pbrf-item">
            <div class="pbrf-title">状态</div>
            <v-item-group v-model="selectedStatus" class="pbrf-select" multiple>
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
          <div class="pbrf-item">
            <div class="pbrf-title">强化等级</div>
            <v-item-group v-model="selectedGrade" class="pbrf-select" multiple>
              <div v-for="item in gradeList" :key="item.key">
                <v-item v-slot="{ isSelected, toggle }" :value="item.key">
                  <v-btn :active="isSelected" activeColor="blue" size="small" @click="toggle">
                    <span>{{ item.label }}</span>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
        </div>
        <!-- 套装筛选 -->
        <div v-show="activeTab === 'set'" class="pbrf-section">
          <div class="pbrf-item">
            <v-item-group v-model="selectedSet" class="pbrf-select-set" multiple>
              <div v-for="item in setList" :key="item.id">
                <v-item v-slot="{ isSelected, toggle }" :value="item.id">
                  <v-btn
                    :active="isSelected"
                    activeColor="blue"
                    class="pbrf-set-btn"
                    @click="toggle"
                  >
                    <div class="pbrf-set-left">
                      <img :src="`/icon/bg/${item.maxStar}-Star.webp`" alt="bg" class="bg" />
                      <img :src="`/WIKI/relic/${item.icon}.webp`" alt="icon" class="icon" />
                    </div>
                    <span class="pbrf-set-name">{{ item.name }}</span>
                  </v-btn>
                </v-item>
              </div>
            </v-item-group>
          </div>
        </div>
        <!-- 主词条筛选 -->
        <div v-show="activeTab === 'mainProp'" class="pbrf-section">
          <div v-for="group in mainPropGroups" :key="group.key" class="pbrf-mp-group">
            <div class="pbrf-mp-group-title">
              <img
                :alt="group.label"
                :src="`/icon/relic/${group.slot}.webp`"
                class="pbrf-mp-group-icon"
              />
              <span>{{ group.label }}</span>
            </div>
            <v-item-group v-model="selectedMainProp" class="pbrf-select" multiple>
              <div v-for="item in group.items" :key="item.id">
                <v-item v-slot="{ isSelected, toggle }" :value="item.id">
                  <v-btn
                    :active="isSelected"
                    activeColor="blue"
                    class="pbrf-pm-btn"
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
        <!-- 副词条筛选 -->
        <div v-show="activeTab === 'subProp'" class="pbrf-section">
          <div class="pbrf-item">
            <div class="pbrf-title">符合词条数</div>
            <div class="pbrf-sub-prop-count">
              <v-btn size="small" @click="decreaseSubPropCount">
                <v-icon>mdi-minus</v-icon>
              </v-btn>
              <span class="pbrf-sub-prop-count-value">{{ subPropMatchCount }}</span>
              <v-btn size="small" @click="increaseSubPropCount">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </div>
          </div>
          <div class="pbrf-item">
            <v-item-group v-model="selectedSubProp" class="pbrf-select" multiple>
              <div v-for="item in subPropList" :key="item.id">
                <v-item v-slot="{ isSelected, toggle }" :value="item.id">
                  <v-btn
                    :active="isSelected"
                    activeColor="blue"
                    class="pbrf-pm-btn"
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
      <div class="pbrf-submit">
        <v-btn variant="tonal" @click="resetFilter">重置</v-btn>
        <v-btn @click="confirmSelect">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import { ref, watch } from "vue";
import { AppPropMapData, wrSet } from "@/data/index.js";

export type RelicFilterValue = {
  slot: Array<number>;
  star: Array<number>;
  set: Array<number>;
  mainProp: Array<number>;
  subProp: Array<number>;
  subPropMatchCount: number;
  locked: boolean | null;
  marked: boolean | null;
  grade: Array<string>;
};

type PbRelicFilterEmits = (e: "filter", v: RelicFilterValue) => void;

const emits = defineEmits<PbRelicFilterEmits>();

const tabs = [
  { key: "basic", label: "基础筛选" },
  { key: "set", label: "套装筛选" },
  { key: "mainProp", label: "主词条筛选" },
  { key: "subProp", label: "副词条筛选" },
];

const slotList = [
  { text: "生之花", value: 1 },
  { text: "死之羽", value: 2 },
  { text: "时之沙", value: 3 },
  { text: "空之杯", value: 4 },
  { text: "理之冠", value: 5 },
];

const starList = [
  { text: "1星", value: 1 },
  { text: "2星", value: 2 },
  { text: "3星", value: 3 },
  { text: "4星", value: 4 },
  { text: "5星", value: 5 },
];

const statusList = [
  { key: "locked", label: "锁定", icon: "mdi-lock" },
  { key: "marked", label: "星标", icon: "mdi-star" },
];

const gradeList = [
  { key: "init3", label: "初始3词条" },
  { key: "init4", label: "初始4词条" },
  { key: "enhance5", label: "强化5次" },
  { key: "enhance4", label: "强化4次" },
];

const setList = wrSet
  .sort((a, b) => b.maxStar - a.maxStar || b.id - a.id)
  .map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    maxStar: s.maxStar,
  }));

const sandMainProps = [6, 9, 3, 28, 23];
const gobletMainProps = [6, 9, 3, 28, 30, 40, 41, 42, 43, 44, 45, 46];
const circletMainProps = [6, 9, 3, 28, 20, 22, 26];

const subPropTypes = [2, 3, 5, 6, 8, 9, 20, 22, 23, 28];

function createPropList(propIds: Array<number>): Array<{ id: number; name: string; icon: string }> {
  return propIds.map((propId) => {
    const propInfo = AppPropMapData[propId];
    return {
      id: propId,
      name: propInfo ? propInfo.filter_name : `属性${propId}`,
      icon: propInfo ? propInfo.icon : "",
    };
  });
}

const mainPropGroups = [
  { key: "sand", label: "时之沙", slot: 3, items: createPropList(sandMainProps) },
  { key: "goblet", label: "空之杯", slot: 4, items: createPropList(gobletMainProps) },
  { key: "circlet", label: "理之冠", slot: 5, items: createPropList(circletMainProps) },
];

const subPropList = createPropList(subPropTypes);

const activeTab = ref<string>("basic");
const selectedSlot = ref<Array<number>>([]);
const selectedStar = ref<Array<number>>([]);
const selectedSet = ref<Array<number>>([]);
const selectedMainProp = ref<Array<number>>([]);
const selectedSubProp = ref<Array<number>>([]);
const selectedStatus = ref<Array<string>>([]);
const selectedGrade = ref<Array<string>>([]);

const subPropMatchCount = ref<number>(0);

const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      selectedSlot.value = [];
      selectedStar.value = [];
      selectedSet.value = [];
      selectedMainProp.value = [];
      selectedSubProp.value = [];
      selectedStatus.value = [];
      selectedGrade.value = [];
      subPropMatchCount.value = 0;
      resetModel.value = false;
    }
  },
);

function increaseSubPropCount(): void {
  const maxCount = Math.min(selectedSubProp.value.length, 4);
  if (subPropMatchCount.value < maxCount) {
    subPropMatchCount.value++;
  }
}

function decreaseSubPropCount(): void {
  if (subPropMatchCount.value > 0) {
    subPropMatchCount.value--;
  }
}

function resetFilter(): void {
  selectedSlot.value = [];
  selectedStar.value = [];
  selectedSet.value = [];
  selectedMainProp.value = [];
  selectedSubProp.value = [];
  selectedStatus.value = [];
  selectedGrade.value = [];
  subPropMatchCount.value = 0;
  confirmSelect();
}

function confirmSelect(): void {
  const maxCount = Math.min(selectedSubProp.value.length, 4);
  if (subPropMatchCount.value > maxCount) {
    subPropMatchCount.value = maxCount;
  } else if (subPropMatchCount.value < 0) {
    subPropMatchCount.value = 0;
  }
  const value: RelicFilterValue = {
    slot: selectedSlot.value,
    star: selectedStar.value,
    set: selectedSet.value,
    mainProp: selectedMainProp.value,
    subProp: selectedSubProp.value,
    subPropMatchCount: subPropMatchCount.value,
    locked: selectedStatus.value.includes("locked") ? true : null,
    marked: selectedStatus.value.includes("marked") ? true : null,
    grade: selectedGrade.value,
  };
  emits("filter", value);
  visible.value = false;
}
</script>
<style lang="css" scoped>
.pbrf-container {
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

.pbrf-tabs {
  display: flex;
  width: 100%;
  font-family: var(--font-title);
  gap: 8px;
}

.pbrf-content {
  width: 100%;
  max-height: 450px;
  overflow-y: auto;
}

.pbrf-section {
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 8px;
}

.pbrf-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.pbrf-title {
  color: var(--common-text-title);
  font-size: 16px;
  white-space: nowrap;
}

.pbrf-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pbrf-select-set {
  display: flex;
  width: 100%;
  max-height: 350px;
  flex-wrap: wrap;
  padding-right: 4px;
  padding-bottom: 4px;
  gap: 8px;
  overflow-y: auto;
}

.pbrf-icon {
  width: 24px;
  height: 24px;
  filter: invert(0.5);

  .dark & {
    filter: unset;
  }
}

.pbrf-set-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  border-radius: 4px;
  gap: 8px;
}

.pbrf-set-left {
  position: relative;
  overflow: hidden;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;
}

.pbrf-set-left .bg,
.pbrf-set-left .icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.pbrf-set-name {
  flex: 1;
  margin-right: 4px;
  margin-left: 4px;
  font-size: 14px;
  text-align: left;
}

.pbrf-pm-btn {
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

.pbrf-mp-group {
  margin-bottom: 12px;
}

.pbrf-mp-group:last-child {
  margin-bottom: 0;
}

.pbrf-mp-group-title {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  gap: 4px;
}

.pbrf-mp-group-icon {
  width: 18px;
  height: 18px;
  filter: invert(0.5);

  .dark & {
    filter: unset;
  }
}

.pbrf-sub-prop-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pbrf-sub-prop-count-value {
  min-width: 32px;
  color: var(--common-text-title);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.pbrf-submit {
  display: flex;
  padding-top: 8px;
  margin-left: auto;
  gap: 12px;
}
</style>
