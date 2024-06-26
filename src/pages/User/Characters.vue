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
        <v-btn class="uc-top-btn" @click="refreshRoles()">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          更新角色数据
        </v-btn>
        <v-btn class="uc-top-btn" @click="refreshTalent()">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          更新天赋数据
        </v-btn>
        <v-btn class="uc-top-btn" @click="shareRoles()">
          <template #prepend>
            <v-icon>mdi-share</v-icon>
          </template>
          分享
        </v-btn>
      </div>
    </div>
    <div class="uc-grid">
      <TucRoleBox
        v-for="(role, index) in roleList"
        :key="index"
        :model-value="role"
        @click="selectRole(role)"
      />
    </div>
  </div>
  <TucDetailOverlay
    v-if="!detailDev"
    v-model="visible"
    @clickL="clickOverlay('left')"
    @clickR="clickOverlay('right')"
    :data-val="dataVal"
  />
  <DucDetailOverlay
    v-if="detailDev"
    v-model="visible"
    @clickL="clickOverlay('left')"
    @clickR="clickOverlay('right')"
    :data-val="dataVal"
  />
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, ref } from "vue";

import DucDetailOverlay from "../../components/devCharacter/duc-detail-overlay.vue";
import showSnackbar from "../../components/func/snackbar.js";
import ToLoading from "../../components/overlay/to-loading.vue";
import TucDetailOverlay from "../../components/userCharacter/tuc-detail-overlay.vue";
import TucRoleBox from "../../components/userCharacter/tuc-role-box.vue";
import TGSqlite from "../../plugins/Sqlite/index.js";
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

function clickOverlay(pos: "left" | "right") {
  if (pos === "left") {
    if (selectIndex.value === 0) {
      selectIndex.value = roleList.value.length - 1;
    } else {
      selectIndex.value -= 1;
    }
  } else {
    if (selectIndex.value === roleList.value.length - 1) {
      selectIndex.value = 0;
    } else {
      selectIndex.value += 1;
    }
  }
  dataVal.value = roleList.value[selectIndex.value];
}

onBeforeMount(() => {
  if (userStore.account.value) {
    user.value = userStore.account.value;
  }
});

onMounted(async () => {
  await TGLogger.Info("[Character][onMounted] 进入角色页面");
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  await loadRole();
  loading.value = false;
});

function switchOld(): void {
  detailDev.value = !detailDev.value;
  showSnackbar({
    text: `已切换到${detailDev.value ? "新" : "旧"}版角色详情页面`,
  });
}

async function loadRole(): Promise<void> {
  if (!user.value) return;
  const roleData = await TGSqlite.getUserCharacter(user.value.gameUid);
  if (roleData !== false) {
    roleData.sort((a, b) => {
      if (a.star !== b.star) return b.star - a.star;
      if (a.element !== b.element) return a.element.localeCompare(b.element);
      return a.cid - b.cid;
    });
    roleList.value = roleData;
    dataVal.value = roleData[selectIndex.value];
    isEmpty.value = false;
    await TGLogger.Info(`[Character][loadRole][${user.value.gameUid}] 成功加载角色数据`);
    await TGLogger.Info(
      `[Character][loadRole][${user.value.gameUid}] 共获取到${roleData.length}个角色`,
    );
  } else {
    await TGLogger.Warn(`[Character][loadRole][${user.value.gameUid}] 未获取到角色数据`);
  }
}

async function refreshRoles(): Promise<void> {
  if (!user.value) return;
  await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 正在更新角色数据`);
  loadingTitle.value = "正在获取角色数据";
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
    ltoken: userStore.cookie.value.ltoken,
    ltuid: userStore.cookie.value.ltuid,
  };
  const res = await TGRequest.User.byLToken.getRoleList(cookie, user.value);
  if (Array.isArray(res)) {
    await TGLogger.Info(`[Character][refreshRoles][${user.value.gameUid}] 获取角色数据成功`);
    await TGLogger.Info(
      `[Character][refreshRoles][${user.value.gameUid}] 共获取到${res.length}个角色`,
    );
    loadingTitle.value = "正在保存角色数据";
    await TGSqlite.saveUserCharacter(user.value.gameUid, res);
    loadingTitle.value = "正在更新角色数据";
    await loadRole();
  } else {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    await TGLogger.Error(`[Character][refreshRoles][${user.value.gameUid}] 更新角色数据失败`);
    await TGLogger.Error(
      `[Character][refreshRoles][${user.value.gameUid}] ${res.retcode} ${res.message}`,
    );
  }
  loading.value = false;
}

async function refreshTalent(): Promise<void> {
  if (!user.value) return;
  loadingTitle.value = "正在获取天赋数据";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "请先登录",
      color: "error",
    });
    loading.value = false;
    return;
  }
  for (const role of roleList.value) {
    loadingTitle.value = `正在获取${role.name}的天赋数据`;
    loadingSub.value = `CID：${role.cid}`;
    const res = await TGRequest.User.calculate.getSyncAvatarDetail(
      userStore.cookie.value.account_id,
      userStore.cookie.value.cookie_token,
      user.value.gameUid,
      role.cid,
    );
    if ("skill_list" in res) {
      const talent: TGApp.Sqlite.Character.RoleTalent[] = [];
      res.skill_list.map((skill, index) => {
        return talent.push({
          id: skill.id,
          pos: index,
          level: skill.level_current,
          max: skill.max_level,
          name: skill.name,
          icon: skill.icon,
        });
      });
      const skillStr = talent.map((i) => `${i.id}:${i.level}`).join(",");
      await TGLogger.Info(
        `[Character][refreshTalent][${user.value.gameUid}] 成功获取到${role.name}的天赋数据 ${skillStr}`,
      );
      await TGSqlite.saveUserCharacterTalent(user.value.gameUid, role.cid, talent);
    } else {
      loadingTitle.value = `获取${role.name}的天赋数据失败`;
      loadingSub.value = `[${res.retcode}] ${res.message}`;
      await TGLogger.Error(
        `[Character][refreshTalent][${user.value.gameUid}] 获取 ${role.name} 的天赋数据失败`,
      );
      await TGLogger.Error(
        `[Character][refreshTalent][${user.value.gameUid}] ${res.retcode} ${res.message}`,
      );
      setTimeout(() => {}, 1000);
    }
  }
  loadingTitle.value = "正在更新天赋数据";
  loadingSub.value = "";
  loading.value = false;
  showSnackbar({
    text: "成功更新数据，即将刷新页面",
  });
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function shareRoles(): Promise<void> {
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
</style>
