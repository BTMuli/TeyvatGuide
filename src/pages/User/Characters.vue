<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <v-app-bar>
    <template #title>
      <span v-if="user"> {{ user.nickname }}({{ user.gameUid }})</span>
      <span v-else> 暂无数据 </span>
    </template>
    <template #append>
      <div class="uc-top-btns">
        <v-btn @click="refresh()" rounded variant="outlined" v-model:loading="loadData">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          刷新
        </v-btn>
        <v-btn
          :disabled="showOverlay"
          @click="share()"
          rounded
          variant="outlined"
          v-model:loading="loadShare"
        >
          <template #prepend>
            <v-icon>mdi-share</v-icon>
          </template>
          分享
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uc-select">
        <v-btn variant="outlined" @click="showSelect = true">筛选角色</v-btn>
        <v-btn variant="outlined" @click="resetSelect = true">重置筛选</v-btn>
        <v-select
          v-model="showMode"
          :items="modeList"
          label="详情视图模式"
          hide-details
          item-title="label"
          item-value="value"
          variant="outlined"
          class="uc-select-mode"
          density="compact"
        />
      </div>
    </template>
  </v-app-bar>
  <TwoSelectC v-model="showSelect" @select-c="handleSelect" v-model:reset="resetSelect" />
  <div class="uc-box">
    <div class="uc-top">
      <div class="uc-top-title">
        <span v-if="user">
          {{ user.nickname }} UID：{{ user.gameUid }} 更新于 {{ getUpdateTime() }}
          <!-- todo 展示筛选条件 -->
        </span>
        <span v-else> 暂无数据 </span>
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
    v-model="showOverlay"
    :avatar="dataVal"
    v-model:mode="showMode"
    @to-next="handleSwitch"
  />
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, ref, watch } from "vue";

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
import TGRequest from "../../web/request/TGRequest.js";

// store
const userStore = storeToRefs(useUserStore());
const user = ref<TGApp.Sqlite.Account.Game>();

// loading
const loading = ref<boolean>(false);
const loadData = ref<boolean>(false);
const loadShare = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const isEmpty = ref<boolean>(true);
const roleList = ref<TGApp.Sqlite.Character.UserRole[]>([]);
const selectedList = ref<TGApp.Sqlite.Character.UserRole[]>([]);

// overlay
const dataVal = ref<TGApp.Sqlite.Character.UserRole>(<TGApp.Sqlite.Character.UserRole>{});
const showOverlay = ref<boolean>(false);
const selectIndex = ref<number>(0);

const showSelect = ref<boolean>(false);
const showMode = ref<"classic" | "card" | "dev">("card");
const resetSelect = ref<boolean>(false);
const modeList = [
  { label: "经典视图", value: "classic" },
  { label: "卡片视图（简略）", value: "card" },
  { label: "卡片视图（详细）", value: "dev" },
];

onBeforeMount(() => {
  if (userStore.account.value) user.value = userStore.account.value;
});

onMounted(async () => {
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  loadData.value = true;
  await load();
  loading.value = false;
  loadData.value = false;
});

watch(resetSelect, (val) => {
  if (val) {
    selectedList.value = getOrderedList(roleList.value);
    showSnackbar({
      text: "已重置筛选条件",
      color: "success",
    });
  }
});
watch(showMode, (val) => {
  if (val === "classic") {
    showSnackbar({
      text: "已切换至经典视图",
      color: "success",
    });
  } else if (val === "card") {
    showSnackbar({
      text: "已切换至卡片视图（简略）",
      color: "success",
    });
  } else {
    showSnackbar({
      text: "已切换至卡片视图（详细）",
      color: "success",
    });
  }
});

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

async function load(): Promise<void> {
  if (!user.value) return;
  const roleData = await TSUserAvatar.getAvatars(user.value.gameUid);
  roleList.value = getOrderedList(roleData);
  selectedList.value = roleList.value;
  dataVal.value = roleData[selectIndex.value];
  isEmpty.value = false;
  await TGLogger.Info(`[Character][loadRole][${user.value.gameUid}] 成功加载角色数据`);
  await TGLogger.Info(
    `[Character][loadRole][${user.value.gameUid}] 共获取到${roleData.length}个角色`,
  );
  showSnackbar({
    text: `成功加载${roleData.length}个角色`,
    color: "success",
  });
}

async function refresh(): Promise<void> {
  if (!user.value) return;
  if (showOverlay.value) {
    showOverlay.value = false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 正在更新角色数据`);
  loadingTitle.value = "正在获取角色列表";
  loading.value = true;
  loadData.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "请先登录",
      color: "error",
    });
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
    showSnackbar({
      text: `[${listRes.retcode}] ${listRes.message}`,
      color: "error",
    });
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
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
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
  await load();
  loading.value = false;
  loadData.value = false;
}

async function share(): Promise<void> {
  if (!user.value || isEmpty.value) {
    showSnackbar({
      text: "暂无数据",
      color: "error",
    });
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

function getUpdateTime(): string {
  let lastUpdateTime = 0;
  roleList.value.forEach((role) => {
    const updateTime = new Date(role.updated).getTime();
    if (updateTime > lastUpdateTime) {
      lastUpdateTime = updateTime;
    }
  });
  return new Date(lastUpdateTime).toLocaleString().replace(/\//g, "-");
}

function selectRole(role: TGApp.Sqlite.Character.UserRole): void {
  dataVal.value = role;
  selectIndex.value = roleList.value.indexOf(role);
  showOverlay.value = true;
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
    showSnackbar({
      text: "未找到符合条件的角色",
      color: "warn",
    });
    return;
  }
  showSnackbar({
    text: `筛选出符合条件的角色 ${filterC.length} 个`,
    color: "success",
  });
  const selectedId = filterC.map((item) => item.id);
  selectedList.value = roleList.value.filter((role) => selectedId.includes(role.cid));
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

.uc-select-mode {
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
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
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
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.uc-empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}
</style>
