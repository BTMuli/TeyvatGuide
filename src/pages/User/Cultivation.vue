<!-- 养成计算（开发环境） -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="cultivation-title">
        <v-icon color="var(--tgc-od-orange)">mdi-calculator-variant-outline</v-icon>
        <span>养成计算</span>
        <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">DEV</v-chip>
      </div>
    </template>
    <template #append>
      <v-select
        v-model="currentUid"
        :hide-details="true"
        :items="uidList"
        density="compact"
        label="数据 UID"
        variant="outlined"
        width="190"
      />
      <v-btn
        :loading="loading"
        icon="mdi-refresh"
        title="重新加载"
        variant="text"
        @click="reload"
      />
    </template>
  </v-app-bar>

  <div class="cultivation-page">
    <div v-if="uidList.length === 0" class="cultivation-empty">
      <v-icon size="64">mdi-database-off-outline</v-icon>
      <span>没有可用于计算的角色或背包存档</span>
    </div>

    <template v-else>
      <div class="cultivation-config">
        <UcCharacterPanel
          v-model:ascended="avatarAscended"
          v-model:selected-id="selectedCharacterId"
          v-model:talent-target-levels="talentTargetLevels"
          v-model:target-level="avatarTargetLevel"
          :at-ascension-level="avatarAtAscensionLevel"
          :level-options="avatarLevelOptions"
          :options="characterOptions"
          :selected-role="selectedRole"
          :skills="mainSkills"
          :weapon-type="selectedRoleWeaponType"
        />
        <UcWeaponPanel
          v-model:ascended="weaponAscended"
          v-model:selected-key="selectedWeaponKey"
          v-model:target-level="weaponTargetLevel"
          v-model:use-bag-source="useBagWeaponSource"
          :at-ascension-level="weaponAtAscensionLevel"
          :has-bag-data="hasBagWeaponData"
          :level-options="weaponLevelOptions"
          :options="weaponOptions"
          :selected-weapon="selectedWeapon"
        />
      </div>

      <UcMaterialResult :materials="resultMaterials" :missing-kinds="missingKinds" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import useUserStore from "@store/user.js";
import UcCharacterPanel from "@comp/userCalc/uc-character-panel.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import type {
  UserCalcCharacterOption,
  UserCalcResultMaterial,
  UserCalcWeaponOption,
} from "@comp/userCalc/uc-types.js";
import UcWeaponPanel from "@comp/userCalc/uc-weapon-panel.vue";
import cultivationUtils, { type CultivationMaterial } from "@utils/cultivationUtils.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import { getWikiCharacterById, WikiMaterialData, wwWeapon } from "@/data/index.js";

const EXCLUDED_CHARACTER_IDS = new Set([10000117, 10000118]);

const { account } = storeToRefs(useUserStore());

const loading = ref<boolean>(false);
const currentUid = ref<number>();
const selectedCharacterId = ref<number | null>(null);
const selectedWeaponKey = ref<string | null>(null);
const avatarTargetLevel = ref<number>(90);
const talentTargetLevels = ref<Array<number>>([10, 10, 10]);
const weaponTargetLevel = ref<number>(90);
const avatarAscended = ref<boolean>(false);
const weaponAscended = ref<boolean>(false);
const useBagWeaponSource = ref<boolean>(true);

const uidList = shallowRef<Array<number>>([]);
const roles = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const weapons = shallowRef<Array<UserCalcWeaponOption>>([]);
const bagMaterials = shallowRef<Map<number, number>>(new Map());
const avatarWiki = shallowRef<TGApp.App.Character.WikiItem | false>(false);

const characterOptions = computed<Array<UserCalcCharacterOption>>(() =>
  roles.value.map((role) => ({
    title: `${role.avatar.name} · Lv.${role.avatar.level}`,
    value: role.cid,
  })),
);
const selectedRole = computed<TGApp.Sqlite.Character.TableTrans | undefined>(() =>
  roles.value.find((role) => role.cid === selectedCharacterId.value),
);
const selectedRoleWeaponType = computed<string>(() => {
  if (!selectedRole.value) return "";
  return (
    wwWeapon.find((weapon) => weapon.id === selectedRole.value?.weapon.id)?.weapon ?? "未知武器"
  );
});
const hasBagWeaponData = computed<boolean>(() => weapons.value.some((weapon) => weapon.fromBag));
const weaponOptions = computed<Array<UserCalcWeaponOption>>(() => {
  const useBag = hasBagWeaponData.value && useBagWeaponSource.value;
  return weapons.value.filter((weapon) => {
    if (weapon.fromBag !== useBag) return false;
    return !selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value;
  });
});
const selectedWeapon = computed<UserCalcWeaponOption | undefined>(() =>
  weaponOptions.value.find((weapon) => weapon.key === selectedWeaponKey.value),
);
const mainSkills = computed<Array<TGApp.Game.Avatar.Skill>>(() =>
  (selectedRole.value?.skills ?? [])
    .filter((skill) => skill.skill_type === 1 && skill.is_unlock)
    .slice(0, 3),
);
const avatarLevelOptions = computed<Array<number>>(() => {
  if (!selectedRole.value) return [];
  return createLevelOptions(90);
});
const weaponLevelOptions = computed<Array<number>>(() => {
  if (!selectedWeapon.value) return [];
  return createLevelOptions(cultivationUtils.weaponMaxLevel(selectedWeapon.value.wiki.star));
});
const avatarAtAscensionLevel = computed<boolean>(() =>
  cultivationUtils.isAscensionLevel(selectedRole.value?.avatar.level ?? 0),
);
const weaponAtAscensionLevel = computed<boolean>(() =>
  cultivationUtils.isAscensionLevel(selectedWeapon.value?.level ?? 0),
);
const avatarCurrentPromoteLevel = computed<number>(() => {
  if (!selectedRole.value) return 0;
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>selectedRole.value.avatar;
  return cultivationUtils.resolvePromoteLevel(
    avatar.level,
    avatar.promote_level,
    avatarAtAscensionLevel.value ? avatarAscended.value : undefined,
  );
});
const weaponCurrentPromoteLevel = computed<number>(() => {
  if (!selectedWeapon.value) return 0;
  if (selectedWeapon.value.fromBag) return selectedWeapon.value.promoteLevel;
  return cultivationUtils.resolvePromoteLevel(
    selectedWeapon.value.level,
    selectedWeapon.value.promoteLevel,
    weaponAtAscensionLevel.value ? weaponAscended.value : undefined,
  );
});

const requiredMaterials = computed<Array<CultivationMaterial>>(() => {
  const groups: Array<Array<CultivationMaterial>> = [];
  if (selectedRole.value && avatarWiki.value) {
    groups.push(
      cultivationUtils.avatar(
        selectedRole.value,
        avatarWiki.value,
        avatarTargetLevel.value,
        talentTargetLevels.value,
        avatarCurrentPromoteLevel.value,
      ),
    );
  }
  if (selectedWeapon.value) {
    groups.push(
      cultivationUtils.weapon(
        selectedWeapon.value.wiki,
        selectedWeapon.value.level,
        weaponCurrentPromoteLevel.value,
        weaponTargetLevel.value,
      ),
    );
  }
  return cultivationUtils.merge(...groups);
});
const resultMaterials = computed<Array<UserCalcResultMaterial>>(() =>
  requiredMaterials.value
    .map((required) => {
      const info = WikiMaterialData.find((material) => material.id === required.id);
      const owned = bagMaterials.value.get(required.id) ?? 0;
      return {
        id: required.id,
        name: info?.name ?? `材料 ${required.id}`,
        type: info?.type ?? "未知类型",
        star: info?.star ?? 1,
        required: required.count,
        owned,
        missing: Math.max(required.count - owned, 0),
        progress: required.count === 0 ? 100 : Math.min((owned / required.count) * 100, 100),
      };
    })
    .sort((a, b) => b.missing - a.missing || b.star - a.star || a.id - b.id),
);
const missingKinds = computed<number>(
  () => resultMaterials.value.filter((material) => material.missing > 0).length,
);

watch(currentUid, async (uid) => {
  if (uid !== undefined) await loadUidData(uid);
});

watch(selectedRole, async (role) => {
  avatarWiki.value = false;
  if (!role) return;
  const characterId = role.cid;
  avatarTargetLevel.value = 90;
  talentTargetLevels.value = mainSkills.value.map(() => 10);
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  avatarAscended.value = cultivationUtils.isAscendedAtThreshold(avatar.level, avatar.promote_level);
  selectPreferredWeapon();
  const wiki = await getWikiCharacterById(characterId);
  if (selectedCharacterId.value === characterId) avatarWiki.value = wiki;
});

watch(weaponOptions, () => selectPreferredWeapon());

watch(selectedWeapon, (weapon) => {
  if (!weapon) return;
  weaponTargetLevel.value = cultivationUtils.weaponMaxLevel(weapon.wiki.star);
  weaponAscended.value = cultivationUtils.isAscendedAtThreshold(weapon.level, weapon.promoteLevel);
});

onMounted(reload);

function createLevelOptions(max: number): Array<number> {
  return Array.from({ length: max }, (_, index) => index + 1);
}

function selectPreferredWeapon(): void {
  const options = weaponOptions.value;
  if (options.length === 0) {
    selectedWeaponKey.value = null;
    return;
  }
  if (options.some((weapon) => weapon.key === selectedWeaponKey.value)) return;
  const roleWeaponId = selectedRole.value?.weapon.id;
  selectedWeaponKey.value =
    options.find((weapon) => weapon.wiki.id === roleWeaponId)?.key ?? options[0].key;
}

async function reload(): Promise<void> {
  loading.value = true;
  const [avatarUids, materialUids, weaponUids] = await Promise.all([
    TSUserAvatar.getAllUid(),
    TSUserBagMaterial.getAllUid(),
    TSUserBagWeapon.getAllUid(),
  ]);
  uidList.value = Array.from(
    new Set([...avatarUids.map(Number), ...materialUids, ...weaponUids]),
  ).sort((a, b) => a - b);
  const loginUid = Number(account.value.gameUid);
  const nextUid = uidList.value.includes(loginUid) ? loginUid : uidList.value[0];
  const reloadCurrentUid = currentUid.value === nextUid;
  currentUid.value = nextUid;
  if (nextUid !== undefined && reloadCurrentUid) await loadUidData(nextUid);
  loading.value = false;
}

async function loadUidData(uid: number): Promise<void> {
  loading.value = true;
  const [roleData, materialData, weaponData] = await Promise.all([
    TSUserAvatar.getAvatars(uid),
    TSUserBagMaterial.getMaterial(uid),
    TSUserBagWeapon.getWeapon(uid),
  ]);
  roles.value = roleData
    .filter((role) => !EXCLUDED_CHARACTER_IDS.has(role.cid))
    .sort(
      (a, b) =>
        a.avatar.level - b.avatar.level || b.avatar.rarity - a.avatar.rarity || a.cid - b.cid,
    );
  bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
  weapons.value = buildWeaponOptions(weaponData, roles.value);
  useBagWeaponSource.value = weapons.value.some((weapon) => weapon.fromBag);
  selectedWeaponKey.value = null;
  selectedCharacterId.value = roles.value[0]?.cid ?? null;
  if (selectedCharacterId.value === null) selectPreferredWeapon();
  loading.value = false;
}

function buildWeaponOptions(
  bagWeapons: Array<TGApp.Sqlite.UserBag.WeaponTable>,
  roleData: Array<TGApp.Sqlite.Character.TableTrans>,
): Array<UserCalcWeaponOption> {
  const result: Array<UserCalcWeaponOption> = [];
  for (const bagWeapon of bagWeapons) {
    const wiki = wwWeapon.find((weapon) => weapon.id === bagWeapon.id);
    if (!wiki) continue;
    const affixValues = Object.values(bagWeapon.info.affix_map);
    result.push({
      key: `bag-${bagWeapon.guid}`,
      title: `${wiki.name} · Lv.${bagWeapon.info.level}`,
      wiki,
      level: bagWeapon.info.level,
      promoteLevel: bagWeapon.info.promote_level,
      affixLevel: Math.max(0, ...affixValues) + 1,
      fromBag: true,
      locked: bagWeapon.info.is_locked,
      guid: bagWeapon.guid,
    });
  }
  for (const role of roleData) {
    const roleWeapon = role.weapon;
    const wiki = wwWeapon.find((weapon) => weapon.id === roleWeapon.id);
    if (!wiki) continue;
    result.push({
      key: `role-${role.cid}-${roleWeapon.id}`,
      title: `${wiki.name} · Lv.${roleWeapon.level}`,
      wiki,
      level: roleWeapon.level,
      promoteLevel: roleWeapon.promote_level,
      affixLevel: roleWeapon.affix_level,
      fromBag: false,
      locked: false,
    });
  }
  return result.sort(
    (a, b) =>
      b.wiki.star - a.wiki.star || b.level - a.level || a.wiki.name.localeCompare(b.wiki.name),
  );
}
</script>

<style lang="scss" scoped>
.cultivation-title {
  display: flex;
  align-items: center;
  padding-left: 12px;
  font-family: var(--font-title);
  font-size: 18px;
  gap: 8px;
}

.cultivation-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
}

.cultivation-config {
  display: grid;
  align-items: stretch;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cultivation-empty {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 12px;
}

@media (width <= 900px) {
  .cultivation-config {
    grid-template-columns: 1fr;
  }
}

@media (width <= 600px) {
  .cultivation-page {
    padding: 8px;
  }
}
</style>
