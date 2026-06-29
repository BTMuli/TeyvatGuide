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
            density="compact"
            label="搜索"
            variant="outlined"
            @keydown.enter="searchRelic()"
            @click:append-inner="searchRelic()"
          />
        </div>
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
        <v-select
          v-model="selectSlot"
          :clearable="true"
          :hide-details="true"
          :items="slotList"
          density="compact"
          item-title="text"
          item-value="value"
          label="部位"
          variant="outlined"
          width="140px"
        />
        <v-select
          v-model="selectStar"
          :clearable="true"
          :hide-details="true"
          :items="starList"
          density="compact"
          item-title="text"
          item-value="value"
          label="星级"
          variant="outlined"
          width="120px"
        />
        <v-select
          v-model="selectSet"
          :clearable="true"
          :hide-details="true"
          :items="setList"
          density="compact"
          item-title="name"
          item-value="id"
          label="套装"
          variant="outlined"
          width="200px"
        />
        <v-select
          v-model="selectMainProp"
          :clearable="true"
          :hide-details="true"
          :items="mainPropList"
          density="compact"
          item-title="name"
          item-value="id"
          label="主词条"
          variant="outlined"
          width="180px"
        />
        <v-btn
          :class="{ active: selectLocked === true }"
          density="compact"
          icon
          variant="text"
          @click="toggleLocked()"
        >
          🔒
        </v-btn>
        <v-btn
          :class="{ active: selectMarked === true }"
          icon
          density="compact"
          variant="text"
          @click="toggleMarked()"
        >
          ⭐
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="pbr-container">
    <template v-for="relic in relicShow" :key="relic.guid">
      <PbRelicItem
        :relic
        :selected="relic.guid === curRelic?.guid"
        :detail="showDetail"
        @select="handleSelect"
      />
    </template>
  </div>
  <PbRelicDetail v-if="curRelic" v-model:show="showDetail" :cur="curRelic" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserBagRelic from "@Sqlm/userBagRelic.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, triggerRef, watch } from "vue";
import PbRelicItem from "@comp/pageBag/pb-relic-item.vue";
import { wrSet, wrMainProp, AppPropMapData } from "@/data/index.js";
import PbRelicDetail from "@comp/pageBag/pb-relic-detail.vue";

/** 圣遗物部位选项 */
type SlotOption = {
  text: string;
  value: number;
};

/** 圣遗物星级选项 */
type StarOption = {
  text: string;
  value: number;
};

/** 套装选项 */
type SetOption = {
  id: number;
  name: string;
};

/** 主词条选项 */
type MainPropOption = {
  id: number;
  name: string;
};

const { gameDir, isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());

const starList: Array<StarOption> = [
  { text: "1星", value: 1 },
  { text: "2星", value: 2 },
  { text: "3星", value: 3 },
  { text: "4星", value: 4 },
  { text: "5星", value: 5 },
];
const slotList: Array<SlotOption> = [
  { text: "生之花", value: 1 },
  { text: "死之羽", value: 2 },
  { text: "时之沙", value: 3 },
  { text: "空之杯", value: 4 },
  { text: "理之冠", value: 5 },
];
const setList: Array<SetOption> = wrSet.map((s) => ({ id: s.id, name: s.name }));
const mainPropList: Array<MainPropOption> = Array.from(new Set(Object.values(wrMainProp))).map(
  (propId) => {
    const propInfo = AppPropMapData[propId];
    return {
      id: propId,
      name: propInfo ? propInfo.filter_name : `属性${propId}`,
    };
  },
);

const curUid = ref<number>(0);
const uidList = shallowRef<Array<number>>([]);

const search = ref<string>();
const selectSlot = ref<number | null>(null);
const selectStar = ref<number | null>(null);
const selectSet = ref<number | null>(null);
const selectMainProp = ref<number | null>(null);
const selectLocked = ref<boolean | null>(null);
const selectMarked = ref<boolean | null>(null);

const curIdx = ref<number>(0);
const showDetail = ref<boolean>(false);
const curRelic = shallowRef<TGApp.Sqlite.UserBag.RelicTable>();
const relicList = shallowRef<Array<TGApp.Sqlite.UserBag.RelicTable>>([]);
const relicShow = shallowRef<Array<TGApp.Sqlite.UserBag.RelicTable>>([]);

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
});

watch(
  () => curUid.value,
  async () => {
    await loadRelicList(curUid.value);
  },
);
watch(
  () => [
    selectSlot.value,
    selectStar.value,
    selectSet.value,
    selectMainProp.value,
    selectLocked.value,
    selectMarked.value,
  ],
  () => {
    relicShow.value = filterRelics(relicList.value);
    triggerRef(relicShow);
    curIdx.value = 0;
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

function filterRelics(
  data: Array<TGApp.Sqlite.UserBag.RelicTable>,
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  let result = data;
  if (selectSlot.value !== null) {
    result = result.filter((i) => i.brief.pos === selectSlot.value);
  }
  if (selectStar.value !== null) {
    result = result.filter((i) => i.brief.star === selectStar.value);
  }
  if (selectSet.value !== null) {
    result = result.filter((i) => i.sets === selectSet.value);
  }
  if (selectMainProp.value !== null) {
    result = result.filter((i) => i.mp.type === selectMainProp.value);
  }
  if (selectLocked.value !== null) {
    result = result.filter((i) => i.is_locked === selectLocked.value);
  }
  if (selectMarked.value !== null) {
    result = result.filter((i) => i.is_marked === selectMarked.value);
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
  selectSlot.value = null;
  selectStar.value = null;
  selectSet.value = null;
  selectMainProp.value = null;
  selectLocked.value = null;
  selectMarked.value = null;
  const dList = await TSUserBagRelic.getRelic(uid);
  relicList.value = sortRelics(dList);
  relicShow.value = relicList.value;
  curIdx.value = 0;
  await showLoading.end();
}

function toggleLocked(): void {
  selectLocked.value =
    selectLocked.value === null ? true : selectLocked.value === true ? null : true;
}

function toggleMarked(): void {
  selectMarked.value =
    selectMarked.value === null ? true : selectMarked.value === true ? null : true;
}

function searchRelic(): void {
  let selectData = filterRelics(relicList.value);
  if (search.value === undefined || search.value === "" || search.value === null) {
    if (relicShow.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    relicShow.value = selectData;
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
  showSnackbar.success(`找到${selectData.length}条符合条件的圣遗物`);
}

async function tryImportRelic(): Promise<void> {
  await tryCallYae(gameDir.value, curUid.value.toString());
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

.pbr-nav-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;

  .v-btn.active {
    background: var(--tgc-btn-1);
    color: var(--btn-text);
  }
}

.pbr-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
