<!-- 首页限时祈愿-卡池/UP物品详情浮窗 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    blurVal="8px"
    contentMaxHeight="none"
    :shareCaption="shareCaption"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="min(720px, calc(100vw - 32px))"
    topOffset="64px"
  >
    <template #left>
      <v-btn
        v-if="showSwitch"
        aria-label="上一个UP物品"
        class="phio-arrow"
        icon="mdi-chevron-left"
        title="上一个UP物品"
        variant="flat"
        @click="switchItem(false)"
      />
    </template>

    <template #header>
      <TItemBox v-if="itemBox !== undefined" :model-value="itemBox" />
      <TMiImg
        v-else-if="poolBanner"
        :ori="true"
        :src="poolBanner"
        alt="banner"
        class="phio-banner"
      />
      <div class="phio-heading">
        <div class="phio-title-row">
          <h2>{{ headingTitle }}</h2>
          <template v-if="itemMode">
            <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
              {{ rarityLabel }}
            </v-chip>
            <v-chip color="var(--tgc-od-purple)" size="small" variant="tonal">
              {{ itemTypeLabel }}
            </v-chip>
            <v-chip color="var(--tgc-od-red)" size="small" variant="tonal">
              UP {{ upCount }} 次
            </v-chip>
          </template>
          <template v-else>
            <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
              {{ poolVersionLabel }}
            </v-chip>
            <v-chip color="var(--tgc-od-purple)" size="small" variant="tonal">
              {{ currentPoolTypeLabel }}
            </v-chip>
          </template>
        </div>
        <div class="phio-subtitle">
          <template v-if="itemMode">
            <span class="phio-subtitle-group">
              <v-icon color="var(--tgc-od-orange)" size="16">mdi-gift-outline</v-icon>
              <span>{{ currentPoolName }}</span>
            </span>
          </template>
          <span class="phio-subtitle-group">
            <v-icon color="var(--tgc-od-orange)" size="16">mdi-calendar-clock-outline</v-icon>
            <span>{{ poolTimeRange }}</span>
          </span>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        v-if="pool.postId"
        icon="mdi-open-in-new"
        title="查看帖子"
        variant="text"
        @click="openPost"
      />
      <v-btn
        v-if="itemMode"
        :title="itemTypeLabel + '详情'"
        icon="mdi-book-open-page-variant-outline"
        variant="text"
        @click="openWiki"
      />
      <v-btn
        aria-label="保存祈愿分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存祈愿分享图"
        variant="text"
        @click="shareOverlay"
      />
      <v-btn
        aria-label="关闭"
        density="comfortable"
        icon="mdi-close"
        title="关闭"
        variant="text"
        @click="visible = false"
      />
    </template>

    <!-- 抽数统计 -->
    <section class="phio-section">
      <div class="phio-section-title">
        <div>
          <v-icon color="var(--tgc-od-orange)" size="18">mdi-chart-box-outline</v-icon>
          <strong>抽数统计{{ account.gameUid ? ` · UID ${account.gameUid}` : "" }}</strong>
        </div>
        <span v-if="statsLoading">正在加载祈愿数据...</span>
      </div>
      <div v-if="showEmptyStats" class="phio-empty phio-empty--stats">
        {{ statsEmptyText }}
      </div>
      <div v-else :class="{ 'phio-stats--item': itemMode }" class="phio-stats">
        <template v-if="itemMode">
          <div class="phio-stat">
            <span class="phio-stat-label">当期抽数</span>
            <span class="phio-stat-value">{{ totalPulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">当期命中数</span>
            <span class="phio-stat-value">{{ itemPoolPulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">总抽数</span>
            <span class="phio-stat-value">{{ historyPullsTotal }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">总命中数</span>
            <span class="phio-stat-value">{{ historyHitsTotal }}</span>
          </div>
        </template>
        <template v-else>
          <div class="phio-stat">
            <span class="phio-stat-label">总抽数</span>
            <span class="phio-stat-value">{{ totalPulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">五星</span>
            <span class="phio-stat-value">{{ star5Pulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">四星</span>
            <span class="phio-stat-value">{{ star4Pulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">三星</span>
            <span class="phio-stat-value">{{ star3Pulls }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">五星平均</span>
            <span class="phio-stat-value">{{ star5Avg }}</span>
          </div>
          <div class="phio-stat">
            <span class="phio-stat-label">四星平均</span>
            <span class="phio-stat-value">{{ star4Avg }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- 卡池信息（卡池模式） -->
    <section v-if="!itemMode" class="phio-section">
      <div class="phio-section-title">
        <div>
          <v-icon color="var(--tgc-od-orange)" size="18">mdi-information-outline</v-icon>
          <strong>卡池信息</strong>
        </div>
        <span>UP 五星 {{ pool5List.length }} · UP 四星 {{ pool4List.length }}</span>
      </div>
      <div v-if="pool5List.length > 0 || pool4List.length > 0" class="phio-up-list">
        <div v-if="pool5List.length > 0" class="phio-up-group phio-up-group--5">
          <span class="phio-icon-list">
            <img
              v-for="item in pool5List"
              :key="item.id"
              :src="item.icon"
              :title="item.name"
              alt="icon"
            />
          </span>
        </div>
        <div v-if="pool4List.length > 0" class="phio-up-group phio-up-group--4">
          <span class="phio-icon-list">
            <img
              v-for="item in pool4List"
              :key="item.id"
              :src="item.icon"
              :title="item.name"
              alt="icon"
            />
          </span>
        </div>
      </div>
      <div v-else class="phio-empty">未匹配到 gacha.json 中的卡池数据</div>
    </section>

    <!-- UP历史：物品模式展示该物品UP期数，卡池模式展示同名卡池历次UP -->
    <section class="phio-section">
      <div class="phio-section-title">
        <div>
          <v-icon color="var(--tgc-od-orange)" size="18">mdi-history</v-icon>
          <strong>UP 历史</strong>
        </div>
        <span>{{ itemMode ? `共 ${upCount} 期` : `共 ${poolHistory.length} 期` }}</span>
      </div>
      <div v-if="itemMode && upCount > 0" class="phio-meta">
        <span>首次 UP：{{ firstUpTime }}</span>
        <span>最近 UP：{{ lastUpTime }}</span>
      </div>
      <div v-if="historyRows.length === 0" class="phio-empty">未找到 UP 记录</div>
      <div v-else ref="tableWrapRef" class="phio-table-wrap">
        <table class="phio-table">
          <thead>
            <tr class="phio-table-head">
              <th>版本</th>
              <th class="phio-table-left">卡池名称</th>
              <th class="phio-table-left">类型</th>
              <th>期数</th>
              <template v-if="itemMode">
                <th v-if="!showEmptyStats" class="phio-table-right">抽数</th>
                <th v-if="!showEmptyStats" class="phio-table-right">命中</th>
              </template>
              <template v-else>
                <th>UP 五星</th>
                <th v-if="!isMixUpPool">UP 四星</th>
                <th v-if="!showEmptyStats" class="phio-table-right">抽数</th>
              </template>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in historyRows"
              :key="poolKey(row.pool)"
              :class="{ current: isCurrentPool(row.pool) }"
              class="phio-table-row"
            >
              <td class="phio-table-center">{{ row.pool.version }}</td>
              <td class="phio-table-name">{{ row.pool.name }}</td>
              <td class="phio-table-type">{{ getPoolTypeLabel(row.pool.type) }}</td>
              <td class="phio-table-center">{{ row.pool.order === 1 ? "上半" : "下半" }}</td>
              <template v-if="itemMode">
                <td v-if="!showEmptyStats" class="phio-table-num">{{ row.pulls }}</td>
                <td v-if="!showEmptyStats" class="phio-table-num">{{ row.hits }}</td>
              </template>
              <template v-else>
                <td class="phio-table-center phio-table-up phio-table-up--5">
                  <span class="phio-icon-list">
                    <img
                      v-for="item in row.up5List"
                      :key="item.id"
                      :src="item.icon"
                      :title="item.name"
                      alt="icon"
                    />
                  </span>
                </td>
                <td v-if="!isMixUpPool" class="phio-table-center phio-table-up phio-table-up--4">
                  <span class="phio-icon-list">
                    <img
                      v-for="item in row.up4List"
                      :key="item.id"
                      :src="item.icon"
                      :title="item.name"
                      alt="icon"
                    />
                  </span>
                </td>
                <td v-if="!showEmptyStats" class="phio-table-num">{{ row.pulls }}</td>
              </template>
              <td class="phio-table-center phio-table-time">{{ getPoolTime(row.pool) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <template #right>
      <v-btn
        v-if="showSwitch"
        aria-label="下一个UP物品"
        class="phio-arrow"
        icon="mdi-chevron-right"
        title="下一个UP物品"
        variant="flat"
        @click="switchItem(true)"
      />
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import useUserStore from "@store/user.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { createPost } from "@utils/TGWindow.js";
import { getWikiBrief } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { AppGachaData } from "@/data/index.js";

/**
 * 首页限时祈愿浮窗-UP物品信息
 * @since Beta v0.11.2
 */
export type PhPoolItemOverlayItem = {
  /** 物品ID */
  id: number;
  /** 物品名称 */
  name: string;
  /** 物品星级 */
  star: number;
  /** 是否角色 */
  isCharacter: boolean;
  /** 物品图标 */
  icon: string;
};

/**
 * 首页限时祈愿浮窗-当前卡池信息
 * @since Beta v0.11.2
 */
export type PhPoolItemOverlayPool = {
  /** 卡池名称 */
  name: string;
  /**
   * 卡池类型
   * @remarks 可为 gachaType(301/302/400/500) 或活动日历 poolType(1/2/3)
   */
  type?: number;
  /** 开始时间 */
  from: string;
  /** 结束时间 */
  to: string;
  /** 观测枢帖子ID */
  postId?: string;
};

type PhPoolItemOverlayProps = {
  /**
   * UP物品
   * @remarks 传入时按物品模式展示，省略时按卡池模式展示
   */
  item?: PhPoolItemOverlayItem;
  /** 当前卡池 */
  pool: PhPoolItemOverlayPool;
  /** 卡池内物品ID列表，用于匹配 gacha.json */
  poolItemIds?: Array<number>;
  /** 卡池UP物品列表（物品模式用于左右切换） */
  items?: Array<PhPoolItemOverlayItem>;
};

/**
 * 首页限时祈愿浮窗-UP物品简要信息
 * @since Beta v0.11.2
 */
type PhioItemBrief = {
  /** 物品ID */
  id: number;
  /** 物品名称 */
  name: string;
  /** 物品图标 */
  icon: string;
};

/**
 * 首页限时祈愿浮窗-UP历史表格行数据
 * @since Beta v0.11.2
 */
type PhioHistoryRow = {
  /** 卡池信息 */
  pool: TGApp.App.Gacha.PoolItem;
  /** 该期抽数 */
  pulls: number;
  /** 该期物品命中数 */
  hits: number;
  /** UP五星图标列表 */
  up5List: Array<PhioItemBrief>;
  /** UP四星图标列表 */
  up4List: Array<PhioItemBrief>;
};

const props = defineProps<PhPoolItemOverlayProps>();
const emits = defineEmits<{ switchItem: [item: PhPoolItemOverlayItem] }>();
const visible = defineModel<boolean>({ default: false });
const router = useRouter();
const { account } = storeToRefs(useUserStore());
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const tableWrapRef = useTemplateRef<HTMLElement>("tableWrapRef");

const statsLoading = ref<boolean>(false);
const poolRecords = shallowRef<Array<TGApp.Sqlite.Gacha.Gacha>>([]);
const allRecords = shallowRef<Array<TGApp.Sqlite.Gacha.Gacha>>([]);

const itemMode = computed<boolean>(() => props.item !== undefined);
const itemTypeLabel = computed<string>(() => (props.item?.isCharacter ? "角色" : "武器"));
const showSwitch = computed<boolean>(() => itemMode.value && (props.items?.length ?? 0) > 1);
const rarityLabel = computed<string>(() => `${props.item?.star ?? 0} 星`);
const currentPool = computed<TGApp.App.Gacha.PoolItem | undefined>(() => findPoolMatches()[0]);
const currentPoolName = computed<string>(() => currentPool.value?.name ?? props.pool.name);
const headingTitle = computed<string>(() => props.item?.name ?? currentPoolName.value);
const poolBanner = computed<string | undefined>(() => currentPool.value?.banner);
const poolVersionLabel = computed<string>(() => currentPool.value?.version ?? "--");
const currentPoolTypeLabel = computed<string>(() => {
  if (currentPool.value) return getPoolTypeLabel(currentPool.value.type);
  if (props.pool.type !== undefined) return getPoolTypeLabel(props.pool.type);
  return "未知";
});
const poolTimeRange = computed<string>(() => {
  if (props.pool.from === "" || props.pool.to === "") return "";
  return `${fmtUtil.dateTime(parseTime(props.pool.from))} ~ ${fmtUtil.dateTime(parseTime(props.pool.to))}`;
});
const upPools = computed<Array<TGApp.App.Gacha.PoolItem>>(() => {
  const item = props.item;
  if (!item) return [];
  return AppGachaData.filter(
    (pool) => pool.up5List.includes(item.id) || pool.up4List.includes(item.id),
  ).sort((a, b) => parseTime(b.from) - parseTime(a.from));
});
const upCount = computed<number>(() => upPools.value.length);
const firstUpTime = computed<string>(() => {
  const pool = upPools.value[upPools.value.length - 1];
  return pool === undefined ? "--" : fmtUtil.dateTime(parseTime(pool.from));
});
const lastUpTime = computed<string>(() => {
  const pool = upPools.value[0];
  return pool === undefined ? "--" : fmtUtil.dateTime(parseTime(pool.to));
});
const poolHistory = computed<Array<TGApp.App.Gacha.PoolItem>>(() => {
  const name = currentPool.value?.name ?? props.pool.name;
  if (name === "") return [];
  return AppGachaData.filter((pool) => pool.name === name).sort(
    (a, b) => parseTime(b.from) - parseTime(a.from),
  );
});
const historyRows = computed<Array<PhioHistoryRow>>(() => {
  const pools = itemMode.value ? upPools.value : poolHistory.value;
  return pools.map((pool) => ({
    pool,
    pulls: countPoolPulls(pool),
    hits: countPoolHits(pool),
    up5List: getUpList(pool.up5List),
    up4List: getUpList(pool.up4List),
  }));
});
const historyPullsTotal = computed<number>(() =>
  historyRows.value.reduce((sum, row) => sum + row.pulls, 0),
);
const historyHitsTotal = computed<number>(() =>
  historyRows.value.reduce((sum, row) => sum + row.hits, 0),
);
const showEmptyStats = computed<boolean>(() => {
  if (statsLoading.value) return false;
  const pulls = itemMode.value ? historyPullsTotal.value : totalPulls.value;
  return pulls === 0;
});
const isMixUpPool = computed<boolean>(() => {
  if (currentPool.value) return currentPool.value.type === Number(gameEnum.gachaType.MixUp);
  return props.pool.type === gameEnum.actCalendar.poolType.Mixed;
});
const pool5List = computed<Array<PhioItemBrief>>(() => getUpList(currentPool.value?.up5List ?? []));
const pool4List = computed<Array<PhioItemBrief>>(() => getUpList(currentPool.value?.up4List ?? []));
const sortedPoolRecords = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  [...poolRecords.value].sort((a, b) => a.time.localeCompare(b.time)),
);
const totalPulls = computed<number>(() => poolRecords.value.length);
const star5Pulls = computed<number>(() => countRank("5"));
const star4Pulls = computed<number>(() => countRank("4"));
const star3Pulls = computed<number>(() => countRank("3"));
const star5Avg = computed<string>(() => getRankAvg("5"));
const star4Avg = computed<string>(() => getRankAvg("4"));
const itemPoolPulls = computed<number>(
  () => poolRecords.value.filter((record) => record.itemId === props.item?.id.toString()).length,
);
const statsEmptyText = computed<string>(() => {
  if (!account.value.gameUid) return "未登录，暂无祈愿数据";
  if (!currentPool.value) return "未匹配到 gacha.json 中的卡池数据";
  return "暂无祈愿数据，请先在祈愿记录页导入或刷新";
});
const itemBox = computed<TItemBoxData | undefined>(() => {
  if (!props.item) return undefined;
  const brief = getWikiBrief(props.item.id);
  if (brief === false) return undefined;
  const weaponIcon = `/icon/weapon/${brief.weapon}.webp`;
  return {
    bg: `/icon/bg/${props.item.star}-Star.webp`,
    icon: props.item.icon,
    size: "84px",
    height: "84px",
    display: "inner",
    clickable: false,
    lt: "element" in brief ? `/icon/element/${brief.element}元素.webp` : weaponIcon,
    ltSize: "22px",
    innerHeight: 0,
    innerIcon: "element" in brief ? weaponIcon : "",
    innerText: "",
  };
});
const shareCaption = computed<string>(() => {
  const typeLabel = itemMode.value ? itemTypeLabel.value : currentPoolTypeLabel.value;
  return `${headingTitle.value} · ${typeLabel} · 限时祈愿`;
});

watch(
  () => visible.value,
  async () => {
    if (visible.value) await loadStats();
  },
);

/**
 * 加载当前卡池与物品的祈愿记录
 * @since Beta v0.11.2
 */
async function loadStats(): Promise<void> {
  poolRecords.value = [];
  allRecords.value = [];
  const uid = account.value.gameUid;
  const poolItem = currentPool.value;
  if (!uid || !poolItem) return;
  statsLoading.value = true;
  try {
    poolRecords.value = await TSUserGacha.record.pool(poolItem, uid);
    allRecords.value = await TSUserGacha.record.all(uid);
  } catch (e) {
    await TGLogger.Error("[PhPoolItemOverlay][loadStats] 获取抽数统计异常");
    await TGLogger.Error(`[PhPoolItemOverlay][loadStats] ${e}`);
  } finally {
    statsLoading.value = false;
  }
}

/**
 * 保存祈愿分享图
 * @since Beta v0.11.2
 */
async function shareOverlay(): Promise<void> {
  const element = overlayPanel.value?.panel ?? null;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const content = overlayPanel.value?.content ?? null;
  const table = tableWrapRef.value;
  const maxHeight = element.style.maxHeight;
  const overflowY = element.style.overflowY;
  element.style.maxHeight = "none";
  element.style.overflowY = "visible";
  const contentFlex = content?.style.flex ?? "";
  const contentOverflow = content?.style.overflowY ?? "";
  if (content !== null) {
    content.style.flex = "none";
    content.style.overflowY = "visible";
  }
  const tableMaxHeight = table?.style.maxHeight ?? "";
  const tableOverflow = table?.style.overflow ?? "";
  if (table !== null) {
    table.style.maxHeight = "none";
    table.style.overflow = "visible";
  }
  try {
    await generateShareImg(`限时祈愿_${headingTitle.value}`, element, 1.5);
  } finally {
    element.style.maxHeight = maxHeight;
    element.style.overflowY = overflowY;
    if (content !== null) {
      content.style.flex = contentFlex;
      content.style.overflowY = contentOverflow;
    }
    if (table !== null) {
      table.style.maxHeight = tableMaxHeight;
      table.style.overflow = tableOverflow;
    }
  }
}

/**
 * 匹配 gacha.json 中的当前卡池
 * @since Beta v0.11.2
 * @returns 按匹配度排序的卡池列表
 */
function findPoolMatches(): Array<TGApp.App.Gacha.PoolItem> {
  if (props.pool.from === "" || props.pool.to === "") return [];
  const fromTs = parseTime(props.pool.from);
  const toTs = parseTime(props.pool.to);
  const wantedType = resolveWantedType(props.pool.type);
  const itemIds =
    props.poolItemIds && props.poolItemIds.length > 0 ? props.poolItemIds : [props.item?.id ?? 0];
  const scored: Array<{ pool: TGApp.App.Gacha.PoolItem; score: number }> = [];
  for (const pool of AppGachaData) {
    const poolFrom = parseTime(pool.from);
    const poolTo = parseTime(pool.to);
    if (poolFrom > toTs || poolTo < fromTs) continue;
    if (wantedType !== undefined && pool.type !== wantedType) continue;
    let score = 0;
    if (props.pool.name !== "" && pool.name === props.pool.name) score += 3;
    const overlapDays = Math.min(poolTo, toTs) - Math.max(poolFrom, fromTs);
    score += Math.min(overlapDays / 86400000, 5);
    const hitCount = [...pool.up5List, ...pool.up4List].filter((id) => itemIds.includes(id)).length;
    score += hitCount * 2;
    if (score > 0) scored.push({ pool, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || parseTime(a.pool.from) - parseTime(b.pool.from))
    .map((entry) => entry.pool);
}

/**
 * 解析卡池类型为 gachaType
 * @since Beta v0.11.2
 * @param type - gachaType 或活动日历 poolType
 * @returns 匹配时使用的 gachaType，角色池返回 undefined 以允许 301/400
 */
function resolveWantedType(type?: number): number | undefined {
  if (type === undefined) return undefined;
  const gachaTypes: Array<number> = [
    Number(gameEnum.gachaType.AvatarUp),
    Number(gameEnum.gachaType.AvatarUp2),
    Number(gameEnum.gachaType.WeaponUp),
    Number(gameEnum.gachaType.MixUp),
  ];
  if (gachaTypes.includes(type)) return type;
  if (type === gameEnum.actCalendar.poolType.Avatar) return undefined;
  if (type === gameEnum.actCalendar.poolType.Weapon) {
    return Number(gameEnum.gachaType.WeaponUp);
  }
  if (type === gameEnum.actCalendar.poolType.Mixed) {
    return Number(gameEnum.gachaType.MixUp);
  }
  return undefined;
}

/**
 * 解析时间字符串
 * @since Beta v0.11.2
 * @param time - yyyy-MM-ddTHH:mm:ss+08:00 或 yyyy-MM-dd HH:mm:ss
 * @returns 时间戳
 */
function parseTime(time: string): number {
  return new Date(time.replace(" ", "T")).getTime();
}

/**
 * 获取物品简要信息
 * @since Beta v0.11.2
 * @param id - 物品ID
 * @returns 物品简要信息，未收录时返回 undefined
 */
function getItemBrief(id: number): PhioItemBrief | undefined {
  const brief = getWikiBrief(id);
  if (brief === false) return undefined;
  const icon = "element" in brief ? `/WIKI/character/${id}.webp` : `/WIKI/weapon/${id}.webp`;
  return { id, name: brief.name, icon };
}

/**
 * 获取UP物品图标列表
 * @since Beta v0.11.2
 * @param ids - 物品ID列表
 * @returns 已收录物品的简要信息列表
 */
function getUpList(ids: Array<number>): Array<PhioItemBrief> {
  return ids.map(getItemBrief).filter((item): item is PhioItemBrief => item !== undefined);
}

/**
 * 获取卡池类型标签
 * @since Beta v0.11.2
 * @param type - gachaType
 * @returns 类型标签
 */
function getPoolTypeLabel(type: number): string {
  switch (type) {
    case Number(gameEnum.gachaType.AvatarUp):
      return "角色活动祈愿";
    case Number(gameEnum.gachaType.AvatarUp2):
      return "角色活动祈愿2";
    case Number(gameEnum.gachaType.WeaponUp):
      return "武器活动祈愿";
    case Number(gameEnum.gachaType.MixUp):
      return "集录祈愿";
    default:
      return "未知";
  }
}

/**
 * 获取卡池时间范围
 * @since Beta v0.11.2
 * @param pool - 卡池信息
 * @returns 日期范围
 */
function getPoolTime(pool: TGApp.App.Gacha.PoolItem): string {
  return `${getPoolDate(pool.from)} ~ ${getPoolDate(pool.to)}`;
}

/**
 * 获取日期
 * @since Beta v0.11.2
 * @param time - 时间字符串
 * @returns yyyy-MM-dd
 */
function getPoolDate(time: string): string {
  return fmtUtil.dateTime(parseTime(time)).slice(0, 10);
}

/**
 * 判断卡池是否为当前卡池
 * @since Beta v0.11.2
 * @param pool - 卡池信息
 * @returns 是否当前卡池
 */
function isCurrentPool(pool: TGApp.App.Gacha.PoolItem): boolean {
  return pool === currentPool.value;
}

/**
 * 获取卡池唯一键
 * @since Beta v0.11.2
 * @param pool - 卡池信息
 * @returns 唯一键
 */
function poolKey(pool: TGApp.App.Gacha.PoolItem): string {
  return `${pool.name}-${pool.from}`;
}

/**
 * 统计指定星级数量
 * @since Beta v0.11.2
 * @param rank - 星级
 * @returns 数量
 */
function countRank(rank: string): number {
  return poolRecords.value.filter((record) => record.rank === rank).length;
}

/**
 * 计算指定星级平均抽数
 * @since Beta v0.11.2
 * @param rank - 星级
 * @returns 平均抽数
 */
function getRankAvg(rank: string): string {
  const hits = sortedPoolRecords.value.filter((record) => record.rank === rank);
  if (hits.length === 0) return "0";
  let pulls = 0;
  const gaps: Array<number> = [];
  for (const record of sortedPoolRecords.value) {
    pulls++;
    if (record.rank === rank) {
      gaps.push(pulls);
      pulls = 0;
    }
  }
  return (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2);
}

/**
 * 统计卡池时间范围内的抽数
 * @since Beta v0.11.2
 * @param pool - 卡池信息
 * @returns 抽数
 */
function countPoolPulls(pool: TGApp.App.Gacha.PoolItem): number {
  const from = pool.from.slice(0, 19).replace("T", " ");
  const to = pool.to.slice(0, 19).replace("T", " ");
  return allRecords.value.filter(
    (record) =>
      record.gachaType === pool.type.toString() && record.time >= from && record.time <= to,
  ).length;
}

/**
 * 统计卡池时间范围内物品命中数
 * @since Beta v0.11.2
 * @param pool - 卡池信息
 * @returns 命中数
 */
function countPoolHits(pool: TGApp.App.Gacha.PoolItem): number {
  const item = props.item;
  if (!item) return 0;
  const from = pool.from.slice(0, 19).replace("T", " ");
  const to = pool.to.slice(0, 19).replace("T", " ");
  return allRecords.value.filter(
    (record) =>
      record.gachaType === pool.type.toString() &&
      record.itemId === item.id.toString() &&
      record.time >= from &&
      record.time <= to,
  ).length;
}

/**
 * 切换当前UP物品
 * @since Beta v0.11.2
 * @param isNext - 是否下一个
 */
function switchItem(isNext: boolean): void {
  if (!props.items || props.items.length < 2 || !props.item) return;
  const currentIndex = props.items.findIndex((item) => item.id === props.item?.id);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + (isNext ? 1 : -1);
  if (nextIndex < 0) {
    showSnackbar.warn("已经是第一个了");
    return;
  }
  if (nextIndex >= props.items.length) {
    showSnackbar.warn("已经是最后一个了");
    return;
  }
  emits("switchItem", props.items[nextIndex]);
}

/**
 * 打开角色/武器详情
 * @since Beta v0.11.2
 */
async function openWiki(): Promise<void> {
  if (!props.item) return;
  visible.value = false;
  await router.push({
    name: props.item.isCharacter ? "角色图鉴" : "武器图鉴",
    params: { id: props.item.id.toString() },
  });
}

/**
 * 打开观测枢帖子
 * @since Beta v0.11.2
 */
async function openPost(): Promise<void> {
  if (!props.pool.postId) return;
  const postId = Number(props.pool.postId);
  if (isNaN(postId)) return;
  visible.value = false;
  await createPost(postId, currentPoolName.value);
}
</script>
<style lang="scss" scoped>
.phio-title-row,
.phio-subtitle,
.phio-section-title,
.phio-section-title > div,
.phio-meta {
  display: flex;
  align-items: center;
}

.phio-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

.phio-banner {
  max-width: 180px;
  height: 84px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  object-fit: contain;
}

.phio-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.phio-title-row {
  flex-wrap: wrap;
  gap: 8px;

  :deep(.v-chip) {
    border: 1px solid var(--common-shadow-1);
  }

  h2 {
    margin: 0;
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: normal;
  }
}

.phio-subtitle {
  flex-wrap: wrap;
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 6px 12px;
}

.phio-subtitle-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.phio-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phio-section-title {
  justify-content: space-between;
  gap: 12px;

  > div {
    gap: 6px;
  }

  > span {
    color: var(--common-text-sub);
    font-size: 12px;
    text-align: right;
  }
}

.phio-meta {
  flex-wrap: wrap;
  color: var(--common-text-sub);
  font-size: 12px;
  gap: 12px;
}

.phio-up-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phio-up-group {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  gap: 6px;

  &--5 {
    background: rgb(209 154 102 / 12%);
  }

  &--4 {
    background: rgb(198 120 221 / 12%);
  }
}

.phio-icon-list {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.phio-icon-list img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.phio-up-list .phio-icon-list img {
  width: 32px;
  height: 32px;
}

.phio-stats {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
}

.phio-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  gap: 2px;
}

.phio-stat-label {
  color: var(--common-text-sub);
  font-size: 12px;
}

.phio-stat-value {
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
}

.phio-stats--item {
  grid-template-columns: repeat(4, 1fr);
}

.phio-empty {
  padding: 10px 12px;
  border: 1px dashed var(--common-shadow-1);
  border-radius: 8px;
  color: var(--common-text-sub);
  font-size: 12px;
  text-align: center;
}

.phio-empty--stats {
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: center;
}

.phio-table-wrap {
  position: relative;
  z-index: 1;
  overflow: auto;
  width: 100%;
  max-height: 240px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
}

.phio-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.phio-table-row {
  color: var(--box-text-2);
  font-size: 12px;
}

.phio-table-name,
.phio-table-type {
  text-align: left;
}

.phio-table-up {
  &--5 {
    background: rgb(209 154 102 / 12%);
  }

  &--4 {
    background: rgb(198 120 221 / 12%);
  }
}

.phio-table-num {
  text-align: right;
}

.phio-table-center {
  text-align: center;
}

.phio-table-time {
  color: var(--common-text-sub);
  font-size: 11px;
}

.phio-table th,
.phio-table td {
  padding: 4px 10px;
  white-space: nowrap;
}

.phio-table th {
  position: sticky;
  z-index: 2;
  top: 0;
  background: var(--box-bg-3);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  text-align: center;
}

.phio-table th.phio-table-left {
  text-align: left;
}

.phio-table th.phio-table-right {
  text-align: right;
}

.phio-table tbody tr:nth-child(even) {
  background: rgb(128 128 128 / 4%);
}

.phio-table tbody tr:hover {
  background: rgb(128 128 128 / 6%);
}

.phio-table tbody tr.current {
  background: rgb(128 128 128 / 10%);

  .phio-table-name {
    color: var(--tgc-od-orange);
  }
}

@media (width <= 600px) {
  .phio-section-title {
    flex-direction: column;
    align-items: flex-start;

    > span {
      text-align: left;
    }
  }

  .phio-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
