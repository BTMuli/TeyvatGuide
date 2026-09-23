<!-- 复刻周期统计 - 单元格组件 -->
<template>
  <span v-if="periods.length > 0" class="gro-cell-periods" aria-label="复刻周期">
    <span
      v-for="period in periods"
      :key="period.key"
      :class="['gro-cell-period', period.className, { 'gro-cell-period--mix': period.hasMix }]"
      :title="period.title"
    >
      <span class="gro-cell-period-date">{{ period.dateRange }}</span>
      <span class="gro-cell-period-meta">
        <span class="gro-cell-period-rarity">{{ period.rarityLabel }}</span>
        <span class="gro-cell-period-labels">
          <span
            v-for="label in period.labels"
            :key="label.key"
            :class="['gro-cell-period-label', { 'gro-cell-period-label--mix': label.isMix }]"
          >
            {{ label.text }}
          </span>
        </span>
      </span>
    </span>
  </span>
  <span v-else class="gro-cell-empty" aria-label="本版本无 UP">—</span>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed } from "vue";

/** 版本分组（保留父组件传入的结构兼容性，只读取必要字段） */
type VersionGroup = {
  version: string;
  allPools: Array<TGApp.App.Gacha.PoolItem>;
};

type CalendarDate = {
  key: string;
  label: string;
  sortValue: number;
};

type PeriodLabel = {
  key: string;
  text: string;
  isMix: boolean;
  sortValue: number;
};

type PeriodBucket = {
  key: string;
  start: CalendarDate;
  end: CalendarDate;
  labels: Map<string, PeriodLabel>;
  hasFive: boolean;
  hasFour: boolean;
};

type PeriodCard = {
  key: string;
  className: string;
  dateRange: string;
  labels: Array<PeriodLabel>;
  rarity: "five" | "four" | "mixed";
  rarityLabel: string;
  hasMix: boolean;
  title: string;
};

const props = defineProps<{
  /** 物品ID */
  itemId: number;
  /** 版本分组数据 */
  versionGroup: VersionGroup;
}>();

/** 读取数据中的日历日期，避免时区转换改变显示的月/日。 */
function toCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return {
      key: year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
      label: month + "/" + day,
      sortValue: Date.UTC(year, month - 1, day),
    };
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return {
      key: year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
      label: month + "/" + day,
      sortValue: Date.UTC(year, month - 1, day),
    };
  }

  return { key: value, label: value || "未知日期", sortValue: Number.POSITIVE_INFINITY };
}

const periods = computed<Array<PeriodCard>>(() => {
  const buckets = new Map<string, PeriodBucket>();

  for (const pool of props.versionGroup.allPools) {
    const hasFive = pool.up5List.includes(props.itemId);
    const hasFour = pool.up4List.includes(props.itemId);
    if (!hasFive && !hasFour) continue;

    const start = toCalendarDate(pool.from);
    const end = toCalendarDate(pool.to);
    const isMix = pool.type === Number(gameEnum.gachaType.MixUp);
    const bucketKey = pool.from + "|" + pool.to + "|" + (isMix ? "mix" : "event");
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        key: bucketKey,
        start,
        end,
        labels: new Map<string, PeriodLabel>(),
        hasFive: false,
        hasFour: false,
      };
      buckets.set(bucketKey, bucket);
    }

    bucket.hasFive = bucket.hasFive || hasFive;
    bucket.hasFour = bucket.hasFour || hasFour;

    const labelKey = isMix ? "mix" : "order-" + pool.order;
    if (!bucket.labels.has(labelKey)) {
      bucket.labels.set(labelKey, {
        key: labelKey,
        text: isMix ? "集录" : "第 " + pool.order + " 期",
        isMix,
        sortValue: isMix ? Number.POSITIVE_INFINITY : pool.order,
      });
    }
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        left.start.sortValue - right.start.sortValue ||
        left.end.sortValue - right.end.sortValue ||
        left.key.localeCompare(right.key),
    )
    .map((bucket): PeriodCard => {
      const labels = [...bucket.labels.values()].sort(
        (left, right) => left.sortValue - right.sortValue || left.key.localeCompare(right.key),
      );
      const rarity = bucket.hasFive && bucket.hasFour ? "mixed" : bucket.hasFive ? "five" : "four";
      const rarityLabel =
        bucket.hasFive && bucket.hasFour ? "UP / 4★" : bucket.hasFive ? "UP" : "4★";
      const dateRange = bucket.start.label + "–" + bucket.end.label;
      const labelText = labels.map((label) => label.text).join("、");

      return {
        key: props.versionGroup.version + ":" + bucket.key,
        className: "gro-cell-period--" + rarity,
        dateRange,
        labels,
        rarity,
        rarityLabel,
        hasMix: labels.some((label) => label.isMix),
        title: dateRange + " · " + rarityLabel + " · " + labelText,
      };
    });
});
</script>

<style lang="scss" scoped>
.gro-cell-periods {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.gro-cell-period {
  --gro-cell-accent: var(--common-text-title);

  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 4px 6px 5px 7px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  border-left: 3px solid var(--gro-cell-accent);
  background: var(--box-bg-1);
  color: var(--box-text-2);
  gap: 2px;
  line-height: 16px;
}

.gro-cell-period--four {
  --gro-cell-accent: var(--box-text-3);
}

.gro-cell-period--mix {
  --gro-cell-accent: var(--tgc-yellow-3);
}

.gro-cell-period-date {
  overflow: hidden;
  color: var(--box-text-1);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-cell-period-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.gro-cell-period-rarity {
  flex-shrink: 0;
  color: var(--box-text-2);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.gro-cell-period-labels {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 2px 4px;
}

.gro-cell-period-label {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.gro-cell-period-label--mix {
  color: var(--box-text-2);
  font-weight: 600;
}

.gro-cell-empty {
  display: flex;
  width: 100%;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.8;
}
</style>
