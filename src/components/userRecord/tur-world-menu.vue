<!-- 地区探索详情菜单 -->
<template>
  <v-menu
    :close-on-content-click="false"
    :location="menuLocation"
    location-strategy="connected"
    offset="8"
    open-on-click
    origin="auto"
    style="z-index: calc(var(--tgi-loading) - 1)"
  >
    <template #activator="{ props: menuProps }">
      <button
        :aria-label="`${world.name}探索信息`"
        class="tur-wm-icon"
        type="button"
        v-bind="menuProps"
      >
        <TMiImg
          :alt="`${world.name}图标`"
          :ori="true"
          :src="world.icon"
          :style="{ filter: imgFilter }"
        />
      </button>
    </template>
    <div ref="menuRef" :class="{ 'tur-wm-menu--sharing': isSharing }" class="tur-wm-menu">
      <div class="tur-wm-menu-title">
        <div class="tur-wm-title-main">
          <div aria-hidden="true" class="tur-wm-icon tur-wm-title-icon">
            <TMiImg :ori="true" :src="world.icon" :style="{ filter: imgFilter }" alt="" />
          </div>
          <span :title="`${world.name}探索信息`">{{ world.name }}探索信息</span>
          <v-icon
            aria-label="分享探索信息"
            class="tur-wm-share"
            data-html2canvas-ignore
            size="12"
            title="分享探索信息"
            @click.stop="shareMenu"
          >
            mdi-share-variant
          </v-icon>
        </div>
        <div class="tur-wm-exploration">
          <span class="tur-wm-exploration-label">总探索度</span>
          <strong class="tur-wm-exploration-value">{{ explorationPercent }}%</strong>
        </div>
      </div>
      <div class="tur-wm-menu-body">
        <div v-if="hasMenuSummary" class="tur-wm-menu-summary">
          <div v-if="hasStatueLevel" class="tur-wm-summary-item">
            <div class="tur-wm-summary-label-group">
              <TMiImg :ori="true" :src="statueIcon" alt="神像等级" class="tur-wm-summary-icon" />
              <span :title="statueLevelLabel" class="tur-wm-summary-label">
                {{ statueLevelLabel }}
              </span>
            </div>
            <strong>{{ world.seven_statue_level }}级</strong>
          </div>
          <div v-if="showReputation" class="tur-wm-summary-item">
            <div class="tur-wm-summary-label-group">
              <TMiImg
                :ori="true"
                :src="reputationIcon"
                alt="声望等级"
                class="tur-wm-summary-icon"
              />
              <span class="tur-wm-summary-label">声望等级</span>
            </div>
            <strong>{{ world.level }}级</strong>
          </div>
        </div>
        <section v-if="offeringList.length > 0" class="tur-wm-menu-section">
          <h3>
            <v-icon aria-hidden="true" size="16">mdi-hand-heart-outline</v-icon>
            <span>供奉</span>
          </h3>
          <div
            :class="{ 'tur-wm-menu-list--single': offeringList.length === 1 }"
            class="tur-wm-menu-list"
          >
            <div
              v-for="offering in offeringList"
              :key="`${offering.areaId}-${offering.name}`"
              class="tur-wm-menu-item tur-wm-offering-item"
            >
              <TMiImg
                :alt="offering.name"
                :ori="true"
                :src="offering.icon"
                class="tur-wm-menu-icon"
              />
              <div class="tur-wm-offering-content">
                <strong>{{ offering.level }}级</strong>
                <span :title="offering.description" class="tur-wm-menu-name">
                  {{ offering.description }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="tribalList.length > 0" class="tur-wm-menu-section">
          <h3>
            <v-icon aria-hidden="true" size="16">mdi-account-group-outline</v-icon>
            <span>部族声望等级</span>
          </h3>
          <div class="tur-wm-menu-grid">
            <div v-for="tribe in tribalList" :key="tribe.id" class="tur-wm-menu-item">
              <TMiImg
                :alt="tribe.name"
                :ori="true"
                :src="tribe.icon || tribe.image"
                class="tur-wm-menu-icon"
              />
              <span :title="tribe.name" class="tur-wm-menu-name">{{ tribe.name }}</span>
              <strong>{{ tribe.level }}级</strong>
            </div>
          </div>
        </section>

        <section v-if="areaExplorationList.length > 0" class="tur-wm-menu-section">
          <h3>
            <v-icon aria-hidden="true" size="16">mdi-map-marker-path</v-icon>
            <span>详细区域探索度</span>
          </h3>
          <div class="tur-wm-menu-grid">
            <div
              v-for="area in areaExplorationList"
              :key="area.name"
              class="tur-wm-menu-item tur-wm-detail-item"
            >
              <v-icon aria-hidden="true" class="tur-wm-row-icon" size="16">
                mdi-map-marker-outline
              </v-icon>
              <span :title="area.name" class="tur-wm-menu-name">{{ area.name }}</span>
              <strong>{{ formatExploration(area.exploration_percentage) }}%</strong>
            </div>
          </div>
        </section>

        <section v-if="bossList.length > 0" class="tur-wm-menu-section">
          <h3>
            <v-icon aria-hidden="true" size="16">mdi-book-open-page-variant-outline</v-icon>
            <span>区域首领图鉴</span>
          </h3>
          <div class="tur-wm-menu-grid">
            <div
              v-for="boss in bossList"
              :key="boss.name"
              class="tur-wm-menu-item tur-wm-boss-item"
            >
              <TMiImg
                :alt="`${boss.name}图标`"
                :ori="true"
                :style="{ filter: imgFilter }"
                class="tur-wm-row-icon"
                src="/UI/record/boss.webp"
              />
              <span :title="boss.name" class="tur-wm-menu-name">{{ boss.name }}</span>
              <strong>{{ boss.kill_num }}次</strong>
            </div>
          </div>
        </section>

        <div v-if="!hasMenuDetails" class="tur-wm-menu-empty">暂无额外探索信息</div>
      </div>
      <footer class="tur-wm-menu-footer">
        <span>UID {{ uid }}</span>
        <span>TeyvatGuide v{{ version ?? "-" }}</span>
      </footer>
    </div>
  </v-menu>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showLoading from "@comp/func/loading.js";
import useAppStore from "@store/app.js";
import TGLogger from "@utils/TGLogger.js";
import TGShare from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, useTemplateRef } from "vue";

type TurWorldMenuProps = {
  world: TGApp.Game.Record.WorldExploreDisplay;
  children: Array<TGApp.Game.Record.WorldExploreDisplayItem>;
  menuLocation: "start" | "end";
  uid: number;
  version?: string;
};

type TurWorldMenuOffering = TGApp.Game.Record.WorldOffering & {
  areaId: number;
  description: string;
};

const OFFERING_AREA_NAME_ALIASES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  璃月: { "层岩巨渊·地下矿区": "层岩巨渊" },
};

const { theme } = storeToRefs(useAppStore());
const { world, children, menuLocation, uid, version } = defineProps<TurWorldMenuProps>();
const menuEl = useTemplateRef<HTMLDivElement>("menuRef");
const isSharing = ref<boolean>(false);

const statueIcon = "/UI/record/pos.webp";
const reputationIcon =
  "https://webstatic.mihoyo.com/app/community-game-records/images/country-level-icon.03b22013.png";
const imgFilter = computed<string>(() => (theme.value === "dark" ? "none" : "invert(0.75)"));
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
const hasMenuSummary = computed<boolean>(() => hasStatueLevel.value || showReputation.value);
const offeringList = computed<Array<TurWorldMenuOffering>>(() => {
  const list: Array<TurWorldMenuOffering> = [];
  const descriptions = new Set<string>();
  const append = (
    offering: TGApp.Game.Record.WorldOffering,
    areaId: number,
    description: string,
  ): void => {
    if (descriptions.has(description)) return;
    descriptions.add(description);
    list.push({
      ...offering,
      areaId,
      description,
    });
  };
  for (const offering of world.offerings) append(offering, world.id, offering.name);
  const areaNameAliases = OFFERING_AREA_NAME_ALIASES[world.name] ?? {};
  for (const detail of world.detail_worlds) {
    const areaName = areaNameAliases[detail.name] ?? detail.name;
    for (const offering of detail.offerings) {
      append(offering, detail.id, `${offering.name}-${areaName}`);
    }
  }
  return list;
});
const areaExplorationList = computed<Array<TGApp.Game.Record.AreaExploration>>(() => {
  const list: Array<TGApp.Game.Record.AreaExploration> = [];
  const names = new Set<string>();
  const append = (items: Array<TGApp.Game.Record.AreaExploration>): void => {
    for (const item of items) {
      if (names.has(item.name)) continue;
      names.add(item.name);
      list.push(item);
    }
  };
  append(
    world.detail_worlds.map((detail) => ({
      name: detail.name,
      exploration_percentage: detail.exploration_percentage,
    })),
  );
  append(world.area_exploration_list);
  append(
    children.map((item) => ({
      name: item.name,
      exploration_percentage: item.exploration_percentage,
    })),
  );
  return world.name === "璃月" ? list.filter((item) => item.name !== "沉玉谷") : list;
});
const tribalList = computed<Array<TGApp.Game.Record.NataOffering>>(
  () => world.natan_reputation?.tribal_list ?? [],
);
const bossList = computed<Array<TGApp.Game.Record.AreaBoss>>(() => {
  const list: Array<TGApp.Game.Record.AreaBoss> = [];
  const names = new Set<string>();
  for (const boss of [
    ...world.boss_list,
    ...world.detail_worlds.flatMap((detail) => detail.boss_list),
  ]) {
    if (names.has(boss.name)) continue;
    names.add(boss.name);
    list.push(boss);
  }
  return list;
});
const hasMenuDetails = computed<boolean>(
  () =>
    offeringList.value.length > 0 ||
    tribalList.value.length > 0 ||
    areaExplorationList.value.length > 0 ||
    bossList.value.length > 0,
);

function formatExploration(value: number): number {
  return Math.min(Math.max(value / 10, 0), 100);
}

async function shareMenu(): Promise<void> {
  const menu = menuEl.value;
  if (menu === null) return;
  const fileName = `世界探索-${world.name}.png`;
  await showLoading.start("正在生成探索分享图片", fileName, 0);
  isSharing.value = true;
  try {
    await nextTick();
    await TGShare.modern(fileName, menu, 1.5, false, { bakeBackdrop: true });
    await TGLogger.Info(`[UserRecord][shareWorld][${world.name}] 生成分享图片成功`);
  } finally {
    isSharing.value = false;
    await nextTick();
    await showLoading.end();
  }
}
</script>
<style lang="scss" scoped>
.tur-wm-icon {
  position: relative;
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

button.tur-wm-icon:hover {
  background: var(--common-shadow-1);
}

button.tur-wm-icon:focus-visible {
  outline: 2px solid var(--tgc-yellow-3);
  outline-offset: 2px;
}

.tur-wm-icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tur-wm-menu {
  display: flex;
  overflow: hidden;
  width: 400px;
  max-height: min(560px, calc(100vh - 96px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  gap: 8px;
}

.tur-wm-menu--sharing {
  max-height: none;
  box-shadow: none;
}

.tur-wm-menu-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  gap: 8px;
}

.tur-wm-title-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
}

.tur-wm-title-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
  cursor: default;
}

.tur-wm-title-main span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-wm-exploration {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.tur-wm-exploration-label {
  color: var(--box-text-2);
}

.tur-wm-exploration-value {
  flex-shrink: 0;
  color: var(--tgc-od-orange);
  font-weight: normal;
  white-space: nowrap;
}

.tur-wm-share {
  flex-shrink: 0;
  color: var(--tgc-od-white);
  cursor: pointer;

  &:hover {
    color: var(--tgc-yellow-2);
  }
}

.tur-wm-menu-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;

  .tur-wm-menu--sharing & {
    overflow: visible;
  }
}

.tur-wm-menu-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--common-shadow-1);
  color: var(--tgc-od-white);
  font-size: 10px;
  gap: 8px;
  white-space: nowrap;
}

.tur-wm-menu-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tur-wm-summary-item {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--box-text-2);
  font-size: 14px;
  gap: 4px;
}

.tur-wm-summary-label-group {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.tur-wm-summary-label {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-wm-summary-item strong {
  flex-shrink: 0;
  color: var(--tgc-od-orange);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
}

.tur-wm-summary-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: contain;
}

.tur-wm-menu-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tur-wm-menu-section h3 {
  display: flex;
  align-items: center;
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  gap: 6px;
}

.tur-wm-menu-section h3 .v-icon {
  color: var(--box-text-2);
}

.tur-wm-menu-list,
.tur-wm-menu-grid {
  display: grid;
  gap: 8px;
}

.tur-wm-menu-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tur-wm-menu-list--single {
  grid-template-columns: minmax(0, 1fr);
}

.tur-wm-menu-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tur-wm-menu-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 12px;
}

.tur-wm-offering-item {
  justify-content: flex-start;
  padding: 4px 8px;
}

.tur-wm-offering-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  color: var(--box-text-4);
  font-size: 10px;
  gap: 0;
  line-height: 1;
}

.tur-wm-offering-content strong {
  font-size: 14px;
}

.tur-wm-menu-item strong {
  flex-shrink: 0;
  color: var(--tgc-od-orange);
  font-family: var(--font-title);
  font-weight: normal;
}

.tur-wm-menu-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: contain;
}

.tur-wm-row-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--box-text-2);
  object-fit: contain;
}

.tur-wm-menu-name {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tur-wm-menu-empty {
  padding: 16px 8px;
  color: var(--box-text-2);
  font-size: 12px;
  text-align: center;
}
</style>
