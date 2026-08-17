<template>
  <div class="test-box">
    <h1>颜色测试</h1>
    <div class="test-item">
      <div class="test-1">
        Box 1
        <div class="test-2">
          Box 2
          <div class="test-3">
            Box 3
            <div class="test-4">Box 4</div>
          </div>
        </div>
      </div>
    </div>
    <div class="btn-list">
      <v-btn class="test-btn" @click="testReply()">回复测试</v-btn>
      <v-btn class="test-btn" @click="test()">测试</v-btn>
    </div>
    <div style="height: 400px">
      <GroRerun />
    </div>
  </div>
  <VpReplyDebug v-model="showReply" />

  <!-- 养成材料组件对照（合并审计用，mock 数据） -->
  <section class="material-gallery">
    <header class="gallery-header">
      <h2>养成材料组件对照</h2>
      <p>
        审计相关组件并排展示，数据为本地 mock（真实 Wiki ID，便于图标加载）。侧边栏「测试页面」或
        <code>/test</code> 可进入。
      </p>
    </header>

    <article class="gallery-section">
      <h3>已复用 · UcMaterialCount</h3>
      <p class="gallery-hint">数量文案组件，多处共享；建议保留。</p>
      <div class="gallery-row">
        <div class="gallery-card">
          <span class="gallery-label">默认</span>
          <UcMaterialCount :complete="false" :craftable="12" :current="48" :required="120" />
        </div>
        <div class="gallery-card">
          <span class="gallery-label">compact + 已满足</span>
          <UcMaterialCount
            :complete="true"
            :craftable="0"
            :current="9999"
            :required="2000"
            compact
          />
        </div>
      </div>
    </article>

    <article class="gallery-section">
      <h3>材料需求项 · UcMaterialReq</h3>
      <p class="gallery-hint">
        从 Result 抽出；已接到 Result / 计划汇总 / 目标汇总 / PlanTargetCard。
      </p>
      <div class="gallery-item-list">
        <UcMaterialReq
          v-for="material in mockMaterials"
          :key="`req-${material.id}`"
          :material
          weakenReady
          @select="openDetail(material)"
        />
      </div>
    </article>

    <article class="gallery-section">
      <h3>UcMaterialResult</h3>
      <p class="gallery-hint">列表行已改为 UcMaterialReq；合成消耗使用 TMaterialStarChip。</p>
      <UcMaterialResult
        v-model:allowCrafting="allowCrafting"
        v-model:useDust="useDust"
        v-model:useSolvent="useSolvent"
        :bagMaterials="bagMaterials"
        :materials="mockMaterials"
        :missingKinds
        :uid="mockUid"
        emptyText="mock 空态不会出现"
        topOffset="132px"
        weakenReady
      />
    </article>

    <article class="gallery-section">
      <h3>UcPlanTargetCard</h3>
      <p class="gallery-hint">卡片内材料行已改用统一需求项（default 样式）。</p>
      <UcPlanTargetCard
        :canMoveDown="true"
        :canMoveUp="false"
        :entry="mockEntry"
        :fulfilled="false"
        :hasTodayMaterial="true"
        :materials="mockMaterials"
        :priority="1"
        :progress="42"
        @edit="noop"
        @material="onCardMaterial"
        @move="noop"
        @remove="noop"
        @status="noop"
        @summary="planTargetVisible = true"
      />
    </article>

    <article class="gallery-section">
      <h3>浮层 · Detail / 计划汇总 / 目标汇总</h3>
      <p class="gallery-hint">
        点击打开；内部材料列表与 Result 行同构，并各自挂了 UcMaterialDetail。
      </p>
      <div class="btn-list">
        <v-btn color="var(--tgc-od-orange)" variant="tonal" @click="openFirstDetail">
          打开 UcMaterialDetail
        </v-btn>
        <v-btn color="var(--tgc-od-blue)" variant="tonal" @click="planSummaryVisible = true">
          打开计划汇总 Overlay
        </v-btn>
        <v-btn color="var(--tgc-od-green)" variant="tonal" @click="planTargetVisible = true">
          打开目标汇总 Overlay
        </v-btn>
      </div>
    </article>
  </section>

  <UcMaterialDetail
    v-if="detailMaterial && detailWiki"
    v-model="detailVisible"
    :bag="bagMaterials.get(detailMaterial.id)"
    footerContext="测试页 mock"
    :material="detailMaterial"
    topOffset="132px"
    :uid="mockUid"
    :wiki="detailWiki"
  />

  <UcPlanSummaryOverlay
    v-model="planSummaryVisible"
    :bagMaterials
    inventoryUpdatedLabel="mock · 刚刚"
    :materials="mockMaterials"
    :project="mockProject"
    :targetCounts
    :uid="mockUid"
  />

  <UcPlanTargetSummaryOverlay
    v-model="planTargetVisible"
    :bagMaterials
    :entries="[mockEntry]"
    :entry="mockEntry"
    :materials="mockMaterials"
    :uid="mockUid"
    @select="noop"
  />
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import UcPlanSummaryOverlay from "@comp/userCalc/uc-plan-summary-overlay.vue";
import UcPlanTargetCard from "@comp/userCalc/uc-plan-target-card.vue";
import UcPlanTargetSummaryOverlay from "@comp/userCalc/uc-plan-target-summary-overlay.vue";
import GroRerun from "@comp/userGacha/gro-rerun.vue";
import VpReplyDebug from "@comp/viewPost/vp-reply-debug.vue";
import recordReq from "@req/recordReq.js";
import useUserStore from "@store/user.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, shallowRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";

const MOCK_MATERIAL_IDS = <const>[202, 112002, 112003, 112004];
const mockUid = 100000001;

const showReply = ref<boolean>(false);
const { account, cookie } = storeToRefs(useUserStore());

const allowCrafting = ref<boolean>(true);
const useDust = ref<boolean>(false);
const useSolvent = ref<boolean>(false);
const detailVisible = ref<boolean>(false);
const planSummaryVisible = ref<boolean>(false);
const planTargetVisible = ref<boolean>(false);
const detailMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const detailWiki = shallowRef<TGApp.App.Material.WikiItem>();

const mockWikis = computed<Array<TGApp.App.Material.WikiItem>>(() =>
  MOCK_MATERIAL_IDS.flatMap((id) => {
    const wiki = WikiMaterialData.find((item) => item.id === id);
    return wiki ? [wiki] : [];
  }),
);

const bagMaterials = computed<ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>>(() => {
  const rows: Array<[number, TGApp.Sqlite.UserBag.MaterialTable]> = [
    [202, bagRow(202, 128000)],
    [112002, bagRow(112002, 48)],
    [112003, bagRow(112003, 6)],
    [112004, bagRow(112004, 0)],
  ];
  return new Map(rows);
});

const mockMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() => {
  const wikiById = new Map(mockWikis.value.map((wiki) => [wiki.id, wiki]));
  const mora = wikiById.get(202);
  const slime1 = wikiById.get(112002);
  const slime2 = wikiById.get(112003);
  const slime3 = wikiById.get(112004);
  if (!mora || !slime1 || !slime2 || !slime3) return [];
  return [
    resultMaterial(mora, 200000, 128000, 0, []),
    resultMaterial(slime1, 90, 48, 0, []),
    resultMaterial(slime2, 36, 6, 12, [
      {
        id: 112002,
        name: "史莱姆凝液",
        type: "角色与武器培养素材",
        star: 1,
        count: 36,
        owned: 48,
      },
    ]),
    resultMaterial(slime3, 12, 0, 2, [
      {
        id: 112003,
        name: "史莱姆清",
        type: "角色与武器培养素材",
        star: 2,
        count: 6,
        owned: 6,
      },
    ]),
  ];
});

const missingKinds = computed<number>(
  () => mockMaterials.value.filter((material) => material.missing > 0).length,
);

const mockProject = computed<TGApp.Sqlite.Cultivation.Project>(() => ({
  id: "mock-project",
  uid: mockUid,
  name: "材料组件对照计划",
  isChosen: true,
  timezone: 8,
  created: "2026-08-17T00:00:00.000Z",
  updated: "2026-08-17T00:00:00.000Z",
}));

const targetCounts = computed(() => ({
  active: 1,
  fulfilled: 0,
  completed: 0,
}));

const mockEntry = computed<TGApp.Sqlite.Cultivation.EntryWithItems>(() => ({
  id: "mock-entry",
  projectId: "mock-project",
  type: "avatar",
  itemId: 10000046,
  instanceKey: "",
  name: "胡桃（mock）",
  icon: `/icon/material/${MOCK_MATERIAL_IDS[0]}.webp`,
  star: 5,
  currentState: {
    level: 70,
    promoteLevel: 4,
    ascended: true,
    talents: [
      { id: 1, name: "普通攻击", level: 6 },
      { id: 2, name: "元素战技", level: 6 },
      { id: 3, name: "元素爆发", level: 6 },
    ],
  },
  targetState: {
    level: 90,
    promoteLevel: 6,
    ascended: true,
    talents: [
      { id: 1, name: "普通攻击", level: 9 },
      { id: 2, name: "元素战技", level: 10 },
      { id: 3, name: "元素爆发", level: 10 },
    ],
  },
  status: "active",
  sortOrder: 0,
  calculationMode: "bag",
  allowCrafting: true,
  useDust: false,
  useSolvent: false,
  created: "2026-08-17T00:00:00.000Z",
  updated: "2026-08-17T00:00:00.000Z",
  items: mockMaterials.value.map((material) => ({
    entryId: "mock-entry",
    materialId: material.id,
    required: material.required,
  })),
}));

function bagRow(id: number, count = 0): TGApp.Sqlite.UserBag.MaterialTable {
  return {
    uid: mockUid,
    id,
    count,
    records: [],
    updated: "2026-08-17 16:00:00",
  };
}

function resultMaterial(
  wiki: TGApp.App.Material.WikiItem,
  required: number,
  owned: number,
  craftable: number,
  craftingCosts: Array<TGApp.App.UserCalc.CraftingCost>,
): TGApp.App.UserCalc.ResultMaterial {
  const available = owned + craftable;
  const missing = Math.max(required - available, 0);
  const progress = required <= 0 ? 100 : Math.min((available / required) * 100, 100);
  return {
    id: wiki.id,
    name: wiki.name,
    type: wiki.type,
    star: wiki.star,
    required,
    owned,
    craftable,
    craftingCosts,
    missing,
    progress,
  };
}

function noop(): void {
  return;
}

async function openDetail(material: TGApp.App.UserCalc.ResultMaterial | undefined): Promise<void> {
  if (!material) {
    showSnackbar.warn("暂无 mock 材料可打开");
    return;
  }
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) {
    showSnackbar.warn(`未找到材料 Wiki：${material.id}`);
    return;
  }
  detailVisible.value = false;
  detailMaterial.value = material;
  detailWiki.value = wiki;
  await nextTick();
  detailVisible.value = true;
}

async function openFirstDetail(): Promise<void> {
  await openDetail(mockMaterials.value[0]);
}

function onCardMaterial(materialId: number): void {
  const material = mockMaterials.value.find((item) => item.id === materialId);
  void openDetail(material);
}

function testReply(): void {
  showReply.value = true;
}

async function test() {
  if (!cookie.value) return;
  let dnResp: TGApp.Game.DailyNote.DnResp | undefined;
  try {
    dnResp = await recordReq.daily(cookie.value, account.value);
    console.debug(`dailyNoteResp`, dnResp);
    if (dnResp.retcode !== 0) {
      showSnackbar.warn(`获取实时便笺失败: ${dnResp.retcode}-${dnResp.message}`);
      await TGLogger.Warn(`[PageTest][test] 获取实时便笺失败`);
      await TGLogger.Warn(`[PageTest][test] ${dnResp}`);
      return;
    }
    showSnackbar.success("成功获取实时便笺数据");
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取实时便笺失败：${errMsg}`);
    await TGLogger.Error(`[PageTest][test] 获取实时便笺失败`);
    await TGLogger.Error(`[PageTest][test] ${e}`);
  }
}
</script>
<style lang="scss" scoped>
.test-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-item {
  padding: 10px;
  border-radius: 8px;
}

.btn-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 12px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.test-1,
.test-2,
.test-3,
.test-4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
}

.test-1 {
  background: var(--box-bg-1);
}

.test-2 {
  background: var(--box-bg-2);
}

.test-3 {
  background: var(--box-bg-3);
}

.test-4 {
  background: var(--box-bg-4);
}

.material-gallery {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-top: 1px solid var(--common-shadow-1);
  margin-top: 24px;
  gap: 20px;
}

.gallery-header {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 24px;
    font-weight: normal;
  }

  p {
    margin: 0;
    color: var(--common-text-sub);
    font-size: 13px;
    line-height: 1.5;
  }
}

.gallery-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
  }
}

.gallery-hint {
  margin: 0;
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 1.5;
}

.gallery-row {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.gallery-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  gap: 8px;
}

.gallery-label {
  color: var(--box-text-4);
  font-size: 12px;
  font-weight: 600;
}

.gallery-item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
