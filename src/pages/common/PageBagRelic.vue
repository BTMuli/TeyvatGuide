<!-- 背包圣遗物页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pbr-nav-prepend">
        <img alt="icon" src="/UI/nav/userBag.webp" />
        <span>背包圣遗物</span>
        <v-select
          v-model="curUid"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="存档UID"
          variant="outlined"
          width="200px"
        />
      </div>
    </template>
    <template #append>
      <div class="pbr-nav-append">
        <div class="pbr-nav-search">
          <v-text-field
            v-model="search"
            :clearable="true"
            :hide-details="true"
            append-inner-icon="mdi-magnify"
            autocomplete="off"
            density="compact"
            label="搜索"
            variant="outlined"
            @keydown.enter="searchRelic()"
            @click:append-inner="searchRelic()"
          />
        </div>
        <v-btn
          class="pbr-ne-btn"
          prepend-icon="mdi-filter"
          variant="elevated"
          @click="showFilter = true"
        >
          筛选
        </v-btn>
        <v-btn
          class="pbr-ne-btn"
          prepend-icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="tryImportRelic()"
        >
          导入
        </v-btn>
        <v-btn class="pbr-ne-btn" prepend-icon="mdi-plus" variant="elevated" @click="createUid()">
          新建存档
        </v-btn>
        <v-btn class="pbr-ne-btn" prepend-icon="mdi-delete" variant="elevated" @click="deleteUid()">
          删除存档
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="pbr-nav-extension">
        <span class="pbr-load-count">
          已显示 <strong>{{ visibleRelics.length }}</strong> / {{ relicShow.length }}
        </span>
        <v-progress-linear
          :color="hasMoreRelics ? 'var(--tgc-od-blue)' : 'var(--tgc-od-green)'"
          :model-value="relicShow.length ? (visibleRelics.length / relicShow.length) * 100 : 0"
          :rounded="true"
          bg-color="var(--tgc-od-white)"
          class="pbr-load-progress"
          height="4"
        />
        <span class="pbr-load-hint">
          {{ hasMoreRelics ? "继续滚动加载" : relicShow.length ? "已全部显示" : "暂无数据" }}
        </span>
      </div>
    </template>
  </v-app-bar>
  <div class="pbr-container">
    <template v-for="relic in visibleRelics" :key="relic.guid">
      <PbRelicItem
        :detail="showDetail"
        :relic
        :selected="relic.guid === curRelic?.guid"
        @select="handleSelect"
      />
    </template>
    <div v-if="hasMoreRelics" ref="loadMoreRef" class="pbr-load-trigger" />
  </div>
  <PbRelicDetail v-if="curRelic" v-model:show="showDetail" :cur="curRelic" />
  <PbRelicFilter v-model="showFilter" @filter="handleFilter" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PbRelicDetail from "@comp/pageBag/pb-relic-detail.vue";
import PbRelicFilter, { type RelicFilterValue } from "@comp/pageBag/pb-relic-filter.vue";
import PbRelicItem from "@comp/pageBag/pb-relic-item.vue";
import TSUserBagRelic from "@Sqlm/userBagRelic.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  triggerRef,
  useTemplateRef,
  watch,
} from "vue";

const { isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());

const curUid = ref<number>(0);
const uidList = shallowRef<Array<number>>([]);

const search = ref<string>();
const showFilter = ref<boolean>(false);

const filterSlot = ref<Array<number>>([]);
const filterStar = ref<Array<number>>([]);
const filterSet = ref<Array<number>>([]);
const filterMainProp = ref<Array<number>>([]);
const filterSubProp = ref<Array<number>>([]);
const filterLocked = ref<boolean | null>(null);
const filterMarked = ref<boolean | null>(null);
const filterGrade = ref<Array<string>>([]);

const curIdx = ref<number>(0);
const showDetail = ref<boolean>(false);
const curRelic = shallowRef<TGApp.Sqlite.UserBag.RelicTable>();
const relicList = shallowRef<Array<TGApp.Sqlite.UserBag.RelicTable>>([]);
const relicShow = shallowRef<Array<TGApp.Sqlite.UserBag.RelicTable>>([]);
const isFilterInitialized = ref<boolean>(false);
const RELIC_RENDER_SIZE: Readonly<number> = 100;
const renderedCount = ref<number>(RELIC_RENDER_SIZE);
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
let loadMoreObserver: IntersectionObserver | undefined;

const visibleRelics = computed<Array<TGApp.Sqlite.UserBag.RelicTable>>(() =>
  relicShow.value.slice(0, renderedCount.value),
);
const hasMoreRelics = computed<boolean>(() => renderedCount.value < relicShow.value.length);

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
  initLoadMoreObserver();
});

onBeforeUnmount(() => {
  loadMoreObserver?.disconnect();
});

watch(
  () => curUid.value,
  async () => {
    await loadRelicList(curUid.value);
  },
);

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserBagRelic.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid))) {
    curUid.value = Number(account.value.gameUid);
  } else if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    curUid.value = Number(account.value.gameUid);
  } else curUid.value = 0;
}

function handleFilter(value: RelicFilterValue): void {
  isFilterInitialized.value = true;
  filterSlot.value = value.slot;
  filterStar.value = value.star;
  filterSet.value = value.set;
  filterMainProp.value = value.mainProp;
  filterSubProp.value = value.subProp;
  filterLocked.value = value.locked;
  filterMarked.value = value.marked;
  filterGrade.value = value.grade;
  relicShow.value = filterRelics(relicList.value);
  triggerRef(relicShow);
  curIdx.value = 0;
  resetRenderedRelics();
  if (relicShow.value.length === 0) {
    showSnackbar.warn("未找到符合条件的圣遗物!");
  } else {
    showSnackbar.success(`筛选完成，共 ${relicShow.value.length} 件圣遗物`);
  }
}

function filterRelics(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  let result = data;
  if (filterSlot.value.length > 0) {
    result = result.filter((i) => filterSlot.value.includes(i.brief.pos));
  }
  if (filterStar.value.length > 0) {
    result = result.filter((i) => filterStar.value.includes(i.brief.star));
  }
  if (filterSet.value.length > 0) {
    result = result.filter((i) => filterSet.value.includes(i.sets));
  }
  if (filterMainProp.value.length > 0) {
    result = result.filter((i) => filterMainProp.value.includes(i.mp.type));
  }
  if (filterSubProp.value.length > 0) {
    result = result.filter((i) =>
      filterSubProp.value.every((propType) => i.sp.some((sp) => sp.type === propType)),
    );
  }
  if (filterLocked.value !== null) {
    result = result.filter((i) => i.is_locked === filterLocked.value);
  }
  if (filterMarked.value !== null) {
    result = result.filter((i) => i.is_marked === filterMarked.value);
  }
  if (filterGrade.value.length > 0) {
    result = result.filter((i) => {
      const totalSubPropCount = i.sp.reduce((sum, sp) => sum + sp.vals.length, 0);
      let match = false;
      for (const grade of filterGrade.value) {
        switch (grade) {
          case "init3":
            if (i.level === 1 && totalSubPropCount === 3) match = true;
            break;
          case "init4":
            if (i.level === 1 && totalSubPropCount === 4) match = true;
            break;
          case "enhance5":
            if (i.level === 21 && totalSubPropCount === 9) match = true;
            break;
          case "enhance4":
            if (i.level === 21 && totalSubPropCount === 8) match = true;
            break;
        }
      }
      return match;
    });
  }
  return result;
}

function sortRelics(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  return data.sort(
    (a, b) => b.brief.star - a.brief.star || a.brief.pos - b.brief.pos || b.level - a.level,
  );
}

async function loadRelicList(uid: number): Promise<void> {
  await showLoading.start(`正在加载 ${uid} 的圣遗物数据`);
  relicShow.value = [];
  relicList.value = [];
  filterSlot.value = [];
  filterStar.value = [];
  filterSet.value = [];
  filterMainProp.value = [];
  filterSubProp.value = [];
  filterLocked.value = null;
  filterMarked.value = null;
  filterGrade.value = [];
  const dList = await TSUserBagRelic.getRelic(uid);
  relicList.value = sortRelics(dList);
  relicShow.value = relicList.value;
  curIdx.value = 0;
  resetRenderedRelics();
  await showLoading.end();
}

function searchRelic(): void {
  let selectData = filterRelics(relicList.value);
  if (search.value === undefined || search.value === "" || search.value === null) {
    if (relicShow.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    relicShow.value = selectData;
    resetRenderedRelics();
    showSnackbar.success("已重置!");
    return;
  }
  selectData = selectData.filter((i) => {
    const idStr = i.id.toString();
    const levelStr = i.level.toString();
    return (
      idStr.includes(search.value!) ||
      levelStr.includes(search.value!) ||
      i.brief.name.includes(search.value!)
    );
  });
  if (selectData.length === 0) {
    showSnackbar.warn("未找到符合条件的圣遗物!");
    return;
  }
  relicShow.value = selectData;
  resetRenderedRelics();
  showSnackbar.success(`找到${selectData.length}条符合条件的圣遗物`);
}

async function tryImportRelic(): Promise<void> {
  await tryCallYae(curUid.value.toString());
}

async function createUid(): Promise<void> {
  let uidDefault: string = "";
  if (account.value && !uidList.value.includes(Number(account.value.gameUid))) {
    uidDefault = account.value.gameUid;
  }
  const uidInput = await showDialog.input("请输入新存档UID", "UID:", uidDefault);
  if (uidInput === undefined || uidInput === false) {
    showSnackbar.cancel("已取消");
    return;
  }
  if (isNaN(Number(uidInput))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  if (uidList.value.includes(Number(uidInput))) {
    showSnackbar.warn("该存档已存在！");
    return;
  }
  uidList.value.push(Number(uidInput));
  curUid.value = Number(uidInput);
  showSnackbar.success(`切换到新存档 ${Number(uidInput)}`);
}

async function deleteUid(): Promise<void> {
  if (!curUid.value) {
    showSnackbar.warn("未检测到存档数据!");
    return;
  }
  const delCheck = await showDialog.check(
    "确定删除该存档?",
    `确认则清空存档-${curUid.value}对应数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消删除存档");
    return;
  }
  await TSUserBagRelic.delUid(curUid.value);
  await reloadUid();
  showSnackbar.success(`已删除对应存档，即将刷新`);
}

function resetRenderedRelics(): void {
  renderedCount.value = Math.min(RELIC_RENDER_SIZE, relicShow.value.length);
  nextTick(() => {
    observeLoadMore();
  });
}

function loadMoreRelics(): void {
  if (!hasMoreRelics.value) return;
  renderedCount.value = Math.min(renderedCount.value + RELIC_RENDER_SIZE, relicShow.value.length);
}

function initLoadMoreObserver(): void {
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRelics();
    },
    { rootMargin: "360px" },
  );
  observeLoadMore();
}

function observeLoadMore(): void {
  if (!loadMoreObserver || !loadMoreRef.value) return;
  loadMoreObserver.disconnect();
  loadMoreObserver.observe(loadMoreRef.value);
}

function handleSelect(relic: TGApp.Sqlite.UserBag.RelicTable): void {
  curRelic.value = relic;
  showDetail.value = true;
}
</script>
<style lang="scss" scoped>
.pbr-nav-prepend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.pbr-nav-search {
  position: relative;
  width: 240px;
  margin-right: 8px;
}

.pbr-nav-append {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.pbr-ne-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.pbr-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.pbr-nav-extension {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  padding: 0 16px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 12px;
}

.pbr-load-count,
.pbr-load-hint {
  flex: none;
  white-space: nowrap;
}

.pbr-load-count strong {
  color: rgb(var(--v-theme-primary));
  font-size: 14px;
}

.pbr-load-progress {
  min-width: 80px;
  flex: 1;
}

.pbr-load-hint {
  color: var(--common-text-secondary);
}

.pbr-load-trigger {
  width: 100%;
  height: 1px;
  grid-column: 1 / -1;
}
</style>
