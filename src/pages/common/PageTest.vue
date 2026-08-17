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

  <!-- 养成浮层对照（mock 数据） -->
  <section class="material-gallery">
    <header class="gallery-header">
      <h2>养成浮层对照</h2>
      <p>
        审计相关浮层；数据为本地 mock（真实 Wiki ID，便于图标加载）。侧边栏「测试页面」或
        <code>/test</code> 可进入。
      </p>
    </header>

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

  <!-- 通用浮窗壳样板 -->
  <section class="material-gallery">
    <header class="gallery-header">
      <h2>TopOverlay</h2>
      <p>
        <code>app/top-overlay</code> = TOverlay + <code>t-overlay-panel</code>（header / content /
        footer / share）。
      </p>
    </header>
    <article class="gallery-section">
      <div class="btn-list">
        <v-btn color="var(--tgc-od-purple)" variant="tonal" @click="panelDemoVisible = true">
          打开 TopOverlay
        </v-btn>
      </div>
    </article>
  </section>

  <TopOverlay
    v-model="panelDemoVisible"
    closeAriaLabel="关闭浮窗面板样板"
    shareCaption="浮窗面板样板 · 测试页"
    shareAriaLabel="保存浮窗面板样板分享图"
    shareTitle="浮窗面板样板_PageTest"
    titleId="tolp-demo-title"
    topOffset="132px"
  >
    <template #header>
      <div class="tolp-demo-icon">
        <v-icon size="36">mdi-layers-outline</v-icon>
      </div>
      <div class="tolp-demo-identity">
        <h2 id="tolp-demo-title">浮窗面板样板</h2>
        <div class="tolp-demo-meta">
          <span class="tolp-demo-tag">TopOverlay</span>
          <span>header · content · footer · share</span>
        </div>
      </div>
    </template>

    <section class="tolp-demo-block">
      <header class="tolp-demo-block-title">
        <v-icon size="18">mdi-information-outline</v-icon>
        <h3>用途</h3>
      </header>
      <p>遮罩在 top-overlay；面板布局在 t-overlay-panel。footer 放操作底栏，share 放署名。</p>
    </section>
    <section class="tolp-demo-block">
      <header class="tolp-demo-block-title">
        <v-icon size="18">mdi-view-dashboard-outline</v-icon>
        <h3>Slots</h3>
      </header>
      <ul>
        <li><code>header</code> — 身份区（图标 + 标题）</li>
        <li><code>default</code> — 可滚动内容</li>
        <li><code>footer</code> — 操作底栏（筛选确认等）</li>
        <li><code>share</code> — 署名区（可覆盖默认文案）</li>
        <li>
          <code>actions</code> / <code>toolbar</code> / <code>left</code> / <code>right</code>
        </li>
      </ul>
    </section>

    <template #toolbar>
      <v-btn
        color="var(--tgc-od-orange)"
        size="small"
        variant="tonal"
        @click="panelDemoVisible = false"
      >
        确认关闭
      </v-btn>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import UcPlanSummaryOverlay from "@comp/userCalc/uc-plan-summary-overlay.vue";
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

const detailVisible = ref<boolean>(false);
const planSummaryVisible = ref<boolean>(false);
const planTargetVisible = ref<boolean>(false);
const panelDemoVisible = ref<boolean>(false);
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

.tolp-demo-icon {
  display: grid;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-purple);
  place-items: center;
}

.tolp-demo-identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tolp-demo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.tolp-demo-tag {
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-purple);
}

.tolp-demo-block {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;

  p,
  ul {
    margin: 0;
    color: var(--box-text-2);
    font-size: 14px;
    line-height: 20px;
  }

  ul {
    padding-left: 1.2em;
  }

  code {
    font-size: 12px;
  }
}

.tolp-demo-block-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }
}
</style>
