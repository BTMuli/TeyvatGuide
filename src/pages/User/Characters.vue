<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="uc-top">
    <div class="uc-top-title">
      我的角色
    </div>
    <v-btn variant="outlined" @click="refresh">
      更新数据
    </v-btn>
  </div>
  <div class="uc-grid">
    <TUserAvatar v-for="avatar in roleList" :model-value="avatar" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TUserAvatar from "../../components/mini/t-user-avatar.vue";
// tauri
import { fs } from "@tauri-apps/api";
// store
import { useAppStore } from "../../store/modules/app";
import { useUserStore } from "../../store/modules/user";
// request
import TGRequest from "../../web/request/TGRequest";
// utils
import TGSqlite from "../../plugins/Sqlite";

// store
const appStore = useAppStore();
const userStore = useUserStore();

// loading
const loading = ref(false);
const loadingTitle = ref("");

// data
const roleList = ref([] as TGApp.Game.Character.ListItem[]);
const characterCookie = ref({} as TGApp.BBS.Constant.CookieGroup4);
const user = computed(() => userStore.getCurAccount());
const filePath = computed(() => `${appStore.dataPath.userDataDir}/roleList.json`);

onMounted(async () => {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  const curUser = await TGSqlite.getCurAccount();
  if (curUser) {
    user.value = curUser;
  }
  characterCookie.value = userStore.getCookieGroup4();
  const fileGet = await fs.readTextFile(filePath.value);
  if (fileGet) {
    roleList.value = JSON.parse(fileGet);
  }
  loading.value = false;
});

async function refresh () {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  const res = await TGRequest.User.byLToken.getRoleList(characterCookie.value, user.value);
  if (Array.isArray(res)) {
    loadingTitle.value = "正在保存角色数据";
    await fs.writeTextFile({
      path: filePath.value,
      contents: JSON.stringify(res),
    });
    loadingTitle.value = "正在更新角色数据";
    roleList.value = res;
  }
  loading.value = false;
}
</script>
<style lang="css" scoped>
.uc-top {
  background: rgb(0 0 0 / 20%);
  width: 100%;
  height: 50px;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  align-items: center;
  font-family: Genshin, sans-serif;
  font-size: 20px;
  color: #faf7e8;
}

.uc-top-title {
  margin-right: 10px;
}

.uc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 10px;
  margin-top: 10px;
}
</style>
