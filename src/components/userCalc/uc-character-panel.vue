<!-- 养成计算-角色配置 -->
<template>
  <v-card class="ucc-panel" variant="outlined">
    <v-card-title class="ucc-title">
      <span class="ucc-heading">
        <v-icon>mdi-account-star-outline</v-icon>
        角色养成
      </span>
      <div class="ucc-title-actions">
        <v-menu
          v-model="showSelector"
          :close-on-content-click="false"
          location="bottom end"
          offset="8"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              :disabled="selectionReadonly"
              :title="
                selectionReadonly
                  ? '编辑角色养成目标时不可切换角色'
                  : selectedCharacter
                    ? `切换角色：${selectedCharacter.name}`
                    : '选择角色'
              "
              class="ucc-select-trigger"
              icon
              v-bind="menuProps"
              variant="tonal"
            >
              <UcItemIcon
                v-if="selectedCharacter"
                :alt="selectedCharacter.name"
                :icon="selectedCharacter.icon"
                :primary-badge="`/icon/element/${selectedCharacter.element}元素.webp`"
                :size="40"
                :star="selectedCharacter.star"
                circular
              />
              <v-icon v-else>mdi-account-plus-outline</v-icon>
            </v-btn>
          </template>
          <v-card class="ucc-picker" variant="outlined">
            <div class="ucc-picker-header">
              <span class="ucc-picker-title">选择角色</span>
              <v-btn
                :disabled="selectedId === null"
                class="ucc-picker-clear"
                color="var(--tgc-od-red)"
                prepend-icon="mdi-close-circle-outline"
                size="small"
                variant="tonal"
                @click="clearCharacter"
              >
                清空
              </v-btn>
            </div>
            <div class="ucc-picker-grid">
              <button
                v-for="option in options"
                :key="option.value"
                :class="{ selected: option.value === selectedId }"
                :title="option.title"
                class="ucc-picker-item"
                type="button"
                @click="selectCharacter(option.value)"
              >
                <TItemBox :model-value="getCharacterBoxData(option)" />
              </button>
            </div>
          </v-card>
        </v-menu>
        <span v-if="selectedCharacter" class="ucc-selected-label">
          {{ selectedCharacter.name }}
        </span>
        <v-chip v-if="selectedCharacter" color="var(--tgc-od-blue)" size="small" variant="tonal">
          Lv.{{ currentLevel }} → {{ targetLevel }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text class="ucc-form">
      <div class="ucc-object-config">
        <div v-if="selectedCharacter" class="ucc-selected">
          <UcItemIcon
            :alt="selectedCharacter.name"
            :icon="selectedCharacter.icon"
            :primary-badge="`/icon/element/${selectedCharacter.element}元素.webp`"
            :star="selectedCharacter.star"
            :size="80"
          />
          <div class="ucc-selected-info">
            <span class="ucc-name">{{ selectedCharacter.name }}</span>
            <div class="ucc-tags">
              <span>Lv.{{ currentLevel }}</span>
              <span>{{ selectedCharacter.star }}★</span>
              <span>{{ selectedCharacter.element }}元素</span>
              <span>{{ weaponType }}</span>
            </div>
            <div class="ucc-tags secondary">
              <span>命座 {{ selectedCharacter.constellation }}</span>
              <span>好感 {{ selectedCharacter.fetter }}</span>
            </div>
          </div>
        </div>
        <div v-else class="ucc-selected empty">
          <v-icon size="32">mdi-account-search-outline</v-icon>
          <span>选择角色后显示角色信息</span>
        </div>

        <div class="ucc-level-config">
          <div :class="{ 'is-unavailable': levelUnavailable }" class="ucc-slider-field">
            <UcLevelSlider
              v-model="targetLevel"
              v-model:current="currentLevel"
              :current-editable="currentStateEditable"
              :disabled="levelUnavailable"
              :max="levelMax"
            />
          </div>
          <div class="ucc-ascension-options">
            <div
              :class="{
                'is-unavailable': !atAscensionLevel,
                'is-readonly': atAscensionLevel && currentAscensionReadonly,
              }"
              class="ucc-ascension-state"
            >
              <v-checkbox
                v-model="ascended"
                :disabled="!atAscensionLevel"
                :readonly="atAscensionLevel && currentAscensionReadonly"
                color="var(--tgc-od-blue)"
                density="compact"
                hide-details
                label="当前等级已突破"
              />
              <span class="ucc-ascension-hint">
                <template v-if="!atAscensionLevel">当前等级不是突破临界等级</template>
                <template v-else-if="currentAscensionReadonly">
                  <v-icon size="10">mdi-lock-outline</v-icon>
                  状态来自同步接口，只读
                </template>
                <template v-else>未勾选会计入本次突破材料</template>
              </span>
            </div>
            <div
              :class="{ 'is-unavailable': !targetAtAscensionLevel }"
              class="ucc-ascension-state target"
            >
              <v-checkbox
                v-model="targetAscended"
                :disabled="!targetAtAscensionLevel"
                color="var(--tgc-od-green)"
                density="compact"
                hide-details
                label="目标已突破"
              />
              <span class="ucc-ascension-hint">
                {{ targetAtAscensionLevel ? "计入目标突破" : "非临界等级" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="skills.length > 0" class="ucc-talents">
        <div class="ucc-section-title">
          <v-icon size="16">mdi-star-four-points-outline</v-icon>
          天赋目标
        </div>
        <div class="ucc-talent-list">
          <div
            v-for="(skill, index) in skills"
            :key="skill.id"
            :class="{
              'is-unavailable': !currentStateEditable && skill.level >= skill.maxLevel,
            }"
            class="ucc-talent"
          >
            <div class="ucc-talent-meta">
              <img :alt="skill.name" :src="skill.icon" />
              <div class="ucc-talent-info">
                <span :title="skill.name" class="ucc-talent-name">{{ skill.name }}</span>
                <span>{{ currentStateEditable ? "起始" : "当前" }} Lv.{{ skill.level }}</span>
              </div>
            </div>
            <UcLevelSlider
              :current="currentTalentLevels[index] ?? skill.level"
              :current-editable="currentStateEditable"
              :disabled="!currentStateEditable && skill.level >= skill.maxLevel"
              :max="skill.maxLevel"
              :model-value="talentTargetLevels[index]"
              @update:current="updateCurrentTalent(index, $event)"
              @update:model-value="updateTalent(index, $event)"
            />
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import { computed, ref } from "vue";

type UcCharacterPanelProps = {
  options: Array<TGApp.App.UserCalc.CharacterOption>;
  selectedCharacter?: TGApp.App.UserCalc.CharacterOption;
  weaponType: string;
  levelOptions: Array<number>;
  skills: Array<TGApp.App.UserCalc.SkillOption>;
  atAscensionLevel: boolean;
  currentAscensionReadonly: boolean;
  currentStateEditable: boolean;
  selectionReadonly: boolean;
  targetAtAscensionLevel: boolean;
};

const props = defineProps<UcCharacterPanelProps>();

const selectedId = defineModel<number | null>("selectedId", { required: true });
const currentLevel = defineModel<number>("currentLevel", { required: true });
const targetLevel = defineModel<number>("targetLevel", { required: true });
const currentTalentLevels = defineModel<Array<number>>("talentCurrentLevels", { required: true });
const talentTargetLevels = defineModel<Array<number>>("talentTargetLevels", { required: true });
const ascended = defineModel<boolean>("ascended", { required: true });
const targetAscended = defineModel<boolean>("targetAscended", { required: true });

const showSelector = ref<boolean>(false);

const levelMax = computed<number>(() => props.levelOptions.at(-1) ?? 90);
const levelUnavailable = computed<boolean>(
  () =>
    !props.selectedCharacter ||
    (!props.currentStateEditable && currentLevel.value >= levelMax.value),
);

function selectCharacter(value: number): void {
  if (props.selectionReadonly) return;
  selectedId.value = value;
  showSelector.value = false;
}

function clearCharacter(): void {
  if (props.selectionReadonly) return;
  selectedId.value = null;
  showSelector.value = false;
}

function getCharacterBoxData(option: TGApp.App.UserCalc.CharacterOption): TItemBoxData {
  return {
    bg: `/icon/bg/${option.star}-Star.webp`,
    icon: option.icon,
    size: "80px",
    height: "80px",
    display: "inner",
    clickable: true,
    lt: `/icon/element/${option.element}元素.webp`,
    ltSize: "16px",
    innerHeight: 20,
    innerIcon: `/icon/weapon/${option.weaponType}.webp`,
    innerText: option.name,
  };
}

function updateTalent(index: number, value: number): void {
  const skill = props.skills[index];
  const currentTalentLevel = skill?.level ?? 1;
  const nextLevel = Math.max(currentTalentLevel, Math.min(value, skill?.maxLevel ?? 10));
  talentTargetLevels.value = talentTargetLevels.value.map((level, currentIndex) =>
    currentIndex === index ? nextLevel : level,
  );
}

function updateCurrentTalent(index: number, value: number | null): void {
  const skill = props.skills[index];
  if (!props.currentStateEditable || !skill || value === null) return;
  const nextLevel = Math.min(Math.max(value, 1), skill.maxLevel);
  currentTalentLevels.value = props.skills.map((currentSkill, currentIndex) =>
    currentIndex === index
      ? nextLevel
      : (currentTalentLevels.value[currentIndex] ?? currentSkill.level),
  );
  talentTargetLevels.value = talentTargetLevels.value.map((level, currentIndex) =>
    currentIndex === index ? Math.max(level, nextLevel) : level,
  );
}
</script>

<style lang="scss" scoped>
.ucc-panel {
  display: flex;
  height: 100%;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  box-shadow: 0 4px 8px var(--common-shadow-1);
}

.ucc-title,
.ucc-heading,
.ucc-title-actions,
.ucc-section-title {
  display: flex;
  align-items: center;
}

.ucc-title {
  justify-content: space-between;
  padding: 8px 12px;
  font-family: var(--font-title);
  font-size: 16px;
  gap: 8px;
}

.ucc-heading,
.ucc-section-title {
  gap: 8px;
}

.ucc-title-actions {
  min-width: 0;
  justify-content: flex-end;
  gap: 8px;
}

.ucc-select-trigger {
  overflow: hidden;
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
}

.ucc-selected-label {
  overflow: hidden;
  max-width: 120px;
  color: var(--common-text-title);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucc-picker {
  width: min(366px, calc(100vw - 32px));
  max-height: 360px;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  box-shadow: 0 4px 8px var(--common-shadow-2);
  overflow-y: auto;
}

.ucc-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.ucc-picker-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
}

.ucc-picker-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, 80px);
}

.ucc-picker-item {
  width: 80px;
  height: 80px;
  padding: 0;
  border: unset;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.2s ease;

  &:hover,
  &.selected {
    opacity: 1;
  }
}

.ucc-form {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 8px 12px;
  gap: 8px;
}

.ucc-object-config {
  display: grid;
  height: 100px;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucc-selected {
  display: flex;
  height: 100%;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-2);
  gap: 8px;

  &.empty {
    flex-direction: column;
    justify-content: center;
    color: var(--common-text-sub);
    font-size: 12px;
    opacity: 0.5;
  }
}

.ucc-selected-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.ucc-name,
.ucc-talent-name {
  overflow: hidden;
  font-family: var(--font-title);
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucc-tags {
  display: flex;
  flex-wrap: wrap;
  color: var(--common-text-title);
  font-size: 12px;
  gap: 4px 8px;

  &.secondary {
    color: var(--common-text-sub);
  }
}

.ucc-level-config {
  position: relative;
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
}

.ucc-slider-field {
  padding: 0 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  transition: opacity 0.2s ease;

  &.is-unavailable {
    opacity: 0.38;
  }
}

.ucc-ascension-options {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucc-ascension-state {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  border-left: 4px solid var(--tgc-od-blue);
  transition: opacity 0.2s ease;

  :deep(.v-selection-control) {
    min-height: 28px;
  }

  &.is-unavailable {
    border-left-color: var(--common-shadow-2);
    opacity: 0.38;
  }

  &.is-readonly {
    border-left-color: var(--tgc-od-orange);
    opacity: 0.68;
  }

  &.target {
    border-left-color: var(--tgc-od-green);
  }

  &.target.is-unavailable {
    border-left-color: var(--common-shadow-2);
  }
}

.ucc-ascension-hint {
  padding-left: 4px;
  color: var(--common-text-sub);
  font-size: 10px;
}

.ucc-talents {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ucc-section-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: 400;
}

.ucc-talent-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(148px, 1fr));
  overflow-x: auto;
}

.ucc-talent {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  box-shadow: 0 4px 8px var(--common-shadow-1);
  gap: 4px;
  transition: opacity 0.2s ease;

  &.is-unavailable {
    opacity: 0.45;
  }
}

.ucc-talent-meta {
  display: grid;
  min-width: 0;
  align-items: center;
  gap: 8px;
  grid-template-columns: 32px minmax(0, 1fr);

  > img {
    width: 32px;
    height: 32px;
    filter: invert(0.55);
    object-fit: contain;

    .dark & {
      filter: unset;
    }
  }
}

.ucc-talent-info {
  display: flex;
  min-width: 0;
  flex-direction: column;

  span:last-child {
    color: var(--common-text-sub);
    font-size: 12px;
  }
}

@media (width <= 520px) {
  .ucc-title {
    flex-wrap: wrap;
  }

  .ucc-object-config {
    grid-template-columns: 1fr;
  }

  .ucc-ascension-options {
    grid-template-columns: 1fr;
  }

  .ucc-talent-list {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
}
</style>
