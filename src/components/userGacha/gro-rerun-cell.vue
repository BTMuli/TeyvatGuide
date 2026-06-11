<!-- 复刻周期统计 - 单元格组件 -->
<template>
  <span v-if="hasUp" class="gro-cell-up-bar">
    <!-- 时间轴：左段 | 中点 | 右段 -->
    <span class="gro-cell-timeline">
      <!-- 左段 -->
      <span :class="['gro-cell-seg', 'seg-left', { 'seg-hl-5': hlFirst5, 'seg-hl-4': hlFirst4 }]">
        <span v-if="hasLeft" class="gro-cell-tag">
          {{ tag }}
          <span v-if="isMix" class="gro-cell-mix">复</span>
        </span>
        <span class="gro-cell-col">
          <span class="gro-cell-dot"></span>
          <span v-if="hasLeft" class="gro-cell-date">{{ dateStart }}</span>
        </span>
        <span class="gro-cell-line"></span>
      </span>
      <!-- 中点 -->
      <span class="gro-cell-col">
        <span
          :class="[
            'gro-cell-dot',
            {
              'dot-hl-5': (hasLeft && hlFirst5) || (hasRight && hlSecond5),
              'dot-hl-4': (hasLeft && hlFirst4) || (hasRight && hlSecond4),
            },
          ]"
        ></span>
        <span v-if="hasUp" class="gro-cell-date">{{ dateCenter }}</span>
      </span>
      <!-- 右段 -->
      <span
        :class="['gro-cell-seg', 'seg-right', { 'seg-hl-5': hlSecond5, 'seg-hl-4': hlSecond4 }]"
      >
        <span class="gro-cell-line"></span>
        <span class="gro-cell-col">
          <span class="gro-cell-dot"></span>
          <span v-if="hasRight" class="gro-cell-date">{{ dateEnd }}</span>
        </span>
        <span v-if="hasRight" class="gro-cell-tag">
          {{ tag }}
          <span v-if="isMix" class="gro-cell-mix">复</span>
        </span>
      </span>
    </span>
  </span>
  <span v-else class="gro-cell-empty"></span>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed } from "vue";

/** 版本分组（从父组件传入） */
type VersionGroup = {
  version: string;
  timeRange: string;
  allPools: Array<TGApp.App.Gacha.PoolItem>;
  firstPools: Array<TGApp.App.Gacha.PoolItem>;
  secondPools: Array<TGApp.App.Gacha.PoolItem>;
};

const props = defineProps<{
  /** 物品ID */
  itemId: number;
  /** 版本分组数据 */
  versionGroup: VersionGroup;
}>();

/** 格式化 M/D */
function fmtMD(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ========== 计算属性 ==========

const hasUp = computed(() =>
  props.versionGroup.allPools.some(
    (p) => p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId),
  ),
);

const isMix = computed(() =>
  props.versionGroup.allPools.some(
    (p) =>
      (p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId)) &&
      p.type === Number(gameEnum.gachaType.MixUp),
  ),
);

const tag = computed(() => {
  for (const p of props.versionGroup.allPools) {
    if (p.up5List.includes(props.itemId)) return "UP";
    if (p.up4List.includes(props.itemId)) return "4★";
  }
  return "";
});

/** 最早开始日期 */
const dateStart = computed(() => {
  let result = "";
  let earliest = Infinity;
  for (const p of props.versionGroup.allPools) {
    if (
      (p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId)) &&
      new Date(p.from).getTime() < earliest
    ) {
      earliest = new Date(p.from).getTime();
      result = fmtMD(p.from);
    }
  }
  return result;
});

/** 交界日期（仅跨上下半时显示） */
const dateMid = computed(() => {
  const { firstPools, secondPools } = props.versionGroup;
  if (firstPools.length === 0 || secondPools.length === 0) return "";
  const inFirst = firstPools.some(
    (p) => p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId),
  );
  const inSecond = secondPools.some(
    (p) => p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId),
  );
  if (!inFirst || !inSecond) return "";
  const midDate = firstPools.reduce(
    (acc, p) => (new Date(p.to).getTime() > new Date(acc).getTime() ? p.to : acc),
    firstPools[0].to,
  );
  return fmtMD(midDate);
});

/** 中心点日期：上半显示结束日期，下半显示开始日期 */
const dateCenter = computed(() => {
  if (hasLeft.value && !hasRight.value) {
    // 仅上半：取上半卡池的最晚结束时间
    let latest = -Infinity;
    let result = "";
    for (const p of props.versionGroup.firstPools) {
      if (
        (p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId)) &&
        new Date(p.to).getTime() > latest
      ) {
        latest = new Date(p.to).getTime();
        result = fmtMD(p.to);
      }
    }
    return result;
  }
  if (!hasLeft.value && hasRight.value) {
    // 仅下半：取下半卡池的最早开始时间
    let earliest = Infinity;
    let result = "";
    for (const p of props.versionGroup.secondPools) {
      if (
        (p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId)) &&
        new Date(p.from).getTime() < earliest
      ) {
        earliest = new Date(p.from).getTime();
        result = fmtMD(p.from);
      }
    }
    return result;
  }
  // 两段都有：显示交界日期
  return dateMid.value;
});

/** 最晚结束日期 */
const dateEnd = computed(() => {
  let result = "";
  let latest = -Infinity;
  for (const p of props.versionGroup.allPools) {
    if (
      (p.up5List.includes(props.itemId) || p.up4List.includes(props.itemId)) &&
      new Date(p.to).getTime() > latest
    ) {
      latest = new Date(p.to).getTime();
      result = fmtMD(p.to);
    }
  }
  return result;
});

/** 上半五星UP */
const hlFirst5 = computed(() =>
  props.versionGroup.firstPools.some((p) => p.up5List.includes(props.itemId)),
);

/** 上半四星UP */
const hlFirst4 = computed(() =>
  props.versionGroup.firstPools.some((p) => p.up4List.includes(props.itemId)),
);

/** 下半五星UP */
const hlSecond5 = computed(() =>
  props.versionGroup.secondPools.some((p) => p.up5List.includes(props.itemId)),
);

/** 下半四星UP */
const hlSecond4 = computed(() =>
  props.versionGroup.secondPools.some((p) => p.up4List.includes(props.itemId)),
);

/** 上半是否有UP（任意星级） */
const hasLeft = computed(() => hlFirst5.value || hlFirst4.value);
/** 下半是否有UP（任意星级） */
const hasRight = computed(() => hlSecond5.value || hlSecond4.value);
</script>

<style lang="scss" scoped>
/* 容器：充满单元格，留出UP和日期空间 */

.gro-cell-up-bar {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 12px 0 10px;
}

/* 时间轴：始终充满宽度 */

.gro-cell-timeline {
  display: flex;
  width: 100%;
  align-items: stretch;
}

/* 段位：相对定位容器，UP和日期绝对定位于段内，内容横向排列 */

.gro-cell-seg {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  &.seg-left {
    max-width: calc(50% - 3px);
  }

  &.seg-right {
    max-width: calc(50% - 3px);
  }

  /* 激活时两端点+连线全亮 */

  &.seg-hl-5 {
    .gro-cell-dot {
      background: #d75050;
      box-shadow: 0 0 3px rgb(215 80 80 / 50%);
      opacity: 1;
    }

    .gro-cell-line {
      background: rgb(215 80 80 / 40%);
      opacity: 1;
    }
  }

  &.seg-hl-4 {
    .gro-cell-dot {
      background: #8080e6;
      box-shadow: 0 0 3px rgb(128 128 230 / 40%);
      opacity: 1;
    }

    .gro-cell-line {
      background: rgb(128 128 230 / 28%);
      opacity: 1;
    }
  }
}

/* UP标签：绝对定位到段顶部中央，上移 */

.gro-cell-tag {
  position: absolute;
  top: -10px;
  left: 50%;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.2;
  transform: translateX(-50%);
  white-space: nowrap;
}

.gro-cell-mix {
  display: inline-block;
  padding: 0 3px;
  border-radius: 3px;
  margin-left: 2px;
  background: #e6a23c;
  color: #ffffff;
  font-size: 8px;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: middle;
}

/* 独立中点圆点（直接子元素） */

.gro-cell-timeline > .gro-cell-dot {
  display: block;
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  align-self: center;
  border-radius: 50%;
  background: var(--common-shadow-1);
  opacity: 0.35;

  &.dot-hl-5 {
    background: #d75050;
    box-shadow: 0 0 3px rgb(215 80 80 / 50%);
    opacity: 1;
  }

  &.dot-hl-4 {
    background: #8080e6;
    box-shadow: 0 0 3px rgb(128 128 230 / 40%);
    opacity: 1;
  }
}

/* 中点列内的圆点 */

.gro-cell-timeline > .gro-cell-col > .gro-cell-dot {
  display: block;
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--common-shadow-1);
  opacity: 0.35;

  &.dot-hl-5 {
    background: #d75050;
    box-shadow: 0 0 3px rgb(215 80 80 / 50%);
    opacity: 1;
  }

  &.dot-hl-4 {
    background: #8080e6;
    box-shadow: 0 0 3px rgb(128 128 230 / 40%);
    opacity: 1;
  }
}

/* 段内圆点和连线 */

.gro-cell-seg .gro-cell-dot {
  display: block;
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--common-shadow-1);
  opacity: 0.35;
}

.gro-cell-line {
  min-width: 8px;
  height: 2px;
  flex: 1;
  border-radius: 1px;
  background: var(--common-shadow-1);
  opacity: 0.2;
}

/* 圆点+日期垂直列：圆点居中对齐，日期绝对定位到下方 */

.gro-cell-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gro-cell-date {
  position: absolute;
  top: 100%;
  margin-top: 1px;
  color: var(--box-text-2);
  font-size: 7px;
  opacity: 0.7;
  white-space: nowrap;
}

/* 空单元格填充点 */

.gro-cell-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;

  &::after {
    display: block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--common-shadow-1);
    content: "";
    opacity: 0.4;
  }
}
</style>
