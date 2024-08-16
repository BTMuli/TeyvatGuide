<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="uc-box">
    <div class="uc-top">
      <div class="uc-top-title" @click="switchOld">
        <span v-if="user">
          {{ user.nickname }} UID：{{ user.gameUid }} 更新于 {{ getUpdateTime() }}
        </span>
        <span v-else> 暂无数据 </span>
      </div>
      <div class="uc-top-btns" data-html2canvas-ignore>
        <v-btn class="uc-top-btn" @click="refresh()">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          刷新
        </v-btn>
        <v-btn class="uc-top-btn" @click="share()">
          <template #prepend>
            <v-icon>mdi-share</v-icon>
          </template>
          分享
        </v-btn>
      </div>
    </div>
    <div class="uc-grid">
      <TuaAvatarBox
        v-for="(role, index) in roleList"
        :key="index"
        :model-value="role"
        @click="selectRole(role)"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar.js";
import ToLoading from "../../components/overlay/to-loading.vue";
import TuaAvatarBox from "../../components/userAvatar/tua-avatar-box.vue";
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
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const isEmpty = ref(true);
const roleList = ref<TGApp.Sqlite.Character.UserRole[]>([]);

// overlay
const visible = ref(false);
const dataVal = ref<TGApp.Sqlite.Character.UserRole>(<TGApp.Sqlite.Character.UserRole>{});
const selectIndex = ref(0);
const detailDev = ref(true);

onBeforeMount(() => {
  if (userStore.account.value) {
    user.value = userStore.account.value;
  }
});

onMounted(async () => {
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  await load();
  loading.value = false;
});

function switchOld(): void {
  detailDev.value = !detailDev.value;
  showSnackbar({
    text: `已切换到${detailDev.value ? "新" : "旧"}版角色详情页面`,
  });
}

async function load(): Promise<void> {
  if (!user.value) return;
  const roleData = await TSUserAvatar.getAvatars(user.value.gameUid);
  roleData.sort((a, b) => {
    if (a.avatar.rarity !== b.avatar.rarity) return b.avatar.rarity - a.avatar.rarity;
    if (a.avatar.element !== b.avatar.element)
      return a.avatar.element.localeCompare(b.avatar.element);
    return a.cid - b.cid;
  });
  roleList.value = roleData;
  dataVal.value = roleData[selectIndex.value];
  isEmpty.value = false;
  await TGLogger.Info(`[Character][loadRole][${user.value.gameUid}] 成功加载角色数据`);
  await TGLogger.Info(
    `[Character][loadRole][${user.value.gameUid}] 共获取到${roleData.length}个角色`,
  );
}

async function refresh(): Promise<void> {
  if (!user.value) return;
  await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 正在更新角色数据`);
  loadingTitle.value = "正在获取角色列表";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "请先登录",
      color: "error",
    });
    loading.value = false;
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
}

async function share(): Promise<void> {
  if (!user.value) return;
  await TGLogger.Info(`[Character][shareRoles][${user.value.gameUid}] 正在生成分享图片`);
  const rolesBox = <HTMLElement>document.querySelector(".uc-box");
  const fileName = `【角色列表】-${user.value.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  await generateShareImg(fileName, rolesBox);
  loadingSub.value = "";
  loading.value = false;
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
  visible.value = true;
}
</script>
<style lang="css" scoped>
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
  align-items: center;
  gap: 15px;
}

.uc-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.uc-grid {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
}
</style>
