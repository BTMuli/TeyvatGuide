<!-- 圣遗物筛选浮窗 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按部位、星级、套装与词条组合筛选"
    title="筛选圣遗物"
    topOffset="112px"
    @confirm="confirmSelect"
  >
    <template #headerActions>
      <v-btn-toggle
        v-model="activeTab"
        :divided="false"
        :mandatory="true"
        class="pbrf-tabs"
        color="var(--tgc-od-blue)"
        variant="outlined"
      >
        <v-btn v-for="tab in tabs" :key="tab.key" :value="tab.key" size="small">
          {{ tab.label }}
        </v-btn>
      </v-btn-toggle>
    </template>

    <div class="pbrf-content">
      <div v-show="activeTab === 'basic'" class="twf-grid pbrf-basic-grid">
        <section class="twf-group twf-group-weapon twf-group-wide">
          <div class="twf-group-title">部位</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedSlot" :items="slotList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">星级</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedStar" :items="starList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">状态</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedStatus" :items="statusList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group twf-group-wide">
          <div class="twf-group-title">强化等级</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedGrade" :items="gradeList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>

      <div v-show="activeTab === 'set'" class="twf-grid">
        <section class="twf-group twf-group-wide pbrf-set-group">
          <div class="twf-group-title">套装</div>
          <div class="twf-options">
            <UavSelectChips
              v-model:selected="selectedSet"
              :items="setList"
              class="pbrf-set-options"
              size="small"
            >
              <template #all>全选</template>
              <template #item="{ item }">
                <img
                  v-if="item.icon"
                  :alt="item.label ?? ''"
                  class="pbrf-set-icon"
                  :src="item.icon"
                  :style="{
                    backgroundImage: item.iconBackground
                      ? `url(${item.iconBackground})`
                      : undefined,
                  }"
                />
                <span class="pbrf-set-label">{{ item.label }}</span>
              </template>
            </UavSelectChips>
          </div>
        </section>
      </div>

      <div v-show="activeTab === 'prop'" class="twf-grid">
        <section
          v-for="group in mainPropGroups"
          :key="group.key"
          class="twf-group twf-group-weapon twf-group-wide"
        >
          <div class="twf-group-title pbrf-main-prop-title">
            <img :alt="group.label" :src="`/icon/relic/${group.slot}.webp`" />
            <span>{{ group.label }}</span>
          </div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedMainProp" :items="group.items" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group twf-group-weapon twf-group-wide">
          <div class="twf-group-title pbrf-sub-prop-title">
            <span>副词条</span>
            <div class="pbrf-sub-prop-count">
              <span class="pbrf-sub-prop-count-label">符合词条数</span>
              <v-btn
                aria-label="减少副词条符合数"
                class="pbrf-sub-prop-count-btn"
                density="compact"
                icon="mdi-minus"
                size="small"
                variant="text"
                @click="decreaseSubPropCount"
              />
              <span class="pbrf-sub-prop-count-value">{{ subPropMatchCount }}</span>
              <v-btn
                aria-label="增加副词条符合数"
                class="pbrf-sub-prop-count-btn"
                density="compact"
                icon="mdi-plus"
                size="small"
                variant="text"
                @click="increaseSubPropCount"
              />
            </div>
          </div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedSubProp" :items="subPropList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>
    </div>

    <template #footer>
      <span class="pbrf-footer-hint">未选择或全选均表示不限</span>
      <div class="pbrf-actions">
        <v-btn class="pbrf-reset" variant="text" @click="resetFilter">重置选项</v-btn>
        <v-btn class="pbrf-confirm" prepend-icon="mdi-check" variant="flat" @click="confirmSelect">
          确定
        </v-btn>
      </div>
    </template>
  </TwfFilterShell>
</template>
<script lang="ts" setup>
import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
import UavSelectChips, { type UavSelectChipsItem } from "@comp/userAvatar/uav-select-chips.vue";
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

type PbRelicFilterEmits = { filter: [v: RelicFilterValue] };

const emits = defineEmits<PbRelicFilterEmits>();

const tabs = [
  { key: "basic", label: "基础筛选" },
  { key: "set", label: "套装筛选" },
  { key: "prop", label: "词条筛选" },
];

const slotList: Array<UavSelectChipsItem> = [
  { label: "生之花", value: "1", title: "生之花", icon: "/icon/relic/1.webp" },
  { label: "死之羽", value: "2", title: "死之羽", icon: "/icon/relic/2.webp" },
  { label: "时之沙", value: "3", title: "时之沙", icon: "/icon/relic/3.webp" },
  { label: "空之杯", value: "4", title: "空之杯", icon: "/icon/relic/4.webp" },
  { label: "理之冠", value: "5", title: "理之冠", icon: "/icon/relic/5.webp" },
];

const starList: Array<UavSelectChipsItem> = [1, 2, 3, 4, 5].map((star) => ({
  label: `${star}星`,
  value: star.toString(),
  title: `${star}星`,
}));

const statusList: Array<UavSelectChipsItem> = [
  { label: "锁定", value: "locked", title: "锁定" },
  { label: "未锁定", value: "unlocked", title: "未锁定" },
  { label: "星标", value: "marked", title: "星标" },
  { label: "未星标", value: "unmarked", title: "未星标" },
];

const gradeList: Array<UavSelectChipsItem> = [
  { label: "初始3词条", value: "init3", title: "初始3词条" },
  { label: "初始4词条", value: "init4", title: "初始4词条" },
  { label: "强化5次", value: "enhance5", title: "强化5次" },
  { label: "强化4次", value: "enhance4", title: "强化4次" },
];

type RelicSetFilterItem = UavSelectChipsItem & { iconBackground: string };

const setList: Array<RelicSetFilterItem> = wrSet
  .sort((a, b) => b.maxStar - a.maxStar || b.id - a.id)
  .map((s) => ({
    label: s.name,
    value: s.id.toString(),
    title: s.name,
    icon: `/WIKI/relic/${s.icon}.webp`,
    iconBackground: `/icon/bg/${s.maxStar}-Star.webp`,
  }));

const sandMainProps = [6, 9, 3, 28, 23];
const gobletMainProps = [6, 9, 3, 28, 30, 40, 41, 42, 43, 44, 45, 46];
const circletMainProps = [6, 9, 3, 28, 20, 22, 26];

const subPropTypes = [2, 3, 5, 6, 8, 9, 20, 22, 23, 28];

function createPropList(propIds: Array<number>): Array<UavSelectChipsItem> {
  return propIds.map((propId) => {
    const propInfo = AppPropMapData[propId];
    return {
      label: propInfo ? propInfo.filter_name : `属性${propId}`,
      value: propId.toString(),
      title: propInfo ? propInfo.filter_name : `属性${propId}`,
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
const selectedSlot = ref<Array<string>>([]);
const selectedStar = ref<Array<string>>([]);
const selectedSet = ref<Array<string>>([]);
const selectedMainProp = ref<Array<string>>([]);
const selectedSubProp = ref<Array<string>>([]);
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
}

function getBooleanFilter(
  selectedValues: ReadonlyArray<string>,
  trueValue: string,
  falseValue: string,
): boolean | null {
  const hasTrueValue = selectedValues.includes(trueValue);
  const hasFalseValue = selectedValues.includes(falseValue);
  return hasTrueValue === hasFalseValue ? null : hasTrueValue;
}

function confirmSelect(): void {
  const maxCount = Math.min(selectedSubProp.value.length, 4);
  if (subPropMatchCount.value > maxCount) {
    subPropMatchCount.value = maxCount;
  } else if (subPropMatchCount.value < 0) {
    subPropMatchCount.value = 0;
  }
  const value: RelicFilterValue = {
    slot: selectedSlot.value.map(Number),
    star: selectedStar.value.map(Number),
    set: selectedSet.value.map(Number),
    mainProp: selectedMainProp.value.map(Number),
    subProp: selectedSubProp.value.map(Number),
    subPropMatchCount: subPropMatchCount.value,
    locked: getBooleanFilter(selectedStatus.value, "locked", "unlocked"),
    marked: getBooleanFilter(selectedStatus.value, "marked", "unmarked"),
    grade: selectedGrade.value,
  };
  emits("filter", value);
  visible.value = false;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.pbrf-tabs {
  min-width: 0;
  height: 36px;
  flex-shrink: 1;
  overflow-x: auto;

  :deep(.v-btn) {
    flex-shrink: 0;
  }
}

.pbrf-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;
}

.pbrf-basic-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pbrf-set-options {
  :deep(.uav-scb-group) {
    max-height: 350px;
    padding-right: 4px;
    gap: 12px;
    overflow-y: auto;
  }

  :deep(.uav-scb-item),
  :deep(.uav-scb-item.selected) {
    min-height: 40px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    box-shadow: none;
  }
}

.pbrf-set-group {
  min-width: 0;
}

.pbrf-set-icon {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  object-fit: contain;
}

.pbrf-set-label {
  @include github-styles.github-tag-dark-gen(#548af7);

  display: flex;
  height: 32px;
  align-items: center;
  padding: 0 8px 0 16px;
  border-radius: 4px;
  margin-left: -8px;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}

.pbrf-set-options :deep(.uav-scb-item.selected) .pbrf-set-label {
  @include github-styles.github-tag-dark-gen(#fb7299);
}

.pbrf-main-prop-title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pbrf-main-prop-title img {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
}

.pbrf-sub-prop-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pbrf-sub-prop-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pbrf-sub-prop-count-label {
  color: var(--box-text-2);
  font-size: 12px;
  font-weight: normal;
  white-space: nowrap;
}

.pbrf-sub-prop-count-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--box-text-2);
}

.pbrf-sub-prop-count-value {
  min-width: 32px;
  color: var(--common-text-title);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.pbrf-footer-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.pbrf-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.pbrf-reset,
.pbrf-confirm {
  border-radius: 4px;
  font-family: var(--font-text);
}

.pbrf-reset {
  color: var(--box-text-2);
}

.pbrf-confirm {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
