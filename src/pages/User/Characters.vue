<!-- 用户角色列表 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uc-top-title">
        <img alt="icon" src="/source/UI/userAvatar.webp" />
        <span>我的角色</span>
        <v-btn class="uc-top-btn" variant="elevated" @click="showSelect = true">筛选角色</v-btn>
        <v-btn class="uc-top-btn" variant="elevated" @click="resetSelect = true">重置筛选</v-btn>
      </div>
    </template>
    <template #append>
      <div class="uc-top-btns">
        <v-btn
          v-model:loading="loadData"
          class="uc-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="refresh()"
        >
          刷新
        </v-btn>
        <v-btn
          v-model:loading="loadShare"
          :disabled="enableShare"
          class="uc-top-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="share()"
        >
          分享
        </v-btn>
        <v-btn
          v-model:loading="loadDel"
          :disabled="uidCur === undefined"
          class="uc-top-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteUid()"
        >
          删除
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uc-extension">
        <div class="uc-select">
          <v-select
            v-model="showMode"
            :hide-details="true"
            :items="modeList"
            class="uc-select-btn"
            density="compact"
            item-title="label"
            item-value="value"
            label="详情浮窗视图模式"
            variant="outlined"
          />
          <v-select
            v-model="uidCur"
            :hide-details="true"
            :items="uidList"
            class="uc-select-btn"
            density="compact"
            label="当前UID"
            variant="outlined"
          />
        </div>
        <div class="uc-sort">
          <v-btn
            class="uc-top-btn"
            variant="elevated"
            @click="() => (isLevelUp = toggleSort(isLevelUp))"
          >
            <span>等级</span>
            <v-icon :title="getSortDesc(isLevelUp)">{{ getSortIcon(isLevelUp) }}</v-icon>
          </v-btn>
          <v-btn
            class="uc-top-btn"
            variant="elevated"
            @click="() => (isFetterUp = toggleSort(isFetterUp))"
          >
            <span>好感</span>
            <v-icon :title="getSortDesc(isFetterUp)">{{ getSortIcon(isFetterUp) }}</v-icon>
          </v-btn>
          <v-btn
            class="uc-top-btn"
            variant="elevated"
            @click="() => (isConstUp = toggleSort(isConstUp))"
          >
            <span>命座</span>
            <v-icon :title="getSortDesc(isConstUp)">{{ getSortIcon(isConstUp) }}</v-icon>
          </v-btn>
        </div>
      </div>
    </template>
  </v-app-bar>
  <div class="uc-box">
    <div class="uc-box-top">
      <div class="uc-box-title">
        <span class="uc-box-uid">UID：{{ uidCur }}</span>
        <span
          v-for="(item, index) in roleOverview"
          :key="index"
          :title="`${item.label}：${item.cnt}`"
          class="uc-ov-item"
        >
          <img :src="`/icon/element/${item.label}.webp`" alt="element" />
          <span>{{ item.cnt }}{{ isSelected ? `(${getElementCnt(item.element)})` : "" }}</span>
        </span>
      </div>
      <div class="uc-box-info">
        <span>角色详情</span>
        <span>|</span>
        <span>TeyvatGuide v{{ version }}</span>
        <span>|</span>
        <span>更新于 {{ getUpdateTime() }}</span>
      </div>
    </div>
    <div v-if="!isEmpty" class="uc-grid">
      <TuaAvatarBox
        v-for="(role, index) in selectedList"
        :key="index"
        :model-value="role"
        @click="selectRole(role)"
      />
    </div>
    <div v-else class="uc-empty">
      <img alt="empty" src="/source/UI/empty.webp" />
    </div>
  </div>
  <TuaDetailOverlay
    v-if="dataVal"
    v-model="showOverlay"
    v-model:mode="showMode"
    :avatar="dataVal"
    :avatars="selectedList"
    @to-next="handleSwitch"
    @to-avatar="selectRole"
  />
  <TwoSelectC v-model="showSelect" v-model:reset="resetSelect" @select-c="handleSelect" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwoSelectC, { type SelectedCValue } from "@comp/pageWiki/two-select-c.vue";
import TuaAvatarBox from "@comp/userAvatar/tua-avatar-box.vue";
import TuaDetailOverlay from "@comp/userAvatar/tua-detail-overlay.vue";
import recordReq from "@req/recordReq.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { getZhElement, timestampToDate } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, triggerRef, watch } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TabItem = { label: string; value: string };
type OverviewItem = { element: string; cnt: number; label: string };

const modeList: Readonly<Array<TabItem>> = [
  { label: "经典视图", value: "classic" },
  { label: "卡片视图（简略）", value: "card" },
  { label: "卡片视图（详细）", value: "dev" },
];

const { isLogin } = storeToRefs(useAppStore());
const { cookie, account, propMap } = storeToRefs(useUserStore());

const loadData = ref<boolean>(false);
const loadShare = ref<boolean>(false);
const loadDel = ref<boolean>(false);
const version = ref<string>();
const isEmpty = ref<boolean>(true);
const showOverlay = ref<boolean>(false);
const selectIndex = ref<number>(0);
const showSelect = ref<boolean>(false);
const showMode = ref<"classic" | "card" | "dev">("dev");
const resetSelect = ref<boolean>(false);
const uidCur = ref<string>();

// 排序
const isLevelUp = ref<boolean | null>(null);
const isFetterUp = ref<boolean | null>(null);
const isConstUp = ref<boolean | null>(null);

const uidList = shallowRef<Array<string>>([]);
const roleOverview = shallowRef<Array<OverviewItem>>([]);
const roleList = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const selectedList = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const dataVal = shallowRef<TGApp.Sqlite.Character.TableTrans>();
const enableShare = computed<boolean>(
  () => showOverlay.value || showSelect.value || loadData.value,
);
const isSelected = computed<boolean>(() => selectedList.value.length !== roleList.value.length);

onMounted(async () => {
  await showLoading.start("正在获取角色数据");
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  version.value = await getVersion();
  await showLoading.update("正在加载UID列表");
  await loadUid();
  loadData.value = false;
  await showLoading.end();
});

watch(
  () => resetSelect.value,
  () => {
    if (resetSelect.value) {
      selectedList.value = getOrderedList(roleList.value);
      showSnackbar.success("已重置筛选条件");
      if (!dataVal.value) return;
      selectIndex.value = selectedList.value.indexOf(dataVal.value);
      if (selectIndex.value === -1) {
        dataVal.value = selectedList.value[0];
        selectIndex.value = 0;
      }
      isLevelUp.value = null;
      isFetterUp.value = null;
      isConstUp.value = null;
    }
  },
);

watch(
  () => showMode.value,
  () => {
    switch (showMode.value) {
      case "classic":
        showSnackbar.success("已切换至经典视图");
        break;
      case "card":
        showSnackbar.success("已切换至卡片视图（简略）");
        break;
      case "dev":
        showSnackbar.success("已切换至卡片视图（详细）");
        break;
    }
  },
);
watch(() => uidCur.value, loadRole);
watch(
  () => [isLevelUp.value, isFetterUp.value, isConstUp.value],
  async () => {
    let tmp = selectedList.value;
    if (isLevelUp.value === true) {
      tmp = tmp.sort((a, b) => b.avatar.level - a.avatar.level);
    } else if (isLevelUp.value === false) {
      tmp = tmp.sort((a, b) => a.avatar.level - b.avatar.level);
    }
    if (isFetterUp.value === true) {
      tmp = tmp.sort((a, b) => b.avatar.fetter - a.avatar.fetter);
    } else if (isFetterUp.value === false) {
      tmp = tmp.sort((a, b) => a.avatar.fetter - b.avatar.fetter);
    }
    if (isConstUp.value === true) {
      tmp = tmp.sort(
        (a, b) => b.avatar.actived_constellation_num - a.avatar.actived_constellation_num,
      );
    } else if (isConstUp.value === false) {
      tmp = tmp.sort(
        (a, b) => a.avatar.actived_constellation_num - b.avatar.actived_constellation_num,
      );
    }
    selectedList.value = tmp;
    triggerRef(selectedList);
    await nextTick();
  },
);

function toggleSort(value: boolean | null): boolean {
  switch (value) {
    case true:
      return false;
    case false:
      return true;
    case null:
      return true;
  }
}

function getSortIcon(value: boolean | null): string {
  switch (value) {
    case true:
      return "mdi-arrow-up";
    case false:
      return "mdi-arrow-down";
    default:
      return "mdi-sort";
  }
}

function getSortDesc(value: boolean | null): string {
  switch (value) {
    case true:
      return "升序";
    case false:
      return "降序";
    default:
      return "默认";
  }
}

function getOrderedList(
  data: Array<TGApp.Sqlite.Character.TableTrans>,
): Array<TGApp.Sqlite.Character.TableTrans> {
  return data.sort((a, b) => {
    if (a.avatar.rarity !== b.avatar.rarity) return b.avatar.rarity - a.avatar.rarity;
    if (a.avatar.element === b.avatar.element) return a.cid - b.cid;
    return a.avatar.element.localeCompare(b.avatar.element);
  });
}

function getOverview(data: Array<TGApp.Sqlite.Character.TableTrans>): Array<OverviewItem> {
  const overview: Array<OverviewItem> = [];
  for (const role of data) {
    const element = role.avatar.element;
    const index = overview.findIndex((item) => item.element === element);
    if (index === -1) {
      overview.push({ element, cnt: 1, label: `${getZhElement(element)}元素` });
    } else {
      overview[index].cnt += 1;
    }
  }
  return overview.sort((a, b) => b.cnt - a.cnt);
}

function getElementCnt(element: string): number {
  return selectedList.value.filter((i) => i.avatar.element === element).length;
}

async function loadUid(): Promise<void> {
  uidList.value = await TSUserAvatar.getAllUid();
  if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [account.value.gameUid];
    uidCur.value = account.value.gameUid;
  } else uidCur.value = undefined;
}

async function loadRole(): Promise<void> {
  if (!uidCur.value) {
    isEmpty.value = true;
    return;
  }
  roleList.value = [];
  const roleData = await TSUserAvatar.getAvatars(Number(uidCur.value));
  roleList.value = getOrderedList(roleData);
  roleOverview.value = getOverview(roleData);
  selectedList.value = roleList.value;
  dataVal.value = roleData[selectIndex.value];
  isEmpty.value = roleList.value.length === 0;
  await TGLogger.Info(`[Character][loadRole][${uidCur.value}] 成功加载角色数据`);
  await TGLogger.Info(`[Character][loadRole][${uidCur.value}] 共获取到${roleData.length}个角色`);
  showSnackbar.success(`成功加载${roleData.length}个角色`);
}

async function refresh(): Promise<void> {
  if (!account.value) {
    showSnackbar.warn("未获取到游戏账户");
    return;
  }
  if (showSelect.value) {
    showSelect.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  if (showOverlay.value) {
    showOverlay.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  if (uidCur.value && uidCur.value !== account.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至${uidCur.value}`,
    );
    if (switchCheck) {
      await useUserStore().switchGameAccount(uidCur.value);
      await refresh();
      return;
    }
    const freshCheck = await showDialog.check(
      "是否刷新角色数据",
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消角色数据刷新");
      return;
    }
  }
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    loadData.value = false;
    return;
  }
  await TGLogger.Info(`[Character][refreshRoles][${account.value.gameUid}] 正在更新角色数据`);
  await showLoading.start(`正在更新${account.value.gameUid}的角色数据`);
  loadData.value = true;
  await showLoading.update("正在刷新首页数据");
  const indexRes = await recordReq.index(cookie.value, account.value, 1);
  if ("retcode" in indexRes) {
    showSnackbar.error(`[${indexRes.retcode}] ${indexRes.message}`);
    await TGLogger.Error(JSON.stringify(indexRes.message));
    await showLoading.end();
    loadData.value = false;
    return;
  }
  await showLoading.update("正在获取角色列表");
  const listRes = await recordReq.character.list(cookie.value, account.value);
  if (!Array.isArray(listRes)) {
    showSnackbar.error(`[${listRes.retcode}] ${listRes.message}`);
    await TGLogger.Error(`[Character][refreshRoles][${account.value.gameUid}] 获取角色列表失败`);
    await TGLogger.Error(
      `[Character][refreshRoles][${account.value.gameUid}] ${listRes.retcode} ${listRes.message}`,
    );
    await showLoading.end();
    loadData.value = false;
    return;
  }
  const idList = listRes.map((i) => i.id.toString());
  await showLoading.update(`共${idList.length}个角色，正在获取角色详情`);
  const res = await recordReq.character.detail(cookie.value, account.value, idList);
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    await TGLogger.Error(`[Character][refreshRoles][${account.value.gameUid}] 获取角色数据失败`);
    await TGLogger.Error(
      `[Character][refreshRoles][${account.value.gameUid}] ${res.retcode} ${res.message}`,
    );
    await showLoading.end();
    loadData.value = false;
    return;
  }
  propMap.value = res.property_map;
  await showLoading.update("正在保存角色数据");
  await TSUserAvatar.saveAvatars(account.value.gameUid, res.list);
  await TGLogger.Info(`[Character][refreshRoles][${account.value.gameUid}] 成功更新角色数据`);
  await TGLogger.Info(
    `[Character][refreshRoles][${account.value.gameUid}] 共更新${res.list.length}个角色`,
  );
  await showLoading.update("正在加载角色数据");
  await loadUid();
  await loadRole();
  await showLoading.end();
  loadData.value = false;
}

async function share(): Promise<void> {
  if (!account.value || isEmpty.value) {
    showSnackbar.warn("暂无数据");
    return;
  }
  await TGLogger.Info(`[Character][shareRoles][${account.value.gameUid}] 正在生成分享图片`);
  const rolesBox = document.querySelector<HTMLElement>(".uc-box");
  if (rolesBox === null) {
    showSnackbar.error("未找到角色列表");
    return;
  }
  const fileName = `【角色列表】-${account.value.gameUid}.png`;
  await showLoading.start("正在生成图片", fileName);
  loadShare.value = true;
  await generateShareImg(fileName, rolesBox);
  loadShare.value = false;
  await showLoading.end();
  await TGLogger.Info(`[Character][shareRoles][${account.value.gameUid}] 生成分享图片成功`);
}

async function deleteUid(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.warn("未找到当前UID");
    return;
  }
  const delCheck = await showDialog.check("确定删除？", `将删除${uidCur.value}对应的角色数据`);
  if (!delCheck) {
    showSnackbar.cancel("已取消删除");
    return;
  }
  await TSUserAvatar.deleteUid(uidCur.value);
  showSnackbar.success(`成功删除${uidCur.value}的角色数据`);
  await loadUid();
  await loadRole();
}

function getUpdateTime(): string {
  if (roleList.value.length === 0) return "";
  let lastUpdateTime = 0;
  for (const role of roleList.value) {
    const updateTime = new Date(role.updated).getTime();
    if (updateTime > lastUpdateTime) lastUpdateTime = updateTime;
  }
  return timestampToDate(lastUpdateTime);
}

function selectRole(role: TGApp.Sqlite.Character.TableTrans): void {
  dataVal.value = role;
  selectIndex.value = selectedList.value.indexOf(role);
  if (!showOverlay.value) showOverlay.value = true;
}

function handleSelect(val: SelectedCValue) {
  showSelect.value = false;
  const filterC = AppCharacterData.filter((avatar) => {
    if (!val.star.includes(avatar.star)) return false;
    if (!val.weapon.includes(avatar.weapon)) return false;
    if (!val.elements.includes(avatar.element)) return false;
    if (!val.area.includes(avatar.area)) return false;
    return roleList.value.find(
      (role) =>
        role.avatar.id === avatar.id && getZhElement(role.avatar.element) === avatar.element,
    );
  });
  if (filterC.length === 0) {
    showSnackbar.warn("未找到符合条件的角色");
    return;
  }
  showSnackbar.success(`筛选出符合条件的角色 ${filterC.length} 个`);
  const selectedId = filterC.map((item) => item.id);
  selectedList.value = roleList.value.filter((role) => selectedId.includes(role.cid));
  if (!dataVal.value) return;
  if (!selectedList.value.includes(dataVal.value)) {
    dataVal.value = selectedList.value[0];
    selectIndex.value = 0;
  } else selectIndex.value = selectedList.value.indexOf(dataVal.value);
}

function handleSwitch(next: boolean): void {
  if (next) {
    selectIndex.value += 1;
    if (selectIndex.value >= selectedList.value.length) selectIndex.value = 0;
  } else {
    selectIndex.value -= 1;
    if (selectIndex.value < 0) selectIndex.value = selectedList.value.length - 1;
  }
  dataVal.value = selectedList.value[selectIndex.value];
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.uc-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
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

.uc-extension {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-right: 16px;
  margin-bottom: 4px;
  margin-left: 16px;
}

.uc-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.uc-select-btn {
  position: relative;
  display: flex;
  width: 200px;
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
}

.uc-sort {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.uc-box {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  gap: 8px;
}

.uc-box-top {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--common-shadow-2);
}

.uc-box-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.uc-box-uid {
  @include github-styles.github-tag-dark-gen(#ffcd0c);

  padding: 2px 4px;
  border-radius: 4px;
}

.uc-ov-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 18px;
  gap: 4px;

  img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.uc-box-info {
  position: relative;
  z-index: -1;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-size: 14px;
  opacity: 0.8;
}

.uc-top-btns {
  display: flex;
  align-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.uc-top-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.uc-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 0.2fr));
}

.uc-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}
</style>
