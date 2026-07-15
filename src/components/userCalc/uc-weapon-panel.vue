<!-- 养成计算-武器配置 -->
<template>
  <v-card class="ucw-panel" variant="outlined">
    <v-card-title class="ucw-title">
      <span class="ucw-heading">
        <v-icon>mdi-sword</v-icon>
        武器养成
      </span>
      <div class="ucw-title-actions">
        <div v-if="hasBagData" class="ucw-source-control">
          <v-switch
            v-model="useBagSource"
            :title="useBagSource ? '当前使用背包数据' : '当前使用角色装备数据'"
            class="ucw-source-switch"
            color="var(--tgc-od-blue)"
            density="compact"
            hide-details
          />
          <span>{{ useBagSource ? "背包数据" : "角色装备" }}</span>
        </div>
        <v-chip v-if="selectedWeapon" color="var(--tgc-od-blue)" size="small" variant="tonal">
          Lv.{{ selectedWeapon.level }} → {{ targetLevel }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text class="ucw-form">
      <v-select
        v-model="selectedKey"
        :items="options"
        clearable
        density="compact"
        hide-details
        item-title="title"
        item-value="key"
        label="选择武器"
        no-data-text="当前来源没有符合角色武器类型的数据"
        variant="outlined"
      />

      <div class="ucw-object-config">
        <div v-if="selectedWeapon" class="ucw-selected">
          <div class="ucw-item-box">
            <img
              :src="`/icon/bg/${selectedWeapon.wiki.star}-Star.webp`"
              alt="background"
              class="bg"
            />
            <img
              :src="`/WIKI/weapon/${selectedWeapon.wiki.id}.webp`"
              :alt="selectedWeapon.wiki.name"
              class="icon"
            />
            <img
              :src="`/icon/weapon/${selectedWeapon.wiki.weapon}.webp`"
              :alt="selectedWeapon.wiki.weapon"
              class="badge"
            />
          </div>
          <div class="ucw-selected-info">
            <span class="ucw-name">{{ selectedWeapon.wiki.name }}</span>
            <div class="ucw-tags">
              <span>Lv.{{ selectedWeapon.level }}</span>
              <span>{{ selectedWeapon.wiki.star }}★</span>
              <span>{{ selectedWeapon.wiki.weapon }}</span>
              <span>精炼 {{ selectedWeapon.affixLevel }}</span>
            </div>
            <div v-if="selectedWeapon.locked" class="ucw-tags secondary">
              <span>
                <v-icon size="12">mdi-lock</v-icon>
                已锁定
              </span>
            </div>
          </div>
          <span v-if="selectedWeapon.fromBag" :title="selectedWeapon.guid" class="ucw-guid">
            GUID {{ selectedWeapon.guid }}
          </span>
        </div>
        <div v-else class="ucw-selected empty">
          <v-icon size="32">mdi-sword-cross</v-icon>
          <span>选择武器后显示武器信息</span>
        </div>

        <div class="ucw-level-config">
          <div :class="{ 'is-unavailable': levelUnavailable }" class="ucw-slider-field">
            <div class="ucw-slider-label">
              <span>目标等级</span>
              <span class="ucw-slider-value">{{
                selectedWeapon ? `Lv.${targetLevel}` : "--"
              }}</span>
            </div>
            <v-slider
              :disabled="levelUnavailable"
              :max="levelMax"
              :min="1"
              :model-value="targetLevel"
              class="ucw-slider-control"
              color="var(--tgc-od-blue)"
              density="compact"
              hide-details
              step="1"
              thumb-label
              track-color="var(--common-shadow-2)"
              @update:model-value="updateTargetLevel"
            />
          </div>
          <div
            :class="{
              'is-unavailable': !atAscensionLevel,
              'is-readonly': atAscensionLevel && selectedWeapon?.fromBag,
            }"
            class="ucw-ascension-state"
          >
            <v-checkbox
              v-model="ascended"
              :disabled="!atAscensionLevel"
              :readonly="atAscensionLevel && selectedWeapon?.fromBag"
              color="var(--tgc-od-blue)"
              density="compact"
              hide-details
              label="当前等级已突破"
            />
            <span class="ucw-ascension-hint">
              <template v-if="!atAscensionLevel">当前等级不是突破临界等级</template>
              <template v-else-if="selectedWeapon?.fromBag">
                <v-icon size="10">mdi-lock-outline</v-icon>
                状态来自背包数据，仅供查看
              </template>
              <template v-else>未勾选会计入本次突破材料</template>
            </span>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import type { UserCalcWeaponOption } from "@comp/userCalc/uc-types.js";
import { computed } from "vue";

type UcWeaponPanelProps = {
  options: Array<UserCalcWeaponOption>;
  selectedWeapon?: UserCalcWeaponOption;
  levelOptions: Array<number>;
  atAscensionLevel: boolean;
  hasBagData: boolean;
};

const props = defineProps<UcWeaponPanelProps>();

const selectedKey = defineModel<string | null>("selectedKey", { required: true });
const targetLevel = defineModel<number>("targetLevel", { required: true });
const ascended = defineModel<boolean>("ascended", { required: true });
const useBagSource = defineModel<boolean>("useBagSource", { required: true });

const levelMax = computed<number>(() => props.levelOptions.at(-1) ?? 90);
const currentLevel = computed<number>(() => props.selectedWeapon?.level ?? 1);
const levelUnavailable = computed<boolean>(
  () => !props.selectedWeapon || currentLevel.value >= levelMax.value,
);

function updateTargetLevel(value: number): void {
  targetLevel.value = Math.max(currentLevel.value, Math.min(value, levelMax.value));
}
</script>

<style lang="scss" scoped>
.ucw-panel {
  height: 100%;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  box-shadow: 0 4px 8px var(--common-shadow-1);
}

.ucw-title,
.ucw-heading,
.ucw-title-actions {
  display: flex;
  align-items: center;
}

.ucw-title {
  justify-content: space-between;
  padding: 8px 12px;
  font-family: var(--font-title);
  font-size: 16px;
  gap: 8px;
}

.ucw-heading {
  flex-shrink: 0;
  gap: 8px;
}

.ucw-title-actions {
  justify-content: flex-end;
  gap: 8px;
}

.ucw-source-control {
  display: flex;
  align-items: center;
  color: var(--common-text-sub);
  font-family: var(--font-text);
  font-size: 11px;
  gap: 8px;
  white-space: nowrap;
}

.ucw-source-switch {
  width: 36px;
  flex: 0 0 36px;
  margin: 0;
  transform: scale(0.75);
  transform-origin: center;
}

.ucw-form {
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px;
  gap: 8px;
}

.ucw-object-config {
  display: grid;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: minmax(0, 1.15fr) minmax(176px, 0.85fr);
}

.ucw-selected {
  position: relative;
  display: flex;
  min-height: 88px;
  align-items: center;
  padding: 8px 8px 20px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  gap: 8px;

  &.empty {
    flex-direction: column;
    justify-content: center;
    padding: 8px;
    color: var(--common-text-sub);
    font-size: 12px;
    opacity: 0.5;
  }
}

.ucw-item-box {
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
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 0 4px #00000099);
    object-fit: contain;
  }
}

.ucw-selected-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.ucw-name {
  overflow: hidden;
  font-family: var(--font-title);
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucw-tags {
  display: flex;
  flex-wrap: wrap;
  color: var(--common-text-title);
  font-size: 12px;
  gap: 4px 8px;

  &.secondary {
    color: var(--common-text-sub);
  }
}

.ucw-guid {
  position: absolute;
  right: 8px;
  bottom: 4px;
  overflow: hidden;
  max-width: calc(100% - 16px);
  color: var(--common-text-sub);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucw-level-config {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.ucw-slider-field {
  padding: 4px 8px 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  transition: opacity 0.2s ease;

  &.is-unavailable {
    opacity: 0.38;
  }
}

.ucw-slider-control {
  width: calc(100% - 16px);
  margin: 0 8px;
}

.ucw-slider-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--common-text-sub);
  font-size: 12px;
}

.ucw-slider-value {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: 400;
}

.ucw-ascension-state {
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
}

.ucw-ascension-hint {
  padding-left: 4px;
  color: var(--common-text-sub);
  font-size: 10px;
}

@media (width <= 520px) {
  .ucw-title {
    flex-wrap: wrap;
  }

  .ucw-object-config {
    grid-template-columns: 1fr;
  }
}
</style>
