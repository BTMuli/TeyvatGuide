<!-- 养成计算-角色配置 -->
<template>
  <v-card class="ucc-panel" variant="outlined">
    <v-card-title class="ucc-title">
      <span class="ucc-heading">
        <v-icon>mdi-account-star-outline</v-icon>
        角色养成
      </span>
      <v-chip v-if="selectedRole" color="var(--tgc-od-blue)" size="small" variant="tonal">
        Lv.{{ selectedRole.avatar.level }} → {{ targetLevel }}
      </v-chip>
    </v-card-title>

    <v-card-text class="ucc-form">
      <v-select
        v-model="selectedId"
        :items="options"
        clearable
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        label="选择角色"
        variant="outlined"
      />

      <div class="ucc-object-config">
        <div v-if="selectedRole" class="ucc-selected">
          <div class="ucc-item-box">
            <img :src="`/icon/bg/${characterStar}-Star.webp`" alt="background" class="bg" />
            <img
              :alt="selectedRole.avatar.name"
              :src="`/WIKI/character/${selectedRole.cid}.webp`"
              class="icon"
            />
            <img
              :alt="`${elementName}元素`"
              :src="`/icon/element/${elementName}元素.webp`"
              class="badge element"
            />
            <img :alt="weaponType" :src="`/icon/weapon/${weaponType}.webp`" class="badge weapon" />
          </div>
          <div class="ucc-selected-info">
            <span class="ucc-name">{{ selectedRole.avatar.name }}</span>
            <div class="ucc-tags">
              <span>Lv.{{ selectedRole.avatar.level }}</span>
              <span>{{ characterStar }}★</span>
              <span>{{ elementName }}元素</span>
              <span>{{ weaponType }}</span>
            </div>
            <div class="ucc-tags secondary">
              <span>命座 {{ selectedRole.avatar.actived_constellation_num }}</span>
              <span>好感 {{ selectedRole.avatar.fetter }}</span>
            </div>
          </div>
        </div>
        <div v-else class="ucc-selected empty">
          <v-icon size="32">mdi-account-search-outline</v-icon>
          <span>选择角色后显示角色信息</span>
        </div>

        <div class="ucc-level-config">
          <div :class="{ 'is-unavailable': levelUnavailable }" class="ucc-slider-field">
            <div class="ucc-slider-label">
              <span>目标等级</span>
              <span class="ucc-slider-value">{{ selectedRole ? `Lv.${targetLevel}` : "--" }}</span>
            </div>
            <v-slider
              :disabled="levelUnavailable"
              :max="levelMax"
              :min="1"
              :model-value="targetLevel"
              class="ucc-slider-control"
              color="var(--tgc-od-blue)"
              density="compact"
              hide-details
              step="1"
              thumb-label
              track-color="var(--common-shadow-2)"
              @update:model-value="updateTargetLevel"
            />
          </div>
          <div :class="{ 'is-unavailable': !atAscensionLevel }" class="ucc-ascension-state">
            <v-checkbox
              v-model="ascended"
              :disabled="!atAscensionLevel"
              color="var(--tgc-od-blue)"
              density="compact"
              hide-details
              label="当前等级已突破"
            />
            <span class="ucc-ascension-hint">
              {{ atAscensionLevel ? "未勾选会计入本次突破材料" : "当前等级不是突破临界等级" }}
            </span>
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
            :key="skill.skill_id"
            :class="{ 'is-unavailable': Math.min(skill.level, 10) >= 10 }"
            class="ucc-talent"
          >
            <div class="ucc-talent-meta">
              <img :alt="skill.name" :src="skill.icon" />
              <div class="ucc-talent-info">
                <span :title="skill.name" class="ucc-talent-name">{{ skill.name }}</span>
                <span>当前 Lv.{{ Math.min(skill.level, 10) }}</span>
              </div>
            </div>
            <div class="ucc-slider-label talent">
              <span>目标</span>
              <span class="ucc-slider-value">Lv.{{ talentTargetLevels[index] }}</span>
            </div>
            <v-slider
              :disabled="Math.min(skill.level, 10) >= 10"
              :max="10"
              :min="1"
              :model-value="talentTargetLevels[index]"
              class="ucc-slider-control"
              color="var(--tgc-od-blue)"
              density="compact"
              hide-details
              step="1"
              thumb-label
              track-color="var(--common-shadow-2)"
              @update:model-value="updateTalent(index, $event)"
            />
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import type { UserCalcCharacterOption } from "@comp/userCalc/uc-types.js";
import { getRcStar, getZhElement } from "@utils/toolFunc.js";
import { computed } from "vue";

type UcCharacterPanelProps = {
  options: Array<UserCalcCharacterOption>;
  selectedRole?: TGApp.Sqlite.Character.TableTrans;
  weaponType: string;
  levelOptions: Array<number>;
  skills: Array<TGApp.Game.Avatar.Skill>;
  atAscensionLevel: boolean;
};

const props = defineProps<UcCharacterPanelProps>();

const selectedId = defineModel<number | null>("selectedId", { required: true });
const targetLevel = defineModel<number>("targetLevel", { required: true });
const talentTargetLevels = defineModel<Array<number>>("talentTargetLevels", { required: true });
const ascended = defineModel<boolean>("ascended", { required: true });

const levelMax = computed<number>(() => props.levelOptions.at(-1) ?? 90);
const currentLevel = computed<number>(() => props.selectedRole?.avatar.level ?? 1);
const levelUnavailable = computed<boolean>(
  () => !props.selectedRole || currentLevel.value >= levelMax.value,
);
const elementName = computed<string>(() => getZhElement(props.selectedRole?.avatar.element ?? ""));
const characterStar = computed<number>(() =>
  props.selectedRole ? getRcStar(props.selectedRole.cid, props.selectedRole.avatar.rarity) : 1,
);

function updateTargetLevel(value: number): void {
  targetLevel.value = Math.max(currentLevel.value, Math.min(value, levelMax.value));
}

function updateTalent(index: number, value: number): void {
  const currentTalentLevel = Math.min(props.skills[index]?.level ?? 1, 10);
  const nextLevel = Math.max(currentTalentLevel, Math.min(value, 10));
  talentTargetLevels.value = talentTargetLevels.value.map((level, currentIndex) =>
    currentIndex === index ? nextLevel : level,
  );
}
</script>

<style lang="scss" scoped>
.ucc-panel {
  height: 100%;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  box-shadow: 0 4px 8px var(--common-shadow-1);
}

.ucc-title,
.ucc-heading,
.ucc-section-title {
  display: flex;
  align-items: center;
}

.ucc-title {
  justify-content: space-between;
  padding: 8px 12px;
  font-family: var(--font-title);
  font-size: 16px;
}

.ucc-heading,
.ucc-section-title {
  gap: 8px;
}

.ucc-form {
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px;
  gap: 8px;
}

.ucc-object-config {
  display: grid;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: minmax(0, 1.15fr) minmax(176px, 0.85fr);
}

.ucc-selected {
  display: flex;
  min-height: 88px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
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

.ucc-item-box {
  position: relative;
  overflow: hidden;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 4px;

  .bg,
  .icon {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  .bg {
    object-fit: cover;
  }

  .icon {
    object-fit: cover;
  }

  .badge {
    position: absolute;
    z-index: 2;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 0 4px #00000099);
    object-fit: contain;

    &.element {
      top: 4px;
      left: 4px;
    }

    &.weapon {
      right: 4px;
      bottom: 4px;
    }
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
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.ucc-slider-field {
  padding: 4px 8px 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  transition: opacity 0.2s ease;

  &.is-unavailable {
    opacity: 0.38;
  }
}

.ucc-slider-control {
  width: calc(100% - 16px);
  margin: 0 8px;
}

.ucc-slider-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-sub);
  font-size: 12px;

  &.talent {
    padding: 0 4px;
  }
}

.ucc-slider-value {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: 400;
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
  border-radius: 8px;
  background: var(--common-shadow-t-1);
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
  .ucc-object-config {
    grid-template-columns: 1fr;
  }

  .ucc-talent-list {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
}
</style>
