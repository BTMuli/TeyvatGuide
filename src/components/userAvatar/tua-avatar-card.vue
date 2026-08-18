<!-- 角色列表卡片：左角色 / 右身份+武器 / 五圣遗物均分 + 名片底 -->
<template>
  <div class="tua-ac" title="点击查看详情">
    <div class="tua-ac-head">
      <div class="tua-ac-avatar">
        <img alt="" class="tua-ac-piece-bg" decoding="async" loading="lazy" :src="avatarStarBg" />
        <img
          :alt="role.avatar.name"
          class="tua-ac-piece-icon"
          decoding="async"
          loading="lazy"
          :src="avatarIcon"
        />
        <img alt="" class="tua-ac-piece-lt" decoding="async" loading="lazy" :src="elementIcon" />
        <span class="tua-ac-piece-rt">{{ role.avatar.actived_constellation_num }}</span>
      </div>
      <div class="tua-ac-side">
        <div class="tua-ac-id">
          <div class="tua-ac-name">
            <strong>{{ role.avatar.name }}</strong>
          </div>
          <div class="tua-ac-meta">
            <span>Lv.{{ role.avatar.level }}</span>
            <div :title="`好感度：${role.avatar.fetter}`" class="tua-ac-fetter">
              <img alt="fetter" decoding="async" loading="lazy" src="/icon/material/105.webp" />
              <span>{{ role.avatar.fetter }}</span>
            </div>
            <span
              v-if="role.costumes.length > 0"
              :title="`衣装: ${role.costumes.map((item) => item.name).join(', ')}`"
              class="tua-ac-costume"
            >
              <v-icon size="14">mdi-tshirt-crew</v-icon>
            </span>
          </div>
          <span class="tua-ac-wname">{{ role.weapon.name }}</span>
        </div>
        <div class="tua-ac-weapon">
          <div class="tua-ac-weapon-icon">
            <img
              alt=""
              class="tua-ac-piece-bg"
              decoding="async"
              loading="lazy"
              :src="weaponStarBg"
            />
            <img
              :alt="role.weapon.name"
              class="tua-ac-piece-icon"
              decoding="async"
              loading="lazy"
              :src="weaponIcon"
            />
            <img
              alt=""
              class="tua-ac-piece-lt"
              decoding="async"
              loading="lazy"
              :src="weaponTypeIcon"
            />
          </div>
          <div class="tua-ac-wmeta">
            <span :title="`精炼${role.weapon.affix_level}阶`" class="tua-ac-affix">
              <v-icon size="12">mdi-star-four-points-outline</v-icon>
              {{ role.weapon.affix_level }}
            </span>
            <span>Lv.{{ role.weapon.level }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="tua-ac-relics">
      <div
        v-for="relicSlot in relicSlots"
        :key="relicSlot.position"
        class="tua-ac-relic"
        :title="relicTitles[relicSlot.position]"
        @mouseenter="ensureRelicTitle(relicSlot)"
      >
        <div class="tua-ac-relic-bg">
          <img
            v-if="relicSlot.relic !== false"
            alt=""
            decoding="async"
            loading="lazy"
            :src="`/icon/bg/${relicSlot.relic.rarity}-Star.webp`"
          />
        </div>
        <div class="tua-ac-relic-icon">
          <img
            v-if="relicSlot.relic === false"
            alt=""
            class="empty"
            decoding="async"
            loading="lazy"
            :src="`/icon/relic/${relicSlot.position}.webp`"
          />
          <img
            v-else
            :alt="relicSlot.relic.name"
            decoding="async"
            loading="lazy"
            :src="relicSlot.relic.icon"
          />
        </div>
      </div>
    </div>
    <div class="tua-ac-mid">
      <img
        :src="nameCard"
        alt=""
        :class="{ ori: isFetterMax }"
        class="tua-ac-card"
        decoding="async"
        loading="lazy"
      />
      <div class="tua-ac-veil" />
      <div :class="{ triple: skills.length === 3 }" class="tua-ac-skills">
        <div
          v-for="skill in skills"
          :key="skill.skill_id"
          :title="`${skill.name} Lv.${skill.level}`"
          class="tua-ac-skill"
        >
          <img :src="skill.icon" :alt="skill.name" decoding="async" loading="lazy" />
          <span>Lv.{{ skill.level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import TSUserAvatar from "@Sqlm/userAvatar.js";
import { getRcStar, getZhElement } from "@utils/toolFunc.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, ref } from "vue";

import { AppCalendarData, AppCharacterData } from "@/data/index.js";

type TuaAvatarCardProps = { role: TGApp.Sqlite.Character.TableTrans };
type RelicSlot = { position: number; relic: TGApp.Game.Avatar.Relic | false };

const calendarIdSet = new Set(AppCalendarData.map((item) => item.id));
const characterById = new Map(AppCharacterData.map((item) => [item.id, item]));
const relicPosNames = <const>["未知", "生之花", "死之羽", "时之沙", "空之杯", "理之冠"];

const { role } = defineProps<TuaAvatarCardProps>();
const relicTitles = ref<Record<number, string>>({});

const avatarStarBg = computed<string>(
  () => `/icon/bg/${getRcStar(role.cid, role.avatar.rarity)}-Star.webp`,
);
const avatarIcon = computed<string>(() => {
  const costume = getEquippedCostume();
  if (costume) return `/WIKI/costume/${costume.id}.webp`;
  if (calendarIdSet.has(role.avatar.id)) return `/WIKI/character/${role.avatar.id}.webp`;
  return role.avatar.icon;
});
const elementIcon = computed<string>(
  () => `/icon/element/${getZhElement(role.avatar.element)}元素.webp`,
);
const weaponStarBg = computed<string>(() => `/icon/bg/${role.weapon.rarity}-Star.webp`);
const weaponIcon = computed<string>(() => {
  if (calendarIdSet.has(role.weapon.id)) return `/WIKI/weapon/${role.weapon.id}.webp`;
  return role.weapon.icon;
});
const weaponTypeIcon = computed<string>(() => `/icon/weapon/${role.weapon.type_name}.webp`);
const relicSlots = computed<Array<RelicSlot>>(() =>
  [1, 2, 3, 4, 5].map((position) => ({
    position,
    relic: role.relics.find((item) => item.pos === position) ?? false,
  })),
);
const skills = computed<Array<TGApp.Game.Avatar.Skill>>(() =>
  role.skills.filter((skill) => skill.skill_type === 1),
);
const isFetterMax = computed<boolean>(() => {
  const skipList = [10000005, 10000007, 10000117, 10000118];
  if (skipList.includes(role.avatar.id)) return true;
  return role.avatar.fetter === 10;
});
const nameCard = computed<string>(
  () => `/WIKI/nameCard/profile/${TSUserAvatar.getAvatarCard(role.avatar.id)}.webp`,
);

function getEquippedCostume(): TGApp.App.Character.Costume | false {
  if (role.costumes.length === 0) return false;
  const wiki = characterById.get(role.cid);
  if (!wiki) return false;
  for (const costume of role.costumes) {
    const found = wiki.costumes.find((item) => item.id === costume.id);
    if (found !== undefined && !found.isDefault) return found;
  }
  return false;
}

function ensureRelicTitle(slot: RelicSlot): void {
  if (relicTitles.value[slot.position] !== undefined) return;
  relicTitles.value = {
    ...relicTitles.value,
    [slot.position]: buildRelicTitle(slot),
  };
}

function buildRelicTitle(slot: RelicSlot): string {
  const posName = relicPosNames[slot.position] ?? "未知";
  if (slot.relic === false) return `${posName}：未装备`;
  const lines: Array<string> = [];
  const mainProp = wikiUtils.getProp(slot.relic.main_property.property_type);
  lines.push(
    `主词条：${mainProp === false ? "未知属性" : mainProp.name} ${slot.relic.main_property.value}`,
  );
  lines.push("副词条：");
  for (const relicProp of slot.relic.sub_property_list) {
    const subProp = wikiUtils.getProp(relicProp.property_type);
    lines.push(
      `  ${subProp === false ? "未知属性" : subProp.name} ${relicProp.value}(+${relicProp.times})`,
    );
  }
  return `${posName}：\n${slot.relic.name} Lv.${slot.relic.level}\n${lines.join("\n")}`;
}
</script>

<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tua-ac {
  @include github-styles.github-card;

  position: relative;
  display: flex;
  width: 100%;
  min-width: 220px;
  max-width: 280px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  row-gap: 4px;
}

.dark .tua-ac {
  @include github-styles.github-card("dark");
}

.tua-ac-head {
  display: flex;
  width: 100%;
  min-width: 210px;
  align-items: stretch;
  column-gap: 4px;
}

.tua-ac-avatar,
.tua-ac-weapon-icon {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 4px;
}

.tua-ac-avatar {
  width: 100px;
  height: 100px;
}

.tua-ac-weapon-icon {
  width: 40px;
  height: 40px;
}

.tua-ac-piece-bg,
.tua-ac-piece-icon {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: cover;
}

.tua-ac-piece-bg {
  z-index: 0;
}

.tua-ac-piece-icon {
  z-index: 1;
}

.tua-ac-piece-lt {
  position: absolute;
  z-index: 2;
  top: 3%;
  left: 3%;
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.tua-ac-weapon-icon .tua-ac-piece-lt {
  width: 16px;
  height: 16px;
}

.tua-ac-piece-rt {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  background: #00000066;
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.tua-ac-side {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.tua-ac-id {
  display: flex;
  min-height: 0;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 0;
}

.tua-ac-name {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;

  strong {
    overflow: hidden;
    min-width: 0;
    color: inherit;
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tua-ac-meta {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-sub);
  column-gap: 8px;
  font-size: 12px;
  line-height: 14px;
}

.tua-ac-fetter {
  display: flex;
  align-items: center;
  gap: 2px;

  img {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }
}

.tua-ac-wname {
  overflow: hidden;
  padding-top: 2px;
  border-top: 1px dotted var(--common-shadow-2);
  margin-top: 2px;
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 14px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-ac-costume {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 14px;
}

.tua-ac-weapon {
  display: flex;
  height: 40px;
  min-height: 0;
  flex-shrink: 0;
  align-items: center;
  column-gap: 4px;
}

.tua-ac-wmeta {
  display: flex;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: transparent;
  gap: 0;

  span {
    overflow: hidden;
    color: var(--common-text-sub);
    font-size: 12px;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tua-ac-affix {
  display: flex;
  align-items: center;
  column-gap: 2px;
}

.tua-ac-relics {
  display: grid;
  width: 100%;
  column-gap: 2px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.tua-ac-relic {
  position: relative;
  width: 100%;
  border-radius: 2px;
  aspect-ratio: 1 / 1;
}

.tua-ac-relic-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    object-fit: cover;
  }
}

.tua-ac-relic-icon {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    width: 60%;
    height: 60%;
    padding: 0;
  }
}

.tua-ac-mid {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  aspect-ratio: 21 / 10;
}

.tua-ac-card {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  filter: grayscale(1);
  inset: 0;
  object-fit: cover;
  object-position: center 35%;
  transition: filter 0.5s ease-in-out;

  &.ori {
    filter: unset;
  }
}

.tua-ac:hover .tua-ac-card {
  filter: grayscale(0);
}

.tua-ac-veil {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, #00000099 0%, #00000040 55%, #00000026 100%);
  inset: 0;
}

.tua-ac-skills {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: flex-end;
  justify-content: center;
  padding: 4px;
  column-gap: 8px;

  &.triple {
    column-gap: 16px;
  }
}

.tua-ac-skill {
  display: flex;
  width: calc((100% - 24px) / 4);
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  row-gap: 4px;

  :first-child {
    position: relative;
    display: flex;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 12.5%;
    border-radius: 50%;
    aspect-ratio: 1 / 1;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    background: #00000033;
    object-fit: contain;
  }

  :last-child {
    display: flex;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    background: #00000033;
    color: #ffffffff;
    font-size: 10px;
    font-weight: normal;
  }
}
</style>
