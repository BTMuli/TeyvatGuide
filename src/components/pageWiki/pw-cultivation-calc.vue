<!-- 图鉴详情-养成计算 -->
<template>
  <TOverlay v-model="visible">
    <article
      ref="shareTarget"
      aria-labelledby="wiki-cultivation-title"
      aria-modal="true"
      class="pwcc-panel"
      role="dialog"
    >
      <header class="pwcc-header">
        <UcItemIcon
          :alt="wikiName"
          :icon="wikiIcon"
          :primary-badge="wikiBadge"
          :size="64"
          :star="wikiStar"
        />
        <div class="pwcc-identity">
          <div class="pwcc-title-row">
            <h2 id="wiki-cultivation-title">{{ wikiName }}</h2>
            <div v-if="hasBagData && allowCrafting" class="pwcc-crafting-tags">
              <v-chip color="var(--tgc-od-green)" size="small" variant="tonal">允许合成</v-chip>
              <v-chip v-if="useDust" color="var(--tgc-od-green)" size="small" variant="tonal">
                使用嬗变之尘
              </v-chip>
              <v-chip v-if="useSolvent" color="var(--tgc-od-green)" size="small" variant="tonal">
                使用溶媒
              </v-chip>
            </div>
          </div>
          <div class="pwcc-meta">
            <span>{{ inPlan ? "当前计划目标" : "养成计算" }}</span>
            <span>Lv.{{ currentLevel }} → Lv.{{ targetLevel }}</span>
            <span v-if="isCharacter">{{ character?.element }}元素 · {{ character?.weapon }}</span>
            <span v-else>{{ weapon?.weapon }} · {{ wikiStar }} 星</span>
          </div>
        </div>
        <div class="pwcc-actions" data-html2canvas-ignore="true">
          <v-btn
            :loading="shareLoading"
            aria-label="保存养成计算分享图"
            density="comfortable"
            icon="mdi-share-variant"
            title="保存养成计算分享图"
            variant="text"
            @click="shareCalc"
          />
          <v-btn
            aria-label="关闭养成计算"
            density="comfortable"
            icon="mdi-close"
            title="关闭"
            variant="text"
            @click="visible = false"
          />
        </div>
      </header>

      <main ref="contentTarget" class="pwcc-content">
        <section class="pwcc-block">
          <header class="pwcc-block-header">
            <div class="pwcc-section-title">
              <v-icon size="18">mdi-arrow-up-bold-circle-outline</v-icon>
              <span>等级目标</span>
            </div>
            <v-btn-toggle
              :model-value="targetAtAscensionLevel ? targetLevel : undefined"
              aria-label="快速选择突破临界等级"
              class="pwcc-level-nodes"
              data-html2canvas-ignore="true"
              density="compact"
              mandatory
              @update:model-value="selectTargetAscensionLevel"
            >
              <v-btn
                v-for="option in ascensionLevelOptions"
                :key="option"
                :title="`跳转至 ${option} 级突破节点`"
                :value="option"
                size="x-small"
                variant="text"
              >
                {{ option }}
              </v-btn>
            </v-btn-toggle>
          </header>
          <div class="pwcc-block-body pwcc-level">
            <UcLevelSlider
              v-model="targetLevel"
              v-model:current="currentLevel"
              current-editable
              :levels="levelOptions"
              :max="levelMax"
              @update:model-value="updateTargetLevel"
            />
            <div class="pwcc-ascension">
              <div
                :class="{ 'is-unavailable': !currentAtAscensionLevel }"
                class="pwcc-ascension-state"
              >
                <v-checkbox
                  v-model="currentAscended"
                  :disabled="!currentAtAscensionLevel"
                  color="var(--tgc-od-blue)"
                  density="compact"
                  hide-details
                  label="当前等级已突破"
                />
                <span>{{
                  currentAtAscensionLevel ? "未勾选会计入本次突破材料" : "当前等级不是突破临界等级"
                }}</span>
              </div>
              <div
                :class="{ 'is-unavailable': !targetAtAscensionLevel }"
                class="pwcc-ascension-state target"
              >
                <v-checkbox
                  :disabled="!targetAtAscensionLevel"
                  :model-value="targetAscended"
                  color="var(--tgc-od-green)"
                  density="compact"
                  hide-details
                  label="目标已突破"
                  @update:model-value="updateTargetAscended"
                />
                <span>{{ targetAtAscensionLevel ? "计入目标突破" : "非临界等级" }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="skills.length > 0" class="pwcc-block">
          <header class="pwcc-block-header">
            <div class="pwcc-section-title">
              <v-icon size="18">mdi-star-four-points-outline</v-icon>
              <span>天赋目标</span>
            </div>
          </header>
          <div class="pwcc-block-body">
            <div class="pwcc-talent-list">
              <div v-for="(skill, index) in skills" :key="skill.id" class="pwcc-talent">
                <div class="pwcc-talent-meta">
                  <img :alt="skill.name" :src="skill.icon" />
                  <div class="pwcc-talent-info">
                    <span :title="skill.name" class="pwcc-talent-name">{{ skill.name }}</span>
                    <span class="pwcc-talent-level">
                      起始 Lv.{{ talentCurrentLevels[index] ?? skill.level }}
                    </span>
                  </div>
                </div>
                <UcLevelSlider
                  :current="talentCurrentLevels[index] ?? skill.level"
                  current-editable
                  :limit-max="getSkillTargetMaxLevel(skill)"
                  :max="10"
                  :model-value="talentTargetLevels[index]"
                  @update:current="updateCurrentTalent(index, $event)"
                  @update:model-value="updateTalent(index, $event)"
                />
              </div>
            </div>
          </div>
        </section>

        <UcMaterialResult
          v-model:allowCrafting="allowCrafting"
          v-model:useDust="useDust"
          v-model:useSolvent="useSolvent"
          :bag-materials="bagMaterialDetails"
          :empty-text="emptyText"
          :materials="displayMaterials"
          :missingKinds
          :show-crafting-options="hasBagData"
          topOffset="0px"
          :uid="currentUid"
        />
      </main>

      <div class="pwcc-toolbar" data-html2canvas-ignore="true">
        <v-btn
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-calculator-variant-outline"
          variant="tonal"
          @click="openPlan"
        >
          前往养成计划
        </v-btn>
        <v-btn
          :disabled="!canAddToPlan"
          :loading="planSaving"
          :title="addToPlanTitle"
          color="var(--tgc-od-green)"
          prepend-icon="mdi-content-save-check-outline"
          variant="tonal"
          @click="addToPlan"
        >
          {{ inPlan ? "更新当前养成计划" : "添加到当前养成计划" }}
        </v-btn>
      </div>
      <footer class="pwcc-footer">
        <span>养成计算</span>
        <span> · {{ wikiName }}</span>
        <span v-if="currentUid > 0"> · UID {{ currentUid }}</span>
        <span> · Rendered by TeyvatGuide v{{ version }}</span>
      </footer>
    </article>
  </TOverlay>
</template>

<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import { buildCultivationResults, getUidServerTimezone } from "@utils/cultivationPlan.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import userCalc, { ASCENSION_LEVELS } from "@utils/userCalc.js";
import type { CultivationMaterial } from "@utils/userCalc.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";

type PwCultivationCalcProps = {
  character?: TGApp.App.Character.WikiItem;
  weapon?: TGApp.App.Weapon.WikiItem;
};

type WikiCalcSkill = {
  id: number;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
};

const EMPTY_BAG_MATERIAL_DETAILS: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable> =
  new Map();

const props = defineProps<PwCultivationCalcProps>();
const visible = defineModel<boolean>({ required: true });
const inPlan = defineModel<boolean>("inPlan", { required: true });
const router = useRouter();
const { account } = storeToRefs(useUserStore());

const currentLevel = ref<number>(1);
const targetLevel = ref<number>(90);
const currentAscended = ref<boolean>(false);
const targetAscended = ref<boolean>(false);
const talentCurrentLevels = ref<Array<number>>([]);
const talentTargetLevels = ref<Array<number>>([]);
const allowCrafting = ref<boolean>(true);
const useDust = ref<boolean>(false);
const useSolvent = ref<boolean>(false);
const bagMaterials = shallowRef<Map<number, number>>(new Map());
const bagMaterialDetails = shallowRef<ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>>(
  EMPTY_BAG_MATERIAL_DETAILS,
);
const shareLoading = ref<boolean>(false);
const planSaving = ref<boolean>(false);
const applyingPlan = ref<boolean>(false);
const version = ref<string>();
const shareTarget = useTemplateRef<HTMLElement>("shareTarget");
const contentTarget = useTemplateRef<HTMLElement>("contentTarget");
const planEntry = shallowRef<TGApp.Sqlite.Cultivation.EntryWithItems>();
let planLoadId = 0;

const isCharacter = computed<boolean>(() => props.character !== undefined);
const character = computed<TGApp.App.Character.WikiItem | undefined>(() => props.character);
const weapon = computed<TGApp.App.Weapon.WikiItem | undefined>(() => props.weapon);
const wikiName = computed<string>(() => character.value?.name ?? weapon.value?.name ?? "养成计算");
const wikiStar = computed<number>(() => (character.value?.star ?? weapon.value?.star ?? 5) % 100);
const wikiIcon = computed<string>(() =>
  character.value
    ? `/WIKI/character/${character.value.id}.webp`
    : `/WIKI/weapon/${weapon.value?.id ?? 0}.webp`,
);
const wikiBadge = computed<string | undefined>(() => {
  if (character.value) return `/icon/element/${character.value.element}元素.webp`;
  if (weapon.value) return `/icon/weapon/${weapon.value.weapon}.webp`;
  return undefined;
});
const wikiId = computed<number>(() => character.value?.id ?? weapon.value?.id ?? 0);
const currentUid = computed<number>(() => {
  const uid = Number(account.value.gameUid);
  return Number.isInteger(uid) && uid > 0 ? uid : 0;
});
const hasBagData = computed<boolean>(
  () => currentUid.value > 0 && bagMaterialDetails.value.size > 0,
);
const skills = computed<Array<WikiCalcSkill>>(() =>
  (character.value?.skills ?? [])
    .filter((skill) => skill.maxLv > 1)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      icon: `/icon/talents/${skill.icon}.webp`,
      level: 1,
      maxLevel: skill.maxLv,
    })),
);
const levelMax = computed<number>(() =>
  character.value ? 100 : userCalc.weaponMaxLevel(weapon.value?.star ?? 5),
);
const levelOptions = computed<Array<number>>(() =>
  character.value
    ? userCalc.avatarLevelOptions(levelMax.value)
    : Array.from({ length: levelMax.value }, (_, index) => index + 1),
);
const ascensionLevelOptions = computed<Array<number>>(() =>
  ASCENSION_LEVELS.filter((level) => level < levelMax.value),
);
const currentAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(currentLevel.value),
);
const targetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(targetLevel.value),
);
const talentLevelMax = computed<number>(() =>
  userCalc.avatarTalentMaxLevel(targetLevel.value, targetAscended.value),
);
const currentPromoteLevel = computed<number>(() =>
  userCalc.resolvePromoteLevel(
    currentLevel.value,
    undefined,
    currentAtAscensionLevel.value ? currentAscended.value : undefined,
  ),
);
const canCalculate = computed<boolean>(() =>
  character.value
    ? character.value.materials.length >= 6
    : (weapon.value?.materials.length ?? 0) >= 3,
);
const requiredMaterials = computed<Array<CultivationMaterial>>(() => {
  if (!canCalculate.value) return [];
  if (character.value) {
    return userCalc.avatarFromState(
      character.value,
      currentLevel.value,
      currentPromoteLevel.value,
      talentCurrentLevels.value,
      targetLevel.value,
      talentTargetLevels.value,
      targetAscended.value,
    );
  }
  if (!weapon.value) return [];
  return userCalc.weapon(
    weapon.value,
    currentLevel.value,
    currentPromoteLevel.value,
    targetLevel.value,
    targetAscended.value,
  );
});
const displayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  buildCultivationResults(
    requiredMaterials.value,
    bagMaterials.value,
    WikiMaterialData,
    hasBagData.value && allowCrafting.value,
    useDust.value,
    useSolvent.value,
  ),
);
const missingKinds = computed<number>(
  () => displayMaterials.value.filter((material) => material.missing > 0).length,
);
const emptyText = computed<string>(() => {
  if (!canCalculate.value) return "当前条目缺少完整养成材料数据，暂无法计算";
  return "当前养成进度已达到目标";
});
const canAddToPlan = computed<boolean>(
  () => currentUid.value > 0 && wikiId.value > 0 && requiredMaterials.value.length > 0,
);
const addToPlanTitle = computed<string>(() => {
  if (currentUid.value <= 0) return "请先选择游戏账号";
  if (requiredMaterials.value.length === 0) return emptyText.value;
  if (inPlan.value) return `更新当前养成计划中的 ${wikiName.value}`;
  return `将 ${wikiName.value} 添加到当前养成计划`;
});

watch(
  visible,
  (open) => {
    if (!open) return;
    resetState();
    void loadBag();
    void loadPlanEntry();
  },
  { flush: "sync" },
);

watch(
  [currentUid, wikiId],
  () => {
    void loadPlanEntry();
  },
  { immediate: true },
);

watch(
  currentLevel,
  (level) => {
    if (applyingPlan.value) return;
    targetLevel.value = Math.max(targetLevel.value, level);
    currentAscended.value = false;
  },
  { flush: "sync" },
);

watch(currentAtAscensionLevel, (atAscensionLevel) => {
  if (applyingPlan.value || atAscensionLevel) return;
  currentAscended.value = false;
});

watch(targetAtAscensionLevel, (atAscensionLevel) => {
  if (applyingPlan.value || atAscensionLevel) return;
  targetAscended.value = false;
});

onMounted(async () => {
  version.value = await getVersion();
});

function resetState(): void {
  applyingPlan.value = true;
  currentLevel.value = 1;
  currentAscended.value = false;
  targetAscended.value = false;
  targetLevel.value = character.value ? 90 : levelMax.value;
  allowCrafting.value = true;
  useDust.value = false;
  useSolvent.value = false;
  talentCurrentLevels.value = skills.value.map(() => 1);
  talentTargetLevels.value = skills.value.map((skill) =>
    Math.min(skill.maxLevel, userCalc.avatarTalentMaxLevel(targetLevel.value, false)),
  );
  applyPlanEntry();
  void nextTick(() => {
    applyingPlan.value = false;
  });
}

function applyPlanEntry(): void {
  const entry = planEntry.value;
  if (!entry) return;
  targetLevel.value = Math.min(levelMax.value, Math.max(entry.targetState.level, 1));
  currentLevel.value = Math.min(targetLevel.value, Math.max(entry.currentState.level, 1));
  currentAscended.value = currentAtAscensionLevel.value && entry.currentState.ascended;
  targetAscended.value = targetAtAscensionLevel.value && entry.targetState.ascended;
  allowCrafting.value = entry.allowCrafting;
  useDust.value = entry.useDust;
  useSolvent.value = entry.useSolvent;
  const talentMax = userCalc.avatarTalentMaxLevel(targetLevel.value, targetAscended.value);
  talentCurrentLevels.value = skills.value.map((skill) => {
    const savedLevel = getSavedTalentLevel(entry.currentState.talents, skill) ?? 1;
    return Math.min(skill.maxLevel, Math.max(1, savedLevel));
  });
  talentTargetLevels.value = skills.value.map((skill, index) => {
    const currentTalentLevel = talentCurrentLevels.value[index] ?? 1;
    const savedLevel = getSavedTalentLevel(entry.targetState.talents, skill) ?? currentTalentLevel;
    return Math.max(currentTalentLevel, Math.min(skill.maxLevel, talentMax, savedLevel));
  });
}

function getSavedTalentLevel(
  talents: ReadonlyArray<TGApp.Sqlite.Cultivation.TalentState>,
  skill: WikiCalcSkill,
): number | undefined {
  return (
    talents.find((talent) => talent.id === skill.id)?.level ??
    talents.find((talent) => talent.name === skill.name)?.level
  );
}

function findPlanEntry(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  type: TGApp.Sqlite.Cultivation.EntryType,
  itemId: number,
): TGApp.Sqlite.Cultivation.EntryWithItems | undefined {
  const matched = entries.filter((entry) => entry.type === type && entry.itemId === itemId);
  return matched.find((entry) => entry.instanceKey === "") ?? matched[0];
}

async function loadPlanEntry(): Promise<void> {
  const requestId = ++planLoadId;
  const uid = currentUid.value;
  const id = wikiId.value;
  const type = isCharacter.value ? "avatar" : "weapon";
  if (uid <= 0 || id <= 0) {
    planEntry.value = undefined;
    inPlan.value = false;
    return;
  }
  try {
    const project = await TSCultivationPlan.getCurrentProject(uid);
    if (requestId !== planLoadId) return;
    if (!project) {
      planEntry.value = undefined;
      inPlan.value = false;
      if (visible.value) resetState();
      return;
    }
    const entries = await TSCultivationPlan.getEntries(project.id);
    if (requestId !== planLoadId) return;
    const matched = findPlanEntry(entries, type, id);
    planEntry.value = matched;
    inPlan.value = matched !== undefined;
    if (visible.value) resetState();
  } catch {
    if (requestId !== planLoadId) return;
    planEntry.value = undefined;
    inPlan.value = false;
    if (visible.value) resetState();
  }
}

async function loadBag(): Promise<void> {
  const uid = currentUid.value;
  if (uid <= 0) {
    bagMaterials.value = new Map();
    bagMaterialDetails.value = EMPTY_BAG_MATERIAL_DETAILS;
    return;
  }
  try {
    const materialData = await TSUserBagMaterial.getMaterial(uid);
    bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
    bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
  } catch {
    bagMaterials.value = new Map();
    bagMaterialDetails.value = EMPTY_BAG_MATERIAL_DETAILS;
  }
}

function updateTargetLevel(value: number): void {
  targetLevel.value = value;
  targetAscended.value = false;
  syncTalentTargets(userCalc.avatarTalentMaxLevel(value));
}

function selectTargetAscensionLevel(value: number | null): void {
  if (typeof value !== "number") return;
  updateTargetLevel(value);
}

function updateTargetAscended(value: boolean | null): void {
  targetAscended.value = value === true;
  syncTalentTargets(userCalc.avatarTalentMaxLevel(targetLevel.value, targetAscended.value));
}

function syncTalentTargets(maxLevel: number): void {
  talentTargetLevels.value = skills.value.map((skill, index) => {
    const currentTalentLevel = talentCurrentLevels.value[index] ?? skill.level;
    return Math.max(currentTalentLevel, Math.min(skill.maxLevel, maxLevel));
  });
}

function getSkillTargetMaxLevel(skill: WikiCalcSkill): number {
  return Math.max(skill.level, Math.min(skill.maxLevel, talentLevelMax.value));
}

function updateTalent(index: number, value: number): void {
  const skill = skills.value[index];
  if (!skill) return;
  const currentTalentLevel = talentCurrentLevels.value[index] ?? skill.level;
  const nextLevel = Math.max(currentTalentLevel, Math.min(value, getSkillTargetMaxLevel(skill)));
  talentTargetLevels.value = talentTargetLevels.value.map((level, currentIndex) =>
    currentIndex === index ? nextLevel : level,
  );
}

function updateCurrentTalent(index: number, value: number | null): void {
  const skill = skills.value[index];
  if (!skill || value === null) return;
  const nextLevel = Math.min(Math.max(value, 1), getSkillTargetMaxLevel(skill));
  talentCurrentLevels.value = skills.value.map((currentSkill, currentIndex) =>
    currentIndex === index
      ? nextLevel
      : (talentCurrentLevels.value[currentIndex] ?? currentSkill.level),
  );
  talentTargetLevels.value = talentTargetLevels.value.map((level, currentIndex) =>
    currentIndex === index ? Math.max(level, nextLevel) : level,
  );
}

async function shareCalc(): Promise<void> {
  const panel = shareTarget.value;
  const content = contentTarget.value;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到养成计算内容");
    return;
  }

  const contentMaxHeight = content.style.maxHeight;
  const contentOverflowY = content.style.overflowY;
  const panelMaxHeight = panel.style.maxHeight;
  const panelOverflow = panel.style.overflow;
  shareLoading.value = true;
  panel.classList.add("is-sharing");
  await nextTick();
  await showLoading.start("正在生成分享图片", wikiName.value);
  await TGLogger.Info(`[WikiCultivation][share][${wikiId.value}] 开始生成养成计算图片`);
  content.style.maxHeight = "none";
  content.style.overflowY = "visible";
  panel.style.maxHeight = "none";
  panel.style.overflow = "visible";
  try {
    const uidLabel = currentUid.value > 0 ? `_${currentUid.value}` : "";
    await generateShareImg(`养成计算_${wikiName.value}${uidLabel}`, panel, 1.5, true);
  } finally {
    panel.classList.remove("is-sharing");
    content.style.maxHeight = contentMaxHeight;
    content.style.overflowY = contentOverflowY;
    panel.style.maxHeight = panelMaxHeight;
    panel.style.overflow = panelOverflow;
    await showLoading.end();
    shareLoading.value = false;
  }
}

async function addToPlan(): Promise<void> {
  if (!canAddToPlan.value || planSaving.value) return;
  const input = createPlanInput();
  if (!input) {
    showSnackbar.warn(emptyText.value);
    return;
  }
  planSaving.value = true;
  try {
    const uid = currentUid.value;
    const existed = planEntry.value !== undefined;
    const project = await TSCultivationPlan.ensureCurrentProject(uid, getUidServerTimezone(uid));
    await TSCultivationPlan.saveEntries(project.id, [input]);
    await loadPlanEntry();
    if (existed) {
      showSnackbar.success(`已更新“${project.name}”中的 ${wikiName.value}`);
    } else {
      showSnackbar.success(`已将 ${wikiName.value} 加入“${project.name}”`);
    }
  } catch (error) {
    showSnackbar.error(`添加到养成计划失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planSaving.value = false;
  }
}

function createPlanInput(): TGApp.Sqlite.Cultivation.SaveEntryInput | undefined {
  if (wikiId.value <= 0 || requiredMaterials.value.length === 0) return undefined;
  const currentTalents = skills.value.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    level: talentCurrentLevels.value[index] ?? skill.level,
  }));
  const targetTalents = skills.value.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    level: talentTargetLevels.value[index] ?? skill.level,
  }));
  return {
    allowCrafting: hasBagData.value && allowCrafting.value,
    calculationMode: "bag",
    type: isCharacter.value ? "avatar" : "weapon",
    itemId: wikiId.value,
    instanceKey: planEntry.value?.instanceKey ?? "",
    name: wikiName.value,
    icon: wikiIcon.value,
    star: wikiStar.value,
    currentState: {
      level: currentLevel.value,
      promoteLevel: currentPromoteLevel.value,
      ascended: currentAscended.value,
      talents: isCharacter.value ? currentTalents : [],
    },
    targetState: {
      level: targetLevel.value,
      promoteLevel: userCalc.resolvePromoteLevel(
        targetLevel.value,
        undefined,
        targetAtAscensionLevel.value ? targetAscended.value : undefined,
      ),
      ascended: targetAscended.value,
      talents: isCharacter.value ? targetTalents : [],
    },
    items: requiredMaterials.value.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
    useDust: hasBagData.value && useDust.value,
    useSolvent: hasBagData.value && useSolvent.value,
  };
}

async function openPlan(): Promise<void> {
  if (wikiId.value <= 0) return;
  visible.value = false;
  await router.push({
    name: "养成计划",
    query: {
      targetType: isCharacter.value ? "avatar" : "weapon",
      targetId: wikiId.value.toString(),
    },
  });
}
</script>

<style lang="scss" scoped>
.pwcc-panel {
  display: flex;
  overflow: hidden;
  width: 800px;
  max-width: calc(100vw - 160px);
  max-height: calc(100vh - 64px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.pwcc-header,
.pwcc-identity,
.pwcc-title-row,
.pwcc-crafting-tags,
.pwcc-meta,
.pwcc-actions,
.pwcc-block-header,
.pwcc-section-title,
.pwcc-talent-meta,
.pwcc-toolbar {
  display: flex;
  align-items: center;
}

.pwcc-header {
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  gap: 12px;
}

.pwcc-identity {
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.pwcc-title-row {
  min-width: 0;
  max-width: 100%;
  gap: 8px;

  h2 {
    overflow: hidden;
    min-width: 0;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.pwcc-crafting-tags {
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 4px;
  pointer-events: none;
}

.pwcc-meta {
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 2px 12px;
  line-height: 16px;
}

.pwcc-actions {
  flex-shrink: 0;
}

.pwcc-content {
  display: flex;
  overflow: hidden auto;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 12px 16px 16px;
  gap: 12px;
}

.pwcc-block,
.pwcc-level,
.pwcc-talent,
.pwcc-talent-info {
  display: flex;
  flex-direction: column;
}

.pwcc-block {
  overflow: visible;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
}

.pwcc-block-header {
  flex-wrap: wrap;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  gap: 8px;
}

.pwcc-section-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  gap: 4px;
}

.pwcc-block-body {
  padding: 8px;
  background: var(--box-bg-1);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.pwcc-level {
  gap: 4px;
}

.pwcc-level-nodes {
  width: fit-content;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin-left: auto;
  background: var(--common-shadow-1);
  gap: 1px;

  :deep(.v-btn) {
    min-width: 24px;
    flex: none;
    padding: 0 4px;
    background: var(--box-bg-4);
    color: var(--box-text-2);
    font-size: 9px;
    letter-spacing: 0;
  }

  :deep(.v-btn--active) {
    background: var(--tgc-btn-1);
    color: var(--btn-text);
  }
}

.pwcc-ascension {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pwcc-ascension-state {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  border-left: 4px solid var(--tgc-od-blue);

  :deep(.v-selection-control) {
    min-height: 28px;
  }

  &.target {
    border-left-color: var(--tgc-od-green);
  }

  &.is-unavailable {
    opacity: 0.45;
  }

  span {
    color: var(--common-text-sub);
    font-size: 12px;
    line-height: 16px;
  }
}

.pwcc-talent-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pwcc-talent {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  gap: 4px;
}

.pwcc-talent-meta {
  min-width: 0;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    filter: var(--icon-filter);
    object-fit: contain;
  }
}

.pwcc-talent-info {
  min-width: 0;
}

.pwcc-talent-name {
  overflow: hidden;
  font-family: var(--font-title);
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pwcc-talent-level {
  color: var(--common-text-sub);
  font-size: 12px;
}

.pwcc-toolbar {
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.pwcc-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}

.pwcc-content :deep(.ucm-result) {
  margin-bottom: 0;
  box-shadow: none;
}

.pwcc-content :deep(.ucm-list),
.pwcc-content :deep(.ucm-cost-list) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (width <= 720px) {
  .pwcc-panel {
    max-width: calc(100vw - 32px);
  }

  .pwcc-ascension,
  .pwcc-talent-list {
    grid-template-columns: 1fr;
  }
}

.pwcc-panel.is-sharing {
  .pwcc-actions,
  .pwcc-toolbar,
  .pwcc-level-nodes {
    display: none;
  }

  :deep(.ucls-control),
  :deep(.ucm-crafting-options) {
    display: none;
  }
}
</style>
