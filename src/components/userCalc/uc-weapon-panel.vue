<!-- 养成计算-武器配置 -->
<template>
  <v-card class="ucw-panel" variant="outlined">
    <v-card-title class="ucw-title">
      <div class="ucw-title-main">
        <span class="ucw-heading">
          <v-icon>mdi-sword</v-icon>
          武器养成
        </span>
        <div v-if="hasBagData" class="ucw-source-control">
          <v-switch
            v-model="useBagSource"
            :title="useBagSource ? '数据源-背包' : '数据源-角色'"
            class="ucw-source-switch"
            color="var(--tgc-od-blue)"
            density="compact"
            hide-details
          />
          <span>{{ useBagSource ? "数据源-背包" : "数据源-角色" }}</span>
        </div>
      </div>
      <div class="ucw-title-actions">
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
                  ? '编辑武器养成目标时不可切换武器'
                  : selectedWeapon
                    ? `切换武器：${selectedWeapon.wiki.name}`
                    : '选择武器'
              "
              class="ucw-select-trigger"
              icon
              v-bind="menuProps"
              variant="tonal"
            >
              <UcItemIcon
                v-if="selectedWeapon"
                :alt="selectedWeapon.wiki.name"
                :icon="selectedWeapon.icon"
                :primary-badge="`/icon/weapon/${selectedWeapon.wiki.weapon}.webp`"
                :size="40"
                :star="selectedWeapon.wiki.star"
                circular
              />
              <v-icon v-else>mdi-sword-cross</v-icon>
              <span v-if="selectedWeapon" class="ucw-select-hint">
                <v-icon size="11">mdi-swap-horizontal</v-icon>
              </span>
              <v-tooltip activator="parent" location="bottom">
                {{ selectionReadonly ? "编辑目标时不可切换武器" : "点击切换武器" }}
              </v-tooltip>
            </v-btn>
          </template>
          <v-card class="ucw-picker" variant="outlined">
            <div class="ucw-picker-header">
              <span class="ucw-picker-title">选择武器</span>
              <div class="ucw-picker-actions">
                <v-text-field
                  v-model="searchKeyword"
                  aria-label="搜索武器名称"
                  autocomplete="off"
                  class="ucw-picker-search"
                  clearable
                  density="compact"
                  hide-details
                  placeholder="搜索名称"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
                <v-btn
                  :disabled="selectedKey === null"
                  class="ucw-picker-clear"
                  color="var(--tgc-od-red)"
                  icon="mdi-close-circle-outline"
                  size="small"
                  title="清空武器选择"
                  variant="tonal"
                  @click="clearWeapon"
                />
              </div>
            </div>
            <div v-if="filteredOptions.length > 0" class="ucw-picker-list">
              <UcPickerListItem
                v-for="option in filteredOptions"
                :key="option.key"
                :details="getWeaponDetails(option)"
                :icon="option.icon"
                :name="option.wiki.name"
                :owned="option.source !== 'catalog'"
                :primary-badge="`/icon/weapon/${option.wiki.weapon}.webp`"
                :secondary="getWeaponSecondaryDetails(option)"
                :selected="option.key === selectedKey"
                :star="option.wiki.star"
                :title="option.title"
                @select="selectWeapon(option.key)"
              />
            </div>
            <div v-else class="ucw-picker-empty">
              {{ searchKeyword ? "未找到名称匹配的武器" : "当前来源没有符合角色武器类型的数据" }}
            </div>
          </v-card>
        </v-menu>
        <span v-if="selectedWeapon" class="ucw-selected-label">
          {{ selectedWeapon.wiki.name }}
        </span>
        <v-chip v-if="selectedWeapon" color="var(--tgc-od-blue)" size="small" variant="tonal">
          Lv.{{ currentLevel }} → {{ targetLevel }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text class="ucw-form">
      <div class="ucw-object-config">
        <div v-if="selectedWeapon" class="ucw-selected">
          <UcItemIcon
            :alt="selectedWeapon.wiki.name"
            :icon="selectedWeapon.icon"
            :primary-badge="`/icon/weapon/${selectedWeapon.wiki.weapon}.webp`"
            :size="80"
            :star="selectedWeapon.wiki.star"
          />
          <div class="ucw-selected-info">
            <span class="ucw-name">{{ selectedWeapon.wiki.name }}</span>
            <div class="ucw-tags">
              <span>Lv.{{ currentLevel }}</span>
              <span>{{ selectedWeapon.wiki.star }}★</span>
              <span>{{ selectedWeapon.wiki.weapon }}</span>
              <span v-if="selectedWeapon.source !== 'catalog'">
                精炼 {{ selectedWeapon.affixLevel }}
              </span>
            </div>
            <div v-if="selectedWeapon.locked" class="ucw-tags secondary">
              <span>
                <v-icon size="12">mdi-lock</v-icon>
                已锁定
              </span>
            </div>
            <span v-if="selectedWeapon.fromBag" :title="selectedWeapon.guid" class="ucw-guid">
              GUID {{ selectedWeapon.guid }}
            </span>
          </div>
        </div>
        <div v-else class="ucw-selected empty">
          <v-icon size="32">mdi-sword-cross</v-icon>
          <span>选择武器后显示武器信息</span>
        </div>

        <div class="ucw-level-config">
          <div :class="{ 'is-unavailable': levelUnavailable }" class="ucw-slider-field">
            <UcLevelSlider
              v-model="targetLevel"
              v-model:current="currentLevel"
              :current-editable="currentStateEditable"
              :disabled="levelUnavailable"
              :limit-max="levelMax"
              :max="90"
            />
          </div>
          <div class="ucw-ascension-options">
            <div
              :class="{
                'is-unavailable': !atAscensionLevel,
                'is-readonly':
                  atAscensionLevel && (selectedWeapon?.fromBag || currentAscensionReadonly),
              }"
              class="ucw-ascension-state"
            >
              <v-checkbox
                :disabled="!atAscensionLevel"
                :model-value="currentAscended"
                :readonly="
                  atAscensionLevel && (selectedWeapon?.fromBag || currentAscensionReadonly)
                "
                color="var(--tgc-od-blue)"
                density="compact"
                hide-details
                label="当前等级已突破"
                @update:model-value="updateCurrentAscended"
              />
              <span class="ucw-ascension-hint">
                <template v-if="!atAscensionLevel">当前等级不是突破临界等级</template>
                <template v-else-if="currentAscensionReadonly">
                  <v-icon size="10">mdi-lock-outline</v-icon>
                  接口按同步等级计算，只读
                </template>
                <template v-else-if="selectedWeapon?.fromBag">
                  <v-icon size="10">mdi-lock-outline</v-icon>
                  状态来自背包数据，只读
                </template>
                <template v-else>未勾选会计入本次突破材料</template>
              </span>
            </div>
            <div
              :class="{ 'is-unavailable': !targetAtAscensionLevel }"
              class="ucw-ascension-state target"
            >
              <v-checkbox
                v-model="targetAscended"
                :disabled="!targetAtAscensionLevel"
                color="var(--tgc-od-green)"
                density="compact"
                hide-details
                label="目标已突破"
              />
              <span class="ucw-ascension-hint">
                {{ targetAtAscensionLevel ? "计入目标突破" : "非临界等级" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedWeapon" class="ucw-growth">
        <div class="ucw-growth-title">
          <span>
            <v-icon size="16">mdi-chart-line</v-icon>
            属性变化
          </span>
          <span>突破阶段 {{ currentPromoteLevel }} → {{ targetPromoteLevel }}</span>
        </div>
        <div class="ucw-stat-list">
          <div v-for="stat in currentStats" :key="stat.type" class="ucw-stat">
            <img v-if="stat.info.icon" :alt="stat.info.name" :src="stat.info.icon" />
            <div class="ucw-stat-info">
              <span>{{ stat.info.name }}</span>
              <div>
                <span>{{ wikiUtils.propFmt(stat.type, stat.val) }}</span>
                <v-icon size="14">mdi-arrow-right</v-icon>
                <span>{{ formatTargetStat(stat.type, stat.val) }}</span>
              </div>
            </div>
          </div>
          <div v-if="selectedWeapon.source !== 'catalog'" class="ucw-stat summary">
            <v-icon size="24">mdi-sword-cross</v-icon>
            <div class="ucw-stat-info">
              <span>养成信息</span>
              <div>
                <span>精炼 {{ selectedWeapon.affixLevel }}</span>
                <span>{{ getWeaponSourceLabel(selectedWeapon.source) }}</span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="selectedWeapon.wiki.description" class="ucw-description">
          {{ selectedWeapon.wiki.description }}
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import UcPickerListItem from "@comp/userCalc/uc-picker-list-item.vue";
import userCalc from "@utils/userCalc.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, ref, watch } from "vue";

type UcWeaponPanelProps = {
  options: Array<TGApp.App.UserCalc.WeaponOption>;
  selectedWeapon?: TGApp.App.UserCalc.WeaponOption;
  levelOptions: Array<number>;
  atAscensionLevel: boolean;
  targetAtAscensionLevel: boolean;
  hasBagData: boolean;
  currentAscensionReadonly: boolean;
  currentPromoteLevel: number;
  currentStateEditable: boolean;
  selectionReadonly: boolean;
};

const props = defineProps<UcWeaponPanelProps>();

const selectedKey = defineModel<string | null>("selectedKey", { required: true });
const currentLevel = defineModel<number>("currentLevel", { required: true });
const targetLevel = defineModel<number>("targetLevel", { required: true });
const ascended = defineModel<boolean>("ascended", { required: true });
const targetAscended = defineModel<boolean>("targetAscended", { required: true });
const useBagSource = defineModel<boolean>("useBagSource", { required: true });

const showSelector = ref<boolean>(false);
const searchKeyword = ref<string | null>("");

const levelMax = computed<number>(() => props.levelOptions.at(-1) ?? 90);
const filteredOptions = computed<Array<TGApp.App.UserCalc.WeaponOption>>(() => {
  const keyword = (searchKeyword.value === null ? "" : searchKeyword.value)
    .trim()
    .toLocaleLowerCase();
  if (!keyword) return props.options;
  return props.options.filter((option) => option.wiki.name.toLocaleLowerCase().includes(keyword));
});
const levelUnavailable = computed<boolean>(
  () =>
    !props.selectedWeapon || (!props.currentStateEditable && currentLevel.value >= levelMax.value),
);
const currentAscended = computed<boolean>(() => {
  if (!props.selectedWeapon?.fromBag || props.currentStateEditable) return ascended.value;
  return userCalc.isAscendedAtThreshold(currentLevel.value, props.currentPromoteLevel);
});
const targetPromoteLevel = computed<number>(() => {
  if (!props.selectedWeapon) return 0;
  const resolved = userCalc.resolvePromoteLevel(
    targetLevel.value,
    undefined,
    props.targetAtAscensionLevel ? targetAscended.value : undefined,
  );
  return Math.max(props.currentPromoteLevel, resolved);
});
const currentStats = computed<Array<TGApp.App.Weapon.WeaponProp>>(() => {
  if (!props.selectedWeapon) return [];
  return wikiUtils.weapon(props.selectedWeapon.wiki, currentLevel.value, props.currentPromoteLevel);
});
const targetStats = computed<Array<TGApp.App.Weapon.WeaponProp>>(() => {
  if (!props.selectedWeapon) return [];
  return wikiUtils.weapon(props.selectedWeapon.wiki, targetLevel.value, targetPromoteLevel.value);
});

function selectWeapon(key: string): void {
  if (props.selectionReadonly) return;
  selectedKey.value = key;
  showSelector.value = false;
}

function clearWeapon(): void {
  if (props.selectionReadonly) return;
  selectedKey.value = null;
  showSelector.value = false;
}

function updateCurrentAscended(value: boolean | null): void {
  if (!props.selectedWeapon?.fromBag && !props.currentAscensionReadonly) {
    ascended.value = value === true;
  }
}

function formatTargetStat(type: number, fallback: number): string {
  const stat = targetStats.value.find((item) => item.type === type);
  return wikiUtils.propFmt(type, stat?.val ?? fallback);
}

function getWeaponSourceLabel(source: TGApp.App.UserCalc.WeaponOption["source"]): string {
  switch (source) {
    case "bag":
      return "背包存档";
    case "equipped":
      return "角色装备";
    case "catalog":
      return "未拥有";
  }
}

function getWeaponDetails(option: TGApp.App.UserCalc.WeaponOption): Array<string> {
  const details = [`Lv.${option.level}`];
  if (option.source !== "catalog") details.push(`精炼 ${option.affixLevel}`);
  details.push(`${option.wiki.star}★`);
  return details;
}

function getWeaponSecondaryDetails(option: TGApp.App.UserCalc.WeaponOption): Array<string> {
  const details = [option.wiki.weapon];
  if (option.source !== "catalog") details.push(getWeaponSourceLabel(option.source));
  if (option.locked) details.push("已锁定");
  if (option.guid) details.push(`GUID ${option.guid}`);
  return details;
}

watch(showSelector, (visible) => {
  if (!visible) searchKeyword.value = "";
});
</script>

<style lang="scss" scoped>
.ucw-panel {
  display: flex;
  height: 100%;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  box-shadow: 0 4px 8px var(--common-shadow-1);
}

.ucw-title,
.ucw-title-main,
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

.ucw-title-main {
  min-width: 0;
  gap: 12px;
}

.ucw-title-actions {
  min-width: 0;
  justify-content: flex-end;
  gap: 8px;
}

.ucw-source-control {
  display: flex;
  align-items: center;
  color: var(--common-text-sub);
  font-family: var(--font-text);
  font-size: 14px;
  white-space: nowrap;
}

.ucw-source-switch {
  width: 36px;
  flex: 0 0 36px;
  margin: 0;
  transform: scale(0.75);
  transform-origin: center;
}

.ucw-select-trigger {
  position: relative;
  overflow: visible;
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
}

.ucw-select-hint {
  position: absolute;
  z-index: 2;
  right: -2px;
  bottom: -2px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-od-blue);
  color: var(--btn-text);
}

.ucw-selected-label {
  overflow: hidden;
  max-width: 120px;
  color: var(--common-text-title);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucw-picker {
  display: flex;
  overflow: hidden;
  width: min(430px, calc(100vw - 32px));
  max-height: 420px;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  box-shadow: 0 4px 8px var(--common-shadow-2);
}

.ucw-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.ucw-picker-title {
  flex: none;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
}

.ucw-picker-actions {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.ucw-picker-search {
  max-width: 190px;
  color: var(--app-page-content);

  :deep(.v-field__input) {
    caret-color: var(--tgc-od-blue);
    color: var(--app-page-content);
  }

  :deep(.v-field__input::placeholder) {
    color: var(--app-page-content);
    opacity: 0.64;
  }

  :deep(.v-field__prepend-inner > .v-icon),
  :deep(.v-field__clearable > .v-icon) {
    color: var(--app-page-content);
    opacity: 0.8;
  }
}

.ucw-picker-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding-right: 2px;
  gap: 6px;
  overflow-y: auto;
}

.ucw-picker-empty {
  padding: 24px 8px;
  color: var(--common-text-sub);
  font-size: 12px;
  text-align: center;
}

.ucw-form {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 8px 12px;
  gap: 8px;
}

.ucw-object-config {
  display: grid;
  height: 100px;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucw-selected {
  display: flex;
  height: 100%;
  align-items: center;
  padding: 8px;
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

.ucw-selected-info {
  display: flex;
  min-width: 0;
  height: 100%;
  flex: 1;
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
  overflow: hidden;
  max-width: 100%;
  align-self: flex-end;
  margin-top: auto;
  color: var(--common-text-sub);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucw-level-config {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
}

.ucw-slider-field {
  padding: 0 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  transition: opacity 0.2s ease;

  &.is-unavailable {
    opacity: 0.38;
  }
}

.ucw-ascension-options {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

  &.target {
    border-left-color: var(--tgc-od-green);
  }

  &.target.is-unavailable {
    border-left-color: var(--common-shadow-2);
  }
}

.ucw-ascension-hint {
  padding-left: 4px;
  color: var(--common-text-sub);
  font-size: 10px;
}

.ucw-growth {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  gap: 8px;
}

.ucw-growth-title,
.ucw-growth-title > span,
.ucw-stat,
.ucw-stat-info > div {
  display: flex;
  align-items: center;
}

.ucw-growth-title {
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  gap: 8px;

  > span {
    gap: 4px;
  }

  > span:last-child {
    color: var(--common-text-sub);
    font-family: var(--font-text);
    font-size: 11px;
  }
}

.ucw-stat-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.ucw-stat {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px;

  > img {
    width: 24px;
    height: 24px;
    filter: invert(0.55);
    object-fit: contain;

    .dark & {
      filter: unset;
    }
  }

  &.summary > .v-icon {
    color: var(--tgc-od-orange);
  }
}

.ucw-stat-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  color: var(--common-text-sub);
  font-size: 11px;

  > div {
    flex-wrap: wrap;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 13px;
    gap: 4px;
  }

  > div > span:last-child {
    color: var(--tgc-od-green);
  }
}

.ucw-description {
  margin: auto 0 0;
  color: var(--common-text-sub);
  font-size: 11px;
  line-height: 1.5;
}

@media (width <= 520px) {
  .ucw-title {
    flex-wrap: wrap;
  }

  .ucw-picker-header {
    flex-direction: column;
    align-items: stretch;
  }

  .ucw-picker-actions {
    justify-content: stretch;
  }

  .ucw-picker-search {
    max-width: none;
  }

  .ucw-object-config {
    grid-template-columns: 1fr;
  }

  .ucw-ascension-options {
    grid-template-columns: 1fr;
  }
}
</style>
