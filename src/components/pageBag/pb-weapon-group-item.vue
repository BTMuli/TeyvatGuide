<!-- 背包武器合并组卡片 -->
<template>
  <button
    :aria-label="ariaLabel"
    :data-group-key="props.group.key"
    class="pb-wgi"
    type="button"
    @click="emits('select', props.group.key)"
  >
    <span aria-hidden="true" class="pb-wgi-art">
      <span :style="{ '--stack-depth': stackBackgroundItems.length }" class="pb-wgi-stack">
        <span
          v-for="(item, layerIndex) in stackBackgroundItems"
          :key="item.guid"
          :class="`pb-wgi-layer-${layerIndex + 1}`"
          class="pb-wgi-layer"
        >
          <img
            :src="`/icon/bg/${item.info.star}-Star.webp`"
            alt=""
            decoding="async"
            loading="lazy"
          />
        </span>
        <span class="pb-wgi-icon">
          <img
            :src="`/icon/bg/${props.group.star}-Star.webp`"
            alt=""
            class="pb-wgi-icon-bg"
            decoding="async"
            loading="lazy"
          />
          <img
            :src="`/WIKI/weapon/${props.group.representative.info.id}.webp`"
            alt=""
            class="pb-wgi-icon-item"
            decoding="async"
            loading="lazy"
          />
          <img
            :src="`/icon/weapon/${props.group.weaponType}.webp`"
            alt=""
            class="pb-wgi-icon-type"
            decoding="async"
            loading="lazy"
          />
        </span>
      </span>
    </span>
    <span class="pb-wgi-content">
      <span class="pb-wgi-heading">
        <span class="pb-wgi-title">{{ props.group.name }}</span>
        <span aria-hidden="true" class="pb-wgi-count">×{{ props.group.totalCount }}</span>
      </span>
      <span class="pb-wgi-kicker">
        <span class="pb-wgi-type">
          <img
            :src="`/icon/weapon/${props.group.weaponType}.webp`"
            alt=""
            decoding="async"
            loading="lazy"
          />
          <span>{{ props.group.weaponType }}</span>
        </span>
        <span aria-hidden="true" class="pb-wgi-separator">·</span>
        <span class="pb-wgi-star">{{ props.group.star }}★</span>
      </span>
      <span class="pb-wgi-specs">
        <span :title="'等级 ' + levelSummary" :aria-label="'等级 ' + levelSummary"
          ><v-icon aria-hidden="true" size="14">mdi-arrow-up-bold-outline</v-icon
          >{{ levelSummary.replace("Lv.", "") }}</span
        >
        <span :title="'精炼 ' + refineSummary" :aria-label="'精炼 ' + refineSummary"
          ><v-icon aria-hidden="true" size="14">mdi-star-four-points-outline</v-icon
          >{{ refineSummary.replaceAll("精", "") }}</span
        >
        <span
          v-if="props.group.lockedCount"
          title="锁定"
          :aria-label="'锁定 ' + props.group.lockedCount"
          ><v-icon aria-hidden="true" size="14">mdi-lock-outline</v-icon
          >{{ props.group.lockedCount }}</span
        >
        <span
          v-if="props.group.equippedCount"
          title="已装备"
          :aria-label="'已装备 ' + props.group.equippedCount"
          ><v-icon aria-hidden="true" size="14">mdi-account-outline</v-icon
          >{{ props.group.equippedCount }}</span
        >
      </span>
      <span v-if="hasPartialMatch" class="pb-wgi-footer">
        <span v-if="hasPartialMatch" aria-hidden="true" class="pb-wgi-match">
          <v-icon size="13">mdi-filter-check-outline</v-icon>
          <span>匹配</span>
          <strong>{{ props.group.visibleCount }}</strong>
          <span>/ {{ props.group.totalCount }}</span>
        </span>
      </span>
    </span>
  </button>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type PbWeaponGroupItemProps = {
  group: TGApp.App.UserBag.WeaponGroup;
  showMatchCount: boolean;
};
type PbWeaponGroupItemEmits = { select: [groupKey: string] };

const props = defineProps<PbWeaponGroupItemProps>();
const emits = defineEmits<PbWeaponGroupItemEmits>();

const STACK_LIMIT: Readonly<number> = 4;
const hasPartialMatch = computed<boolean>(
  () => props.showMatchCount && props.group.visibleCount < props.group.totalCount,
);
const stackBackgroundItems = computed<Array<TGApp.App.UserBag.WeaponItem>>(() =>
  props.group.items.slice(1, STACK_LIMIT),
);
const levelSummary = computed<string>(() =>
  props.group.minLevel === props.group.maxLevel
    ? `Lv.${props.group.maxLevel}`
    : `Lv.${props.group.minLevel}–${props.group.maxLevel}`,
);
const refineSummary = computed<string>(() =>
  props.group.minRefine === props.group.maxRefine
    ? `精${props.group.maxRefine}`
    : `精${props.group.minRefine}–${props.group.maxRefine}`,
);
const statusSummary = computed<string>(() => {
  const parts: Array<string> = [];
  if (props.group.equippedCount > 0) parts.push(`已装备 ${props.group.equippedCount}`);
  if (props.group.lockedCount > 0) parts.push(`锁定 ${props.group.lockedCount}`);
  return parts.join(" · ");
});
const ariaLabel = computed<string>(() => {
  const match = hasPartialMatch.value
    ? `，匹配 ${props.group.visibleCount} 件，共 ${props.group.totalCount} 件`
    : `，共 ${props.group.totalCount} 件`;
  const status = statusSummary.value === "" ? "" : `，${statusSummary.value}`;
  return `${props.group.name}，${props.group.star} 星${props.group.weaponType}，${levelSummary.value}，${refineSummary.value}${status}${match}，进入组内工作台`;
});
</script>

<style lang="scss" scoped>
.pb-wgi {
  display: flex;
  overflow: hidden;
  min-height: 124px;
  box-sizing: border-box;
  align-items: stretch;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  column-gap: 12px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: none;
}

.pb-wgi:hover {
  border-color: var(--common-text-title);
  background: var(--box-bg-3);
}

.pb-wgi:active {
  background: var(--box-bg-4);
}

.pb-wgi:focus-visible {
  outline: 2px solid var(--tgc-yellow-3);
  outline-offset: 2px;
}

.pb-wgi-art {
  position: relative;
  width: 88px;
  height: 88px;
  flex: none;
  align-self: center;
}

.pb-wgi-stack {
  --stack-front-top: calc(9px + var(--stack-depth) * 3px);
  --stack-front-left: calc(9px - var(--stack-depth) * 3px);

  position: relative;
  width: 88px;
  height: 88px;
  flex: none;
}

.pb-wgi-layer,
.pb-wgi-icon {
  position: absolute;
  overflow: hidden;
  width: 68px;
  height: 68px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);
  box-shadow: 0 2px 4px var(--common-shadow-1);
}

.pb-wgi-layer-1 {
  z-index: 4;
  top: calc(var(--stack-front-top) - 6px);
  left: calc(var(--stack-front-left) + 6px);
}

.pb-wgi-layer-2 {
  z-index: 3;
  top: calc(var(--stack-front-top) - 12px);
  left: calc(var(--stack-front-left) + 12px);
}

.pb-wgi-layer-3 {
  z-index: 2;
  top: calc(var(--stack-front-top) - 18px);
  left: calc(var(--stack-front-left) + 18px);
}

.pb-wgi-icon {
  z-index: 5;
  top: var(--stack-front-top);
  left: var(--stack-front-left);
}

.pb-wgi-layer > img,
.pb-wgi-icon-bg,
.pb-wgi-icon-item {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
}

.pb-wgi-layer > img,
.pb-wgi-icon-bg {
  object-fit: cover;
}

.pb-wgi-icon-item {
  object-fit: contain;
}

.pb-wgi-icon-type {
  position: absolute;
  z-index: 1;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
}

.pb-wgi-content {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-self: stretch;
  justify-content: center;
  gap: 4px;
}

.pb-wgi-heading,
.pb-wgi-kicker,
.pb-wgi-specs,
.pb-wgi-footer {
  display: flex;
  min-width: 0;
  align-items: center;
}

.pb-wgi-heading {
  justify-content: space-between;
  column-gap: 8px;
}

.pb-wgi-title {
  overflow: hidden;
  min-width: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wgi-count {
  flex: none;
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.pb-wgi-kicker,
.pb-wgi-specs,
.pb-wgi-status,
.pb-wgi-match {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.pb-wgi-kicker,
.pb-wgi-specs {
  flex-wrap: nowrap;
  gap: 8px;
}

.pb-wgi-type {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.pb-wgi-type span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wgi-type img {
  width: 16px;
  height: 16px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-wgi-star {
  color: var(--common-text-title);
  font-weight: 600;
  white-space: nowrap;
}

.pb-wgi-separator {
  color: var(--common-shadow-4);
}

.pb-wgi-footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2px 8px;
}

.pb-wgi-status {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-wgi-match {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--common-text-title);
  gap: 3px;
  white-space: nowrap;
}

.pb-wgi-match strong {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .pb-wgi {
    transition: none;
  }
}

.pb-wgi-specs {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
  white-space: nowrap;
}

.pb-wgi-specs > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
