<!-- 背包圣遗物合并组卡片 -->
<template>
  <button
    :aria-label="ariaLabel"
    :data-group-key="props.group.key"
    class="pb-rgi"
    type="button"
    @click="emits('select', props.group.key)"
  >
    <span :style="{ '--stack-depth': stackBackgroundItems.length }" class="pb-rgi-stack">
      <span
        v-for="(item, layerIndex) in stackBackgroundItems"
        :key="item.guid"
        :class="`pb-rgi-layer-${layerIndex + 1}`"
        class="pb-rgi-layer"
      >
        <img :src="`/icon/bg/${item.brief.star}-Star.webp`" alt="" />
      </span>
      <span class="pb-rgi-icon">
        <img
          :src="`/icon/bg/${props.group.representative.brief.star}-Star.webp`"
          alt=""
          class="pb-rgi-icon-bg"
        />
        <img
          :src="`/WIKI/relic/${props.group.representative.brief.icon}.webp`"
          :alt="props.group.setName"
          class="pb-rgi-set-icon"
        />
      </span>
    </span>
    <span class="pb-rgi-content">
      <span class="pb-rgi-heading">
        <span class="pb-rgi-title">{{ props.group.setName }}</span>
        <span class="pb-rgi-count">×{{ props.group.totalCount }}</span>
      </span>
      <span class="pb-rgi-positions" aria-label="部位分布">
        <span v-for="position in props.group.positionCounts" :key="position.position">
          <img :src="`/icon/relic/${position.position}.webp`" alt="" />
          <span>{{ position.count }}</span>
        </span>
      </span>
      <span class="pb-rgi-meta">{{ starSummary }}</span>
      <span class="pb-rgi-specs">
        <span :title="'等级 ' + levelSummary" :aria-label="'等级 ' + levelSummary"
          ><v-icon aria-hidden="true" size="14">mdi-arrow-up-bold-outline</v-icon
          >{{ levelSummary.replace("Lv.", "") }}</span
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
      <span v-if="hasPartialMatch" class="pb-rgi-match">
        <v-icon size="13">mdi-filter-check-outline</v-icon>
        <span>匹配</span>
        <strong>{{ props.group.visibleCount }}</strong>
        <span>/ {{ props.group.totalCount }}</span>
      </span>
    </span>
  </button>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type PbRelicGroupItemProps = {
  group: TGApp.App.UserBag.RelicGroup;
  showMatchCount: boolean;
};
type PbRelicGroupItemEmits = { select: [groupKey: string] };

const props = defineProps<PbRelicGroupItemProps>();
const emits = defineEmits<PbRelicGroupItemEmits>();

const STACK_LIMIT: Readonly<number> = 4;
const hasPartialMatch = computed<boolean>(
  () => props.showMatchCount && props.group.visibleCount < props.group.totalCount,
);
const stackBackgroundItems = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  props.group.items.slice(1, STACK_LIMIT),
);
const starSummary = computed<string>(() =>
  props.group.starCounts.map(({ star, count }) => `${star}★×${count}`).join(" · "),
);
const levelSummary = computed<string>(() => {
  const levels = props.group.items.map((item) => item.level - 1);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  return min === max ? `Lv.${max}` : `Lv.${min}–${max}`;
});
const statusSummary = computed<string>(() => {
  const parts: Array<string> = [];
  if (props.group.equippedCount > 0) parts.push(`已装备 ${props.group.equippedCount}`);
  if (props.group.markedCount > 0) parts.push(`标记 ${props.group.markedCount}`);
  if (props.group.lockedCount > 0) parts.push(`锁定 ${props.group.lockedCount}`);
  return parts.join(" · ");
});
const ariaLabel = computed<string>(() => {
  const match = hasPartialMatch.value
    ? `，匹配 ${props.group.visibleCount} 件，共 ${props.group.totalCount} 件`
    : `，共 ${props.group.totalCount} 件`;
  return `${props.group.setName}套装，共 ${props.group.positionCounts.length} 个部位${match}，${statusSummary.value}，进入组内工作台`;
});
</script>

<style lang="scss" scoped>
.pb-rgi {
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

.pb-rgi:hover {
  border-color: var(--common-text-title);
  background: var(--box-bg-3);
}

.pb-rgi:active {
  background: var(--box-bg-4);
}

.pb-rgi:focus-visible {
  outline: 2px solid var(--tgc-yellow-3);
  outline-offset: 2px;
}

.pb-rgi-stack {
  --stack-front-top: calc(9px + var(--stack-depth) * 3px);
  --stack-front-left: calc(9px - var(--stack-depth) * 3px);

  position: relative;
  width: 88px;
  height: 88px;
  flex: none;
  align-self: center;
}

.pb-rgi-layer,
.pb-rgi-icon {
  position: absolute;
  overflow: hidden;
  width: 68px;
  height: 68px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);
  box-shadow: 0 2px 4px var(--common-shadow-1);
}

.pb-rgi-layer-1 {
  z-index: 4;
  top: calc(var(--stack-front-top) - 6px);
  left: calc(var(--stack-front-left) + 6px);
}

.pb-rgi-layer-2 {
  z-index: 3;
  top: calc(var(--stack-front-top) - 12px);
  left: calc(var(--stack-front-left) + 12px);
}

.pb-rgi-layer-3 {
  z-index: 2;
  top: calc(var(--stack-front-top) - 18px);
  left: calc(var(--stack-front-left) + 18px);
}

.pb-rgi-icon {
  z-index: 5;
  top: var(--stack-front-top);
  left: var(--stack-front-left);
}

.pb-rgi-layer > img,
.pb-rgi-icon-bg,
.pb-rgi-set-icon {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
}

.pb-rgi-layer > img,
.pb-rgi-icon-bg {
  object-fit: cover;
}

.pb-rgi-set-icon {
  object-fit: contain;
}

.pb-rgi-content {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-self: stretch;
  justify-content: center;
  gap: 4px;
}

.pb-rgi-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
}

.pb-rgi-title {
  overflow: hidden;
  min-width: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rgi-count {
  flex: none;
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.pb-rgi-status,
.pb-rgi-match {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.pb-rgi-status {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-rgi-match {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--common-text-title);
  gap: 3px;
  white-space: nowrap;
}

.pb-rgi-match strong {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .pb-rgi {
    transition: none;
  }
}

.pb-rgi-positions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.pb-rgi-positions > span {
  display: inline-flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
}

.pb-rgi-positions img {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
}

.pb-rgi-meta {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.pb-rgi-specs {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
  white-space: nowrap;
}

.pb-rgi-specs > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
