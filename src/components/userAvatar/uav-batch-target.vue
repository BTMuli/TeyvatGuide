<!-- 角色列表-批量养成目标 -->
<template>
  <v-bottom-sheet v-model="visible">
    <div class="uabt-container">
      <v-card class="uabt-card" variant="outlined">
        <v-card-title class="uabt-title">
          <span class="uabt-heading">
            <v-icon>mdi-target</v-icon>
            批量养成目标
          </span>
          <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
            已选 {{ selectedCount }} 名角色
          </v-chip>
        </v-card-title>

        <v-card-text class="uabt-content">
          <div class="uabt-field">
            <div class="uabt-field-title">
              <span>角色目标等级</span>
              <span class="uabt-value">Lv.{{ targetLevel }}</span>
            </div>
            <UcLevelSlider
              :current="1"
              :levels="avatarLevelOptions"
              :max="100"
              :model-value="targetLevel"
              @update:model-value="updateTargetLevel"
            />
            <v-checkbox
              :disabled="!targetAtAscensionLevel"
              :model-value="targetAscended"
              color="var(--tgc-od-green)"
              density="compact"
              hide-details
              label="到达目标等级后完成突破"
              @update:model-value="updateTargetAscended"
            />
            <span class="uabt-hint">
              {{
                targetAtAscensionLevel ? "将计入目标等级对应的突破材料" : "当前目标不是突破临界等级"
              }}
            </span>
          </div>

          <div class="uabt-field">
            <div class="uabt-field-title">
              <span>技能目标等级</span>
              <span class="uabt-value">Lv.{{ talentLevel }}</span>
            </div>
            <UcLevelSlider
              v-model="talentLevel"
              :current="1"
              :limit-max="talentLevelMax"
              :max="10"
            />
            <span class="uabt-hint">统一应用于普通攻击、元素战技与元素爆发</span>
          </div>

          <div class="uabt-field">
            <div class="uabt-field-title weapon">
              <v-checkbox
                v-model="includeWeapon"
                class="uabt-weapon-toggle"
                color="var(--tgc-od-blue)"
                density="compact"
                hide-details
                label="养成携带武器"
              />
              <span v-if="includeWeapon" class="uabt-value">Lv.{{ weaponTargetLevel }}</span>
            </div>
            <template v-if="includeWeapon">
              <UcLevelSlider v-model="weaponTargetLevel" :current="1" :max="90" />
              <v-checkbox
                v-model="weaponTargetAscended"
                :disabled="!weaponTargetAtAscensionLevel"
                color="var(--tgc-od-green)"
                density="compact"
                hide-details
                label="到达目标等级后完成突破"
              />
              <span class="uabt-hint">
                {{
                  weaponTargetAtAscensionLevel
                    ? "将计入武器目标等级对应的突破材料"
                    : "当前目标不是突破临界等级"
                }}
              </span>
            </template>
            <span v-else class="uabt-weapon-empty">
              勾选后，为每名角色的携带武器设置独立养成目标
            </span>
          </div>
        </v-card-text>

        <v-card-actions class="uabt-actions">
          <v-btn :disabled="loading" prepend-icon="mdi-close" variant="tonal" @click="cancel">
            取消
          </v-btn>
          <v-btn
            :disabled="selectedCount === 0"
            :loading
            color="var(--tgc-od-green)"
            prepend-icon="mdi-content-save-check-outline"
            variant="tonal"
            @click="confirm"
          >
            加入养成计划
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-bottom-sheet>
</template>

<script lang="ts" setup>
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import userCalc from "@utils/userCalc.js";
import { computed, ref, watch } from "vue";

type UavBatchTargetProps = {
  modelValue: {
    level: number;
    talentLevel: number;
    ascended: boolean;
    weapon: {
      enabled: boolean;
      level: number;
      ascended: boolean;
    };
  };
  selectedCount: number;
  loading: boolean;
};

type UavBatchTargetEmits = {
  confirm: [
    value: {
      level: number;
      talentLevel: number;
      ascended: boolean;
      weapon: { enabled: boolean; level: number; ascended: boolean };
    },
  ];
};

const props = defineProps<UavBatchTargetProps>();
const emits = defineEmits<UavBatchTargetEmits>();

const visible = defineModel<boolean>("show", { required: true });
const targetLevel = ref<number>(80);
const talentLevel = ref<number>(8);
const targetAscended = ref<boolean>(true);
const includeWeapon = ref<boolean>(false);
const weaponTargetLevel = ref<number>(90);
const weaponTargetAscended = ref<boolean>(false);
const avatarLevelOptions = userCalc.avatarLevelOptions();

const targetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(targetLevel.value),
);
const talentLevelMax = computed<number>(() =>
  userCalc.avatarTalentMaxLevel(targetLevel.value, targetAscended.value),
);
const weaponTargetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(weaponTargetLevel.value),
);

watch(
  () => visible.value,
  (value) => {
    if (!value) return;
    targetLevel.value = props.modelValue.level;
    talentLevel.value = Math.min(
      props.modelValue.talentLevel,
      userCalc.avatarTalentMaxLevel(props.modelValue.level, props.modelValue.ascended),
    );
    targetAscended.value = props.modelValue.ascended;
    includeWeapon.value = props.modelValue.weapon.enabled;
    weaponTargetLevel.value = props.modelValue.weapon.level;
    weaponTargetAscended.value = props.modelValue.weapon.ascended;
  },
);

watch(targetAtAscensionLevel, (value) => {
  if (!value) targetAscended.value = false;
});

watch(weaponTargetAtAscensionLevel, (value) => {
  if (!value) weaponTargetAscended.value = false;
});

function cancel(): void {
  visible.value = false;
}

function updateTargetLevel(value: number): void {
  targetLevel.value = value;
  targetAscended.value = false;
  talentLevel.value = userCalc.avatarTalentMaxLevel(value);
}

function updateTargetAscended(value: boolean | null): void {
  const nextAscended = value === true;
  targetAscended.value = nextAscended;
  talentLevel.value = userCalc.avatarTalentMaxLevel(targetLevel.value, nextAscended);
}

function confirm(): void {
  emits("confirm", {
    level: targetLevel.value,
    talentLevel: Math.min(talentLevel.value, talentLevelMax.value),
    ascended: targetAtAscensionLevel.value && targetAscended.value,
    weapon: {
      enabled: includeWeapon.value,
      level: weaponTargetLevel.value,
      ascended: weaponTargetAtAscensionLevel.value && weaponTargetAscended.value,
    },
  });
}
</script>

<style lang="scss" scoped>
.uabt-container {
  display: flex;
  width: 100%;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
  background: #00000066;
}

.uabt-card {
  width: min(960px, 100%);
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  box-shadow: 0 -4px 12px var(--common-shadow-2);
}

.uabt-title,
.uabt-heading,
.uabt-field-title,
.uabt-actions {
  display: flex;
  align-items: center;
}

.uabt-title {
  justify-content: space-between;
  font-family: var(--font-title);
  gap: 8px;
}

.uabt-heading {
  gap: 8px;
}

.uabt-content {
  display: grid;
  padding: 6px 12px;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.uabt-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  gap: 6px;
}

.uabt-field-title {
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);

  &.weapon {
    min-height: 28px;
  }
}

.uabt-weapon-toggle {
  flex: 0 1 auto;

  :deep(.v-selection-control) {
    min-height: 28px;
  }
}

.uabt-weapon-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  font-size: 12px;
  opacity: 0.68;
  text-align: center;
}

.uabt-value {
  color: var(--tgc-od-green);
}

.uabt-hint {
  color: var(--common-text-sub);
  font-size: 12px;
}

.uabt-actions {
  justify-content: flex-end;
  padding: 8px 16px 16px;
  gap: 8px;
}

@media (width <= 840px) {
  .uabt-content {
    grid-template-columns: 1fr;
  }
}
</style>
