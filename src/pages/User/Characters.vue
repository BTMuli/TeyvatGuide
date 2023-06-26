<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="uc-box">
    <div class="uc-top">
      <div class="uc-top-title">
        {{ user.nickname }} UID：{{ user.gameUid }} 更新于 {{ getUpdateTime() }}
      </div>
      <v-btn variant="outlined" class="uc-top-btn" @click="refresh()">
        <template #prepend>
          <v-icon>mdi-refresh</v-icon>
        </template>
        更新数据
      </v-btn>
      <v-btn variant="outlined" class="uc-top-btn" @click="shareRoles()">
        <template #prepend>
          <v-icon>mdi-share</v-icon>
        </template>
        分享
      </v-btn>
    </div>
    <!-- grid 布局，参考 Snap.Hutao -->
    <div class="uc-grid">
      <TucRoleBox v-for="role in roleList" :model-value="role" @click="selectRole(role)" />
    </div>
  </div>
  <ToUcDetail v-model="visible" :data-val="dataVal" />
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TucRoleBox from "../../components/userCharacter/tuc-role-box.vue";
import ToUcDetail from "../../components/userCharacter/tuc-detail-overlay.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGSqlite from "../../plugins/Sqlite";
import TGRequest from "../../web/request/TGRequest";
import { generateShareImg } from "../../utils/TGShare";

// store
const userStore = useUserStore();

// loading
const loading = ref(false);
const loadingTitle = ref("");

// data
const isEmpty = ref(true);
const roleList = ref([] as TGApp.Sqlite.Character.UserRole[]);
const roleCookie = computed(() => userStore.getCookieGroup4());
const user = computed(() => userStore.getCurAccount());

// overlay
const visible = ref(false);
const dataVal = ref({} as TGApp.Sqlite.Character.UserRole);

// grid
const gridGap = ref("10px");

const resizeObserve = new ResizeObserver(() => {
  getGridGap();
});

onMounted(async () => {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  await loadRole();
  resizeObserve.observe(document.querySelector(".uc-grid"));
  loading.value = false;
});

function getGridGap() {
  const width = document.querySelector(".uc-grid")?.clientWidth - 20;
  const count = Math.floor(width / 180);
  gridGap.value = `${(width - count * 180) / (count - 1)}px`;
}

async function loadRole() {
  const roleData = await TGSqlite.getUserCharacter(user.value.gameUid);
  if (roleData !== false) {
    roleList.value = roleData;
    isEmpty.value = false;
  }
}

async function refresh() {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  const res = await TGRequest.User.byLToken.getRoleList(roleCookie.value, user.value);
  if (Array.isArray(res)) {
    loadingTitle.value = "正在保存角色数据";
    await TGSqlite.saveUserCharacter(user.value.gameUid, res);
    loadingTitle.value = "正在更新角色数据";
    await loadRole();
  }
  loading.value = false;
}

async function shareRoles() {
  const rolesBox = document.querySelector(".uc-box") as HTMLElement;
  const fileName = `【角色列表】-${user.value.gameUid}`;
  await generateShareImg(fileName, rolesBox);
}

function getUpdateTime() {
  let lastUpdateTime = 0;
  roleList.value.forEach((role) => {
    const updateTime = new Date(role.updated).getTime();
    if (updateTime > lastUpdateTime) {
      lastUpdateTime = updateTime;
    }
  });
  return new Date(lastUpdateTime).toLocaleString().replace(/\//g, "-");
}

function selectRole(role: TGApp.Sqlite.Character.UserRole) {
  dataVal.value = role;
  visible.value = true;
}
</script>
<style lang="css" scoped>
.uc-box {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.uc-top {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
}

.uc-top-title {
  margin-right: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.uc-top-btn {
  border-radius: 5px;
  margin-left: 15px;
  background: var(--common-shadow-2);
  color: var(--common-color-white);
  font-family: var(--font-text);
}

.uc-grid {
  display: grid;
  padding: 10px;
  grid-gap: 10px v-bind(gridGap);
  grid-template-columns: repeat(auto-fill, 180px);
}
</style>
