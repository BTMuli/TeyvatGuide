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
      <!-- TODO: 优化筛选，增加套装、主词条、副词条、等级筛选 -->
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
        <!-- TODO: 添加套装筛选 -->
      </div>
    </template>
  </v-app-bar>
  <div class="pbr-container">
    <template v-for="relic in relicShow" :key="relic.tb.guid">
      <PbRelicItem
        :info="relic.info"
        :selected="relic.guid === curRelic?.guid"
        :detail="showDetail"
        :tb="relic.tb"
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
import { wrMap } from "@/data/index.js";
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

/** 圣遗物信息 */
export type RelicInfo = {
  guid: string;
  tb: TGApp.Sqlite.UserBag.RelicTable;
  info: TGApp.App.Relic.RelicMini;
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

const curUid = ref<number>(0);
const uidList = shallowRef<Array<number>>([]);

const search = ref<string>();
const selectSlot = ref<number | null>(null);
const selectStar = ref<number | null>(null);

const curIdx = ref<number>(0);
const showDetail = ref<boolean>(false);
const curRelic = shallowRef<RelicInfo>();
const relicList = shallowRef<Array<RelicInfo>>([]);
const relicShow = shallowRef<Array<RelicInfo>>([]);

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
  () => [selectSlot.value, selectStar.value],
  async () => {
    const renderRelics = getSelectRelics();
    relicShow.value = sortRelics(renderRelics);
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

function getSelectRelics(): Array<RelicInfo> {
  let result = relicList.value;
  if (selectSlot.value !== null) {
    result = result.filter((i) => i.info.pos === selectSlot.value);
  }
  if (selectStar.value !== null) {
    result = result.filter((i) => i.info.star === selectStar.value);
  }
  return result;
}

function sortRelics(data: Array<RelicInfo>): Array<RelicInfo> {
  return data.sort(
    (a, b) =>
      b.info.star - a.info.star || a.info.pos - b.info.pos || b.tb.info.level - a.tb.info.level,
  );
}

async function loadRelicList(uid: number): Promise<void> {
  await showLoading.start(`正在加载 ${uid} 的圣遗物数据`);
  relicShow.value = [];
  relicList.value = [];
  selectSlot.value = null;
  selectStar.value = null;
  const dList = await TSUserBagRelic.getRelic(uid);
  const rList = [];
  for (const relic of dList) {
    const info = getItemInfo(relic.id);
    if (info === false) continue;
    rList.push({ guid: relic.guid, tb: relic, info: info });
  }
  relicList.value = sortRelics(rList);
  relicShow.value = relicList.value;
  curIdx.value = 0;
  await showLoading.end();
}

function getItemInfo(id: number): TGApp.App.Relic.RelicMini | false {
  if (Object.hasOwn(wrMap, id)) return wrMap[id];
  return false;
}

function searchRelic(): void {
  let selectData = getSelectRelics();
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
    const idStr = i.tb.id.toString();
    const levelStr = i.tb.info.level.toString();
    return (
      idStr.includes(search.value!) ||
      levelStr.includes(search.value!) ||
      i.info.name.includes(search.value!)
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

function handleSelect(relic: RelicInfo): void {
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
}

.pbr-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
