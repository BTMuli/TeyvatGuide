<!-- 单地区探索数据 -->
<template>
  <div ref="worldCardRef" class="tur-ws-box">
    <div class="tur-ws-bg">
      <TMiImg :ori="true" :src="world.background_image" alt="bg" />
    </div>
    <div class="tur-ws-main">
      <div class="tur-ws-menu-host">
        <TurWorldMenu :children :menuLocation :uid :version :world />
      </div>
      <div class="tur-ws-content">
        <div class="tur-ws-title">
          <button
            :aria-label="`分享${world.name}探索卡片`"
            :title="`点击生成${world.name}探索分享图`"
            class="tur-ws-title-share"
            type="button"
            @click="shareWorldCard"
          >
            {{ world.name }}
          </button>
          <div v-if="titleLevelItems.length > 0" class="tur-ws-title-offerings">
            <div
              v-for="item in titleLevelItems"
              :key="`${item.name}-${item.level}`"
              :aria-label="item.name"
              :class="{ 'tur-ws-meta-offering--frosted': item.withBackdrop }"
              :title="item.name"
              class="tur-ws-title-offering"
            >
              <TMiImg :alt="item.name" :ori="true" :src="item.icon" class="tur-ws-meta-icon" />
              <strong>{{ item.level }}级</strong>
            </div>
          </div>
        </div>
        <div class="tur-ws-meta">
          <div v-if="hasStatueLevel || showReputation" class="tur-ws-meta-summary">
            <div v-if="hasStatueLevel" class="tur-ws-meta-summary-item">
              <TMiImg :ori="true" :src="statueIcon" alt="神像等级" class="tur-ws-meta-icon" />
              <span :title="statueLevelLabel" class="tur-ws-meta-name">
                {{ statueLevelLabel }}
              </span>
              <strong>{{ world.seven_statue_level }}级</strong>
            </div>
            <div
              v-if="hasStatueLevel && showReputation"
              aria-hidden="true"
              class="tur-ws-meta-divider"
            />
            <div v-if="showReputation" class="tur-ws-meta-summary-item">
              <TMiImg :ori="true" :src="reputationIcon" alt="声望等级" class="tur-ws-meta-icon" />
              <span class="tur-ws-meta-name">声望等级</span>
              <strong>{{ world.level }}级</strong>
            </div>
          </div>
          <div v-if="cardLevelItems.length > 0" class="tur-ws-meta-offerings">
            <div
              v-for="item in cardLevelItems"
              :key="`${item.name}-${item.level}`"
              :aria-label="item.name"
              :class="{ 'tur-ws-meta-offering--frosted': item.withBackdrop }"
              :title="item.name"
              class="tur-ws-meta-offering"
            >
              <TMiImg :alt="item.name" :ori="true" :src="item.icon" class="tur-ws-meta-icon" />
              <strong>{{ item.level }}级</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="incompleteAreaItems.length > 0" class="tur-ws-incomplete-list">
      <div
        v-for="area in incompleteAreaItems"
        :key="area.name"
        :title="`${area.name} ${formatExploration(area.exploration_percentage)}%`"
        class="tur-ws-incomplete-item"
      >
        <span>{{ area.name }}</span>
        <strong>{{ formatExploration(area.exploration_percentage) }}%</strong>
      </div>
    </div>
    <div class="tur-ws-progress">
      <div class="tur-ws-progress-item">
        <div class="tur-ws-progress-label">
          <div class="tur-ws-progress-label-main">
            <span>主要区域探索度</span>
          </div>
          <strong>{{ explorationPercent }}%</strong>
        </div>
        <v-progress-linear
          :model-value="explorationPercent"
          bg-color="var(--tgc-od-white)"
          bg-opacity="0.4"
          class="tur-ws-progress-bar"
          color="var(--tgc-yellow-1)"
          height="6"
          rounded
        />
      </div>
      <div v-for="item in extraExplorationItems" :key="item.name" class="tur-ws-progress-item">
        <div class="tur-ws-progress-label">
          <div class="tur-ws-progress-label-main">
            <span>{{ item.name }}探索度</span>
            <span v-if="item.offering !== undefined" class="tur-ws-extra-level">
              <TMiImg
                :alt="item.offering.name"
                :ori="true"
                :src="item.offering.icon"
                class="tur-ws-extra-offering-icon"
              />
              <span>{{ item.offering.name }}: {{ item.offering.level }}级</span>
            </span>
          </div>
          <strong>{{ formatExploration(item.explorationPercentage) }}%</strong>
        </div>
        <v-progress-linear
          :model-value="formatExploration(item.explorationPercentage)"
          bg-color="var(--tgc-od-white)"
          bg-opacity="0.4"
          class="tur-ws-progress-bar"
          color="var(--tgc-yellow-1)"
          height="6"
          rounded
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showLoading from "@comp/func/loading.js";
import TGLogger from "@utils/TGLogger.js";
import TGShare, { type ShareProgress } from "@utils/TGShare.js";
import { computed, useTemplateRef } from "vue";

import TurWorldMenu from "./tur-world-menu.vue";

type TurWorldSubProps = {
  world: TGApp.Game.Record.WorldExploreDisplay;
  children: Array<TGApp.Game.Record.WorldExploreDisplayItem>;
  menuLocation: "start" | "end";
  uid: number;
  version?: string;
};

type TurWorldCardLevelItem = {
  name: string;
  icon: string;
  level: number;
  withBackdrop: boolean;
};

type TurWorldExtraExplorationConfig = {
  name: string;
  areaNames?: Array<string>;
};

type TurWorldExtraExploration = TurWorldExtraExplorationConfig & {
  explorationPercentage: number;
  offering?: TGApp.Game.Record.WorldOffering;
};

const EXTRA_EXPLORATION_CONFIG: Readonly<Record<string, Array<TurWorldExtraExplorationConfig>>> = {
  蒙德: [{ name: "龙脊雪山" }, { name: "风息山" }],
  璃月: [
    {
      name: "层岩巨渊",
      areaNames: ["层岩巨渊", "层岩巨渊·地下矿区"],
    },
    {
      name: "沉玉谷",
      areaNames: ["来歆山", "沉玉谷·上谷", "沉玉谷·南陵"],
    },
  ],
  稻妻: [{ name: "渊下宫" }],
  枫丹: [{ name: "旧日之海" }],
};

const TITLE_OFFERING_REGIONS = new Set<string>(["纳塔", "枫丹", "须弥", "稻妻"]);

const { world, children, menuLocation, uid, version } = defineProps<TurWorldSubProps>();
const worldCardEl = useTemplateRef<HTMLDivElement>("worldCardRef");

const statueIcon = "/UI/record/pos.webp";
const reputationIcon =
  "https://webstatic.mihoyo.com/app/community-game-records/images/country-level-icon.03b22013.png";
const explorationPercent = computed<number>(() =>
  Math.min(Math.max(world.exploration_percentage / 10, 0), 100),
);
const showReputation = computed<boolean>(
  () => world.type === "Reputation" && !["至冬", "挪德卡莱"].includes(world.name),
);
const hasStatueLevel = computed<boolean>(() => world.seven_statue_level > 0);
const statueLevelLabel = computed<string>(() =>
  world.name === "挪德卡莱" ? "新月神像等级" : "七天神像等级",
);
const incompleteAreaItems = computed<Array<TGApp.Game.Record.AreaExploration>>(() =>
  world.area_exploration_list.filter((area) => area.exploration_percentage < 1000),
);
const titleLevelItems = computed<Array<TurWorldCardLevelItem>>(() => {
  if (!TITLE_OFFERING_REGIONS.has(world.name)) return [];
  return world.offerings.map((offering) => ({
    name: offering.name,
    icon: offering.icon,
    level: offering.level,
    withBackdrop: false,
  }));
});
const cardLevelItems = computed<Array<TurWorldCardLevelItem>>(() => {
  const items: Array<TurWorldCardLevelItem> = [];
  if (!TITLE_OFFERING_REGIONS.has(world.name)) {
    items.push(
      ...world.offerings.map((offering) => ({
        name: offering.name,
        icon: offering.icon,
        level: offering.level,
        withBackdrop: ["至冬", "挪德卡莱"].includes(world.name),
      })),
    );
  }
  if (world.name === "纳塔") {
    items.push(
      ...(world.natan_reputation?.tribal_list ?? []).map((tribe) => ({
        name: tribe.name,
        icon: tribe.icon || tribe.image,
        level: tribe.level,
        withBackdrop: true,
      })),
    );
  }
  return items;
});
const extraExplorationItems = computed<Array<TurWorldExtraExploration>>(() => {
  const configs = EXTRA_EXPLORATION_CONFIG[world.name] ?? [];
  return configs.flatMap<TurWorldExtraExploration>((config) => {
    const areaNames = config.areaNames ?? [config.name];
    const detailItems = world.detail_worlds.filter((item) => areaNames.includes(item.name));
    const displayItems = children.filter((item) => areaNames.includes(item.name));
    const explorationItems = detailItems.length > 0 ? detailItems : displayItems;
    if (explorationItems.length === 0) return [];
    const explorationPercentage = explorationItems.reduce(
      (total, item) => total + item.exploration_percentage,
      0,
    );
    const offeringDetailItems =
      config.areaNames === undefined
        ? detailItems
        : world.detail_worlds.filter(
            (item) => item.name === config.name || areaNames.includes(item.name),
          );
    const offering = offeringDetailItems.flatMap((item) => item.offerings).at(0);
    return [
      {
        ...config,
        explorationPercentage,
        offering,
      },
    ];
  });
});

function formatExploration(value: number): number {
  return Math.min(Math.max(value / 10, 0), 100);
}

async function shareWorldCard(): Promise<void> {
  const card = worldCardEl.value;
  if (card === null) return;
  const fileName = `世界探索卡片-${world.name}.png`;
  let progressAt = 0;

  function reportShareProgress(progress: ShareProgress): void {
    const isTail = progress.current >= progress.total;
    const now = performance.now();
    if (!isTail && now - progressAt < 80) return;
    progressAt = now;
    if (progress.phase === "snapshot") {
      void showLoading.update("正在截取背景", { title: "正在烘焙毛玻璃", timeout: 0 });
      return;
    }
    if (progress.phase === "bake") {
      void showLoading.update(`${progress.current}/${progress.total}`, {
        title: "正在烘焙毛玻璃",
        timeout: 0,
      });
      return;
    }
    void showLoading.update(`${progress.current}/${progress.total}`, {
      title: "正在生成图片",
      timeout: 0,
    });
  }

  await showLoading.start("正在生成世界探索分享图", fileName, 0);
  try {
    await TGShare.modern(fileName, card, 2, false, {
      bakeBackdrop: true,
      onProgress: reportShareProgress,
    });
    await TGLogger.Info(`[UserRecord][shareWorldCard][${world.name}] 生成分享图片成功`);
  } finally {
    await showLoading.end();
  }
}
</script>
<style lang="scss" scoped>
.tur-ws-box {
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 176px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: transparent;
  gap: 8px;
  isolation: isolate;
}

.tur-ws-bg {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
}

.tur-ws-bg img {
  width: 100%;
  height: 100%;
  filter: none;
  object-fit: cover;
  opacity: 1;
}

.tur-ws-main {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-start;
  gap: 12px;
}

.tur-ws-menu-host {
  display: flex;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  align-items: flex-start;
  border-radius: 50%;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
}

.tur-ws-menu-host :deep(.tur-wm-icon) {
  width: 100%;
  height: 100%;
}

.tur-ws-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
  color: var(--box-text-4);
  row-gap: 4px;
}

.tur-ws-title {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px inset var(--common-shadow-8);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  gap: 8px;
}

.tur-ws-title-share {
  overflow: hidden;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-ws-title-share:hover {
  color: var(--tgc-yellow-2);
}

.tur-ws-title-share:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--tgc-yellow-3);
  outline-offset: 2px;
}

.tur-ws-title-offerings {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.tur-ws-title-offering {
  display: flex;
  align-items: center;
}

.tur-ws-title-offering strong {
  flex-shrink: 0;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
}

.tur-ws-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tur-ws-meta-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tur-ws-meta-summary-item {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  align-items: center;
  font-family: var(--font-text);
  font-size: 13px;
  gap: 4px;
}

.tur-ws-meta-divider {
  width: 1px;
  min-height: 24px;
  flex: 0 0 1px;
  background: var(--common-shadow-2);
}

.tur-ws-meta strong {
  flex-shrink: 0;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-weight: normal;
}

.tur-ws-meta-name {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-ws-meta-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.tur-ws-meta-offerings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tur-ws-meta-offering {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.tur-ws-meta-offering--frosted {
  padding: 0 8px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
}

.tur-ws-incomplete-list {
  position: relative;
  display: flex;
  min-width: 0;
  height: fit-content;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  font-size: 12px;
  gap: 4px;
}

.tur-ws-incomplete-item {
  display: flex;
  min-width: 0;
  height: fit-content;
  align-items: center;
  padding: 0 4px;
  border-radius: 2px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-2);
  gap: 4px;
  line-height: 16px;
}

.tur-ws-incomplete-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-ws-incomplete-item strong {
  flex-shrink: 0;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-weight: normal;
}

.tur-ws-progress {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  margin-top: auto;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
  gap: 8px;
}

.tur-ws-progress-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tur-ws-progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  gap: 4px;
}

.tur-ws-progress-label strong {
  flex-shrink: 0;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-weight: normal;
}

.tur-ws-progress-label-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tur-ws-extra-level {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-size: 11px;
  gap: 4px;
}

.tur-ws-extra-offering-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  object-fit: contain;
}

.tur-ws-progress-bar {
  overflow: hidden;
}
</style>
