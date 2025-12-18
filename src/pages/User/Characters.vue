<!-- 用户角色列表 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uc-top-title">
        <img alt="icon" src="/source/UI/userAvatar.webp" />
        <span>我的角色</span>
        <v-btn class="uc-top-btn" @click="showSelect = true">筛选角色</v-btn>
        <v-btn class="uc-top-btn" @click="resetSelect = true">重置筛选</v-btn>
      </div>
    </template>
    <template #append>
      <div class="uc-top-btns">
        <v-btn
          class="uc-top-btn"
          prepend-icon="mdi-refresh"
          @click="refresh()"
          v-model:loading="loadData"
        >
          刷新
        </v-btn>
        <v-btn
          class="uc-top-btn"
          prepend-icon="mdi-share"
          :disabled="enableShare"
          @click="share()"
          v-model:loading="loadShare"
        >
          分享
        </v-btn>
        <v-btn
          class="uc-top-btn"
          prepend-icon="mdi-delete"
          @click="deleteUid()"
          :disabled="uidCur === undefined"
          v-model:loading="loadDel"
        >
          删除
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uc-select">
        <v-select
          v-model="showMode"
          :items="modeList"
          label="详情视图模式"
          :hide-details="true"
          item-title="label"
          item-value="value"
          variant="outlined"
          class="uc-select-btn"
          density="compact"
        />
        <v-select
          v-model="uidCur"
          :items="uidList"
          label="当前UID"
          :hide-details="true"
          variant="outlined"
          class="uc-select-btn"
          density="compact"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="uc-box">
    <div class="uc-box-top">
      <div class="uc-box-title">
        <span class="uc-box-uid">UID：{{ uidCur }}</span>
        <span
          class="uc-ov-item"
          v-for="(item, index) in roleOverview"
          :key="index"
          :title="`${item.label}：${item.cnt}`"
        >
          <img :src="`/icon/element/${item.label}.webp`" alt="element" />
          <span>{{ item.cnt }}</span>
        </span>
      </div>
      <div class="uc-box-info">
        <span>角色详情</span>
        <span>|Render by TeyvatGuide v{{ version }}|</span>
        <span>更新于 {{ getUpdateTime() }}</span>
      </div>
    </div>
    <div class="uc-grid" v-if="!isEmpty">
      <TuaAvatarBox
        v-for="(role, index) in selectedList"
        :key="index"
        :model-value="role"
        @click="selectRole(role)"
      />
    </div>
    <div class="uc-empty" v-else>
      <img src="/source/UI/empty.webp" alt="empty" />
    </div>
  </div>
  <TuaDetailOverlay
    v-if="dataVal"
    v-model="showOverlay"
    :avatar="dataVal"
    :avatars="selectedList"
    v-model:mode="showMode"
    @to-next="handleSwitch"
    @to-avatar="selectRole"
  />
  <TwoSelectC v-model="showSelect" @select-c="handleSelect" v-model:reset="resetSelect" />
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
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { getZhElement, timestampToDate } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TabItem = { label: string; value: string };
type OverviewItem = { element: string; cnt: number; label: string };

const modeList: Readonly<Array<TabItem>> = [
  { label: "经典视图", value: "classic" },
  { label: "卡片视图（简略）", value: "card" },
  { label: "卡片视图（详细）", value: "dev" },
];
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
const uidList = shallowRef<Array<string>>([]);
const roleOverview = shallowRef<Array<OverviewItem>>([]);
const roleList = shallowRef<Array<TGApp.Sqlite.Character.UserRole>>([]);
const selectedList = shallowRef<Array<TGApp.Sqlite.Character.UserRole>>([]);
const dataVal = shallowRef<TGApp.Sqlite.Character.UserRole>();
const enableShare = computed<boolean>(
  () => showOverlay.value || showSelect.value || loadData.value,
);

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

function getOrderedList(
  data: Array<TGApp.Sqlite.Character.UserRole>,
): Array<TGApp.Sqlite.Character.UserRole> {
  return data.sort((a, b) => {
    if (a.avatar.rarity !== b.avatar.rarity) return b.avatar.rarity - a.avatar.rarity;
    if (a.avatar.element === b.avatar.element) return a.cid - b.cid;
    return a.avatar.element.localeCompare(b.avatar.element);
  });
}

function getOverview(data: Array<TGApp.Sqlite.Character.UserRole>): Array<OverviewItem> {
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

async function loadUid(): Promise<void> {
  uidList.value = await TSUserAvatar.getAllUid();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else uidCur.value = uidList.value[0];
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

function selectRole(role: TGApp.Sqlite.Character.UserRole): void {
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
  padding: 8px;
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

.uc-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: 16px;
  gap: 8px;
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
  border-radius: 4px;
  font-family: var(--font-title);
  font-size: 18px;
  gap: 4px;

  img {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
}

.uc-box-info {
  z-index: -1;
  font-size: 14px;
  opacity: 0.8;
}

.uc-top-btns {
  display: flex;
  align-content: center;
  margin-right: 16px;
  column-gap: 8px;
}

.uc-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.dark .uc-top-btn {
  border: 1px solid var(--common-shadow-2);
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
