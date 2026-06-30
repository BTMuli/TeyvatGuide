<!-- 背包武器页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pbw-nav-prepend">
        <img alt="icon" src="/UI/nav/userBag.webp" />
        <span>背包武器</span>
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
      <div class="pbw-nav-append">
        <div class="pbw-nav-search">
          <v-text-field
            v-model="search"
            :clearable="true"
            :hide-details="true"
            append-inner-icon="mdi-magnify"
            density="compact"
            label="搜索"
            variant="outlined"
            @keydown.enter="searchWeapon()"
            @click:append-inner="searchWeapon()"
          />
        </div>
        <v-btn
          class="pbw-ne-btn"
          prepend-icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="tryImportWeapon()"
        >
          导入
        </v-btn>
        <v-btn class="pbw-ne-btn" prepend-icon="mdi-plus" variant="elevated" @click="createUid()">
          新建存档
        </v-btn>
        <v-btn class="pbw-ne-btn" prepend-icon="mdi-delete" variant="elevated" @click="deleteUid()">
          删除存档
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="pbw-nav-extension">
        <v-select
          v-model="selectType"
          :clearable="true"
          :hide-details="true"
          :items="weaponTypes"
          density="compact"
          item-title="type"
          label="武器类型"
          variant="outlined"
          width="200px"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #append>
                <v-chip>{{ item.number }}</v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
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
      </div>
    </template>
  </v-app-bar>
  <div class="pbw-container">
    <template v-for="weapon in weaponShow" :key="weapon.tb.guid">
      <PbWeaponItem
        :cur="curWeapon"
        :info="weapon.info"
        :tb="weapon.tb"
        :selected="weapon.tb.guid === curWeapon?.tb.guid"
        :detail="showDetail"
        @select="handleSelect"
      />
    </template>
  </div>
  <PbWeaponDetail v-if="curWeapon" v-model:show="showDetail" :cur="curWeapon" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, triggerRef, watch } from "vue";

import { WikiWeaponData } from "@/data/index.js";
import PbWeaponItem from "@comp/pageBag/pb-weapon-item.vue";
import PbWeaponDetail from "@comp/pageBag/pb-weapon-detail.vue";

/** 武器类型 */
type WeaponType = {
  type: string;
  number: number;
};

/** 武器星级选项 */
type StarOption = {
  text: string;
  value: number;
};

/** 武器信息 */
export type WeaponInfo = {
  guid: string;
  tb: TGApp.Sqlite.UserBag.WeaponTable;
  info: TGApp.App.Weapon.WikiItem;
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

const curUid = ref<number>(0);
const selectType = ref<string | null>(null);
const selectStar = ref<number | null>(null);
const search = ref<string>();
const curIdx = ref<number>(0);
const showDetail = ref<boolean>(false);
const uidList = shallowRef<Array<number>>([]);
const weaponTypes = shallowRef<Array<WeaponType>>([]);
const curWeapon = shallowRef<WeaponInfo>();
const weaponList = shallowRef<Array<WeaponInfo>>([]);
const weaponShow = shallowRef<Array<WeaponInfo>>([]);

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
});

watch(
  () => curUid.value,
  async () => {
    await loadWeaponList(curUid.value);
  },
);
watch(
  () => [selectType.value, selectStar.value],
  async () => {
    const renderWeapons = getSelectWeapons();
    weaponShow.value = sortWeapons(renderWeapons);
    triggerRef(weaponShow);
    curIdx.value = 0;
  },
);

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserBagWeapon.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid))) {
    curUid.value = Number(account.value.gameUid);
  } else if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    curUid.value = Number(account.value.gameUid);
  } else curUid.value = 0;
}

function getSelectWeapons(): Array<WeaponInfo> {
  let result = weaponList.value;
  if (selectType.value) {
    result = result.filter((i) => i.info.weapon === selectType.value);
  }
  if (selectStar.value !== null) {
    result = result.filter((i) => i.info.star === selectStar.value);
  }
  return result;
}

function sortWeapons(data: Array<WeaponInfo>): Array<WeaponInfo> {
  return data.sort(
    (a, b) =>
      b.info.star - a.info.star ||
      a.info.weapon.localeCompare(b.info.weapon) ||
      a.info.id - b.info.id,
  );
}

async function loadWeaponList(uid: number): Promise<void> {
  await showLoading.start(`正在加载 ${uid} 的武器数据`);
  weaponTypes.value = [];
  weaponShow.value = [];
  weaponList.value = [];
  selectType.value = null;
  selectStar.value = null;
  const dList = await TSUserBagWeapon.getWeapon(uid);
  const wList = [];
  const tList: Array<WeaponType> = [];
  for (const weapon of dList) {
    const info = getItemInfo(weapon.id);
    if (info === false) continue;
    wList.push({ guid: weapon.guid, tb: weapon, info: info });
    const findT = tList.findIndex((i) => i.type === info.weapon);
    if (findT !== -1) {
      tList[findT].number++;
    } else {
      tList.push({ type: info.weapon, number: 1 });
    }
  }
  weaponList.value = sortWeapons(wList);
  weaponShow.value = weaponList.value;
  weaponTypes.value = tList;
  curIdx.value = 0;
  await showLoading.end();
}

function getItemInfo(id: number): TGApp.App.Weapon.WikiItem | false {
  const find = WikiWeaponData.find((i) => i.id === id);
  if (find) return find;
  return false;
}

function searchWeapon(): void {
  let selectData = getSelectWeapons();
  if (search.value === undefined || search.value === "" || search.value === null) {
    if (weaponShow.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    weaponShow.value = selectData;
    showSnackbar.success("已重置!");
    return;
  }
  selectData = selectData.filter(
    (i) => i.info.name.includes(search.value!) || i.info.description.includes(search.value!),
  );
  if (selectData.length === 0) {
    showSnackbar.warn("未找到符合条件的武器!");
    return;
  }
  weaponShow.value = selectData;
  showSnackbar.success(`找到${selectData.length}条符合条件的武器`);
}

async function tryImportWeapon(): Promise<void> {
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
  await TSUserBagWeapon.delUid(curUid.value);
  await reloadUid();
  showSnackbar.success(`已删除对应存档，即将刷新`);
}

function handleSelect(weapon: WeaponInfo): void {
  curWeapon.value = weapon;
  showDetail.value = true;
}
</script>
<style lang="scss" scoped>
.pbw-nav-prepend {
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

.pbw-nav-search {
  position: relative;
  width: 240px;
  margin-right: 8px;
}

.pbw-nav-append {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.pbw-ne-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.pbw-nav-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.pbw-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
</style>
