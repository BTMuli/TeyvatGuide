<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <v-app-bar>
    <template #prepend>
      <div class="uc-top-title">
        <img alt="icon" src="/source/UI/userAvatar.webp" />
        <span>我的角色</span>
        <v-btn variant="outlined" @click="showSelect = true">筛选角色</v-btn>
        <v-btn variant="outlined" @click="resetSelect = true">重置筛选</v-btn>
      </div>
    </template>
    <template #append>
      <div class="uc-top-btns">
        <v-btn
          prepend-icon="mdi-refresh"
          @click="refresh()"
          :rounded="true"
          variant="outlined"
          v-model:loading="loadData"
        >
          刷新
        </v-btn>
        <v-btn
          prepend-icon="mdi-share"
          :disabled="enableShare"
          @click="share()"
          :rounded="true"
          variant="outlined"
          v-model:loading="loadShare"
        >
          分享
        </v-btn>
        <v-btn
          prepend-icon="mdi-delete"
          @click="deleteUid()"
          :rounded="true"
          variant="outlined"
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
    <div class="uc-top">
      <div class="uc-top-title">
        <span v-if="uidCur">UID：{{ uidCur }} 更新于 {{ getUpdateTime() }}</span>
        <span v-else> 暂无数据 </span>
      </div>
      <div class="uc-top-info">Render by TeyvatGuide v{{ version }}</div>
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
  <suspense v-if="dataVal">
    <TuaDetailOverlay
      v-model="showOverlay"
      :avatar="dataVal"
      :avatars="selectedList"
      v-model:mode="showMode"
      @to-next="handleSwitch"
      @to-avatar="selectRole"
    />
  </suspense>
  <TwoSelectC v-model="showSelect" @select-c="handleSelect" v-model:reset="resetSelect" />
</template>
<script lang="ts" setup>
import { getVersion } from "@tauri-apps/api/app";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch, computed } from "vue";

import showConfirm from "../../components/func/confirm.js";
import showSnackbar from "../../components/func/snackbar.js";
import ToLoading from "../../components/overlay/to-loading.vue";
import TuaAvatarBox from "../../components/userAvatar/tua-avatar-box.vue";
import TuaDetailOverlay from "../../components/userAvatar/tua-detail-overlay.vue";
import TwoSelectC, { SelectedCValue } from "../../components/wiki/two-select-c.vue";
import { AppCharacterData } from "../../data/index.js";
import TSUserAvatar from "../../plugins/Sqlite/modules/userAvatar.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { generateShareImg } from "../../utils/TGShare.js";
import { timestampToDate } from "../../utils/toolFunc.js";
import TGRequest from "../../web/request/TGRequest.js";

// store
const userStore = storeToRefs(useUserStore());
const user = computed<TGApp.Sqlite.Account.Game>(() => userStore.account.value);

// loading
const loading = ref<boolean>(false);
const loadData = ref<boolean>(false);
const loadShare = ref<boolean>(false);
const loadDel = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();
const version = ref<string>();

// data
const isEmpty = ref<boolean>(true);
const roleList = ref<TGApp.Sqlite.Character.UserRole[]>([]);
const selectedList = ref<TGApp.Sqlite.Character.UserRole[]>([]);

// overlay
const dataVal = ref<TGApp.Sqlite.Character.UserRole>();
const showOverlay = ref<boolean>(false);
const selectIndex = ref<number>(0);

const showSelect = ref<boolean>(false);
const showMode = ref<"classic" | "card" | "dev">("dev");
const resetSelect = ref<boolean>(false);
const modeList = [
  { label: "经典视图", value: "classic" },
  { label: "卡片视图（简略）", value: "card" },
  { label: "卡片视图（详细）", value: "dev" },
];

const enableShare = computed<boolean>(() => {
  if (showOverlay.value) return true;
  return showSelect.value;
});

const uidCur = ref<string>();
const uidList = ref<string[]>([]);

onMounted(async () => {
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  version.value = await getVersion();
  await loadUid();
  loading.value = false;
  loadData.value = false;
});

watch(
  () => resetSelect.value,
  (val) => {
    if (val) {
      selectedList.value = getOrderedList(roleList.value);
      showSnackbar({ text: "已重置筛选条件", color: "success" });
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
  (val) => {
    switch (val) {
      case "classic":
        showSnackbar({ text: "已切换至经典视图", color: "success" });
        break;
      case "card":
        showSnackbar({ text: "已切换至卡片视图（简略）", color: "success" });
        break;
      case "dev":
        showSnackbar({ text: "已切换至卡片视图（详细）", color: "success" });
        break;
    }
  },
);
watch(
  () => uidCur.value,
  async () => await loadRole(),
);

function getOrderedList(
  data: TGApp.Sqlite.Character.UserRole[],
): TGApp.Sqlite.Character.UserRole[] {
  return data.sort((a, b) => {
    if (a.avatar.rarity !== b.avatar.rarity) return b.avatar.rarity - a.avatar.rarity;
    if (a.avatar.element !== b.avatar.element) {
      return a.avatar.element.localeCompare(b.avatar.element);
    }
    return a.cid - b.cid;
  });
}

async function loadUid(): Promise<void> {
  uidList.value = await TSUserAvatar.getAllUid();
  if (uidList.value.length === 0) uidList.value = [user.value.gameUid];
  if (uidList.value.includes(user.value.gameUid)) {
    uidCur.value = user.value.gameUid;
  } else {
    uidCur.value = uidList.value[0];
  }
  console.log(uidCur.value, user.value.gameUid);
}

async function loadRole(): Promise<void> {
  if (!uidCur.value) {
    isEmpty.value = true;
    return;
  }
  roleList.value = [];
  const roleData = await TSUserAvatar.getAvatars(uidCur.value);
  roleList.value = getOrderedList(roleData);
  selectedList.value = roleList.value;
  dataVal.value = roleData[selectIndex.value];
  isEmpty.value = roleList.value.length === 0;
  await TGLogger.Info(`[Character][loadRole][${uidCur.value}] 成功加载角色数据`);
  await TGLogger.Info(`[Character][loadRole][${uidCur.value}] 共获取到${roleData.length}个角色`);
  showSnackbar({ text: `成功加载${roleData.length}个角色`, color: "success" });
}

async function refresh(): Promise<void> {
  if (!user.value) return;
  if (showSelect.value) {
    showSelect.value = false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (showOverlay.value) {
    showOverlay.value = false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (uidCur.value && uidCur.value !== user.value.gameUid) {
    const switchConfirm = await showConfirm({
      title: "是否切换游戏账户",
      text: `确认则尝试切换至${uidCur.value}`,
    });
    if (switchConfirm) {
      await useUserStore().switchGameAccount(uidCur.value);
      await refresh();
      return;
    }
    const confirm = await showConfirm({
      title: "确定刷新？",
      text: `用户${user.value.gameUid}与当前UID${uidCur.value}不一致`,
    });
    if (!confirm) {
      showSnackbar({ text: "已取消角色数据刷新", color: "cancel" });
      return;
    }
  }
  await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 正在更新角色数据`);
  loadingTitle.value = "正在获取角色列表";
  loading.value = true;
  loadData.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({ text: "请先登录", color: "error" });
    loading.value = false;
    loadData.value = false;
    return;
  }
  const cookie = {
    account_id: userStore.cookie.value.account_id,
    cookie_token: userStore.cookie.value.cookie_token,
  };
  const listRes = await TGRequest.User.byCookie.getAvatarList(cookie, user.value.gameUid);
  if (!Array.isArray(listRes)) {
    showSnackbar({ text: `[${listRes.retcode}] ${listRes.message}`, color: "error" });
    await TGLogger.Error(`[Character][refreshRoles][${user.value.gameUid}] 获取角色列表失败`);
    await TGLogger.Error(
      `[Character][refreshRoles][${user.value.gameUid}] ${listRes.retcode} ${listRes.message}`,
    );
    loading.value = false;
    loadData.value = false;
    return;
  }
  const idList = listRes.map((i) => i.id.toString());
  loadingTitle.value = "正在获取角色数据";
  loadingSub.value = `共${idList.length}个角色`;
  const res = await TGRequest.User.byCookie.getAvatarDetail(cookie, user.value.gameUid, idList);
  if ("retcode" in res) {
    showSnackbar({ text: `[${res.retcode}] ${res.message}`, color: "error" });
    await TGLogger.Error(`[Character][refreshRoles][${user.value.gameUid}] 获取角色数据失败`);
    await TGLogger.Error(
      `[Character][refreshRoles][${user.value.gameUid}] ${res.retcode} ${res.message}`,
    );
    loading.value = false;
    loadData.value = false;
    return;
  }
  userStore.propMap.value = res.property_map;
  loadingTitle.value = "正在保存角色数据";
  await TSUserAvatar.saveAvatars(user.value.gameUid, res.list);
  await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 成功更新角色数据`);
  await TGLogger.Info(
    `[Character][refreshRoles][${user.value.gameUid}] 共更新${res.list.length}个角色`,
  );
  await loadRole();
  loading.value = false;
  loadData.value = false;
}

async function share(): Promise<void> {
  if (!user.value || isEmpty.value) {
    showSnackbar({ text: "暂无数据", color: "error" });
    return;
  }
  await TGLogger.Info(`[Character][shareRoles][${user.value.gameUid}] 正在生成分享图片`);
  const rolesBox = <HTMLElement>document.querySelector(".uc-box");
  const fileName = `【角色列表】-${user.value.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  loadShare.value = true;
  await generateShareImg(fileName, rolesBox);
  loadingSub.value = "";
  loading.value = false;
  loadShare.value = false;
  await TGLogger.Info(`[Character][shareRoles][${user.value.gameUid}] 生成分享图片成功`);
}

async function deleteUid(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar({ text: "未找到当前UID", color: "error" });
    return;
  }
  const confirm = await showConfirm({
    title: "确定删除？",
    text: `将删除${uidCur.value}对应的角色数据`,
  });
  if (!confirm) {
    showSnackbar({ text: "已取消删除", color: "cancel" });
    return;
  }
  await TSUserAvatar.deleteUid(uidCur.value);
  showSnackbar({ text: `成功删除${uidCur.value}的角色数据` });
  await loadUid();
}

function getUpdateTime(): string {
  if (roleList.value.length === 0) return "";
  let lastUpdateTime = 0;
  roleList.value.forEach((role) => {
    const updateTime = new Date(role.updated).getTime();
    if (updateTime > lastUpdateTime) {
      lastUpdateTime = updateTime;
    }
  });
  return timestampToDate(lastUpdateTime);
}

function selectRole(role: TGApp.Sqlite.Character.UserRole): void {
  dataVal.value = role;
  selectIndex.value = roleList.value.indexOf(role);
  if (!showOverlay.value) {
    showOverlay.value = true;
  }
}

function handleSelect(val: SelectedCValue) {
  showSelect.value = false;
  const filterC = AppCharacterData.filter((avatar) => {
    if (!roleList.value.find((role) => role.avatar.id === avatar.id)) return false;
    if (!val.star.includes(avatar.star)) return false;
    if (!val.weapon.includes(avatar.weapon)) return false;
    if (!val.elements.includes(avatar.element)) return false;
    return val.area.includes(avatar.area);
  });
  if (filterC.length === 0) {
    showSnackbar({ text: "未找到符合条件的角色", color: "warn" });
    return;
  }
  showSnackbar({ text: `筛选出符合条件的角色 ${filterC.length} 个`, color: "success" });
  const selectedId = filterC.map((item) => item.id);
  selectedList.value = roleList.value.filter((role) => selectedId.includes(role.cid));
  if (!dataVal.value) return;
  if (!selectedList.value.includes(dataVal.value)) {
    dataVal.value = selectedList.value[0];
    selectIndex.value = 0;
  } else {
    selectIndex.value = selectedList.value.indexOf(dataVal.value);
  }
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
<style lang="css" scoped>
.uc-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 10px;
  gap: 10px;
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
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-1);
  gap: 10px;
}

.uc-top {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-2);
}

.uc-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 10px;

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

.uc-top-info {
  z-index: -1;
  font-size: 14px;
  opacity: 0.8;
}

.uc-top-btns {
  display: flex;
  align-content: center;
  margin: 0 10px;
  column-gap: 10px;
}

.uc-grid {
  display: grid;
  grid-gap: 15px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 0.2fr));
}

.uc-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}
</style>
