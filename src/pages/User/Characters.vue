<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="uc-top">
    <div class="uc-top-title">我的角色</div>
    <v-btn @click="refresh" variant="outlined">
      更新数据
    </v-btn>
  </div>
  {{ roleList }}
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
// tauri
import { fs } from "@tauri-apps/api";
// store
import { useAppStore } from "../../store/modules/app";
import { useUserStore } from "../../store/modules/user";
// request
import TGRequest from "../../web/request/TGRequest";
// utils
import TGSqlite from "../../utils/TGSqlite";

// store
const appStore = useAppStore();
const userStore = useUserStore();

// loading
const loading = ref(false);
const loadingTitle = ref("");

// data
const roleList = ref([]);
const characterCookie = ref({} as TGApp.BBS.Constant.CookieGroup4);
const user = ref({} as TGApp.Sqlite.Account.Game);
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
  console.log(res);
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
  background: rgba(0, 0, 0, 0.2);
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
</style>
