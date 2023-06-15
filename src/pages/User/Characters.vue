<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="uc-box">
    <div class="uc-top">
      <div class="uc-top-title">
        {{ user.nickname }} UID：{{ user.gameUid }}
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
    <div class="uc-grid">
      <TUserAvatar v-for="avatar in roleList" :model-value="avatar" />
    </div>
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
// utils
import TGRequest from "../../web/request/TGRequest";
import { generateShareImg } from "../../utils/TGShare";

// store
const appStore = useAppStore();
const userStore = useUserStore();

// loading
const loading = ref(false);
const loadingTitle = ref("");

// data
const roleList = ref([] as TGApp.Game.Character.ListItem[]);
const characterCookie = computed(() => userStore.getCookieGroup4());
const user = computed(() => userStore.getCurAccount());
const filePath = computed(() => `${appStore.dataPath.userDataDir}/roleList.json`);

onMounted(async () => {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  try {
    const fileGet = await fs.readTextFile(filePath.value);
    roleList.value = JSON.parse(fileGet);
  } catch (error) {
    console.log(error);
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

async function shareRoles () {
  const rolesBox = document.querySelector(".uc-box") as HTMLElement;
  const fileName = `角色列表-${user.value.gameUid}-${Math.floor(Date.now())}.png`;
  await generateShareImg(fileName, rolesBox);
}
</script>
<style lang="css" scoped>
.uc-box {
  width: 100%;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 10px var(--common-bg-4);
}

.uc-top {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  align-items: center;
}

.uc-top-title {
  font-family: var(--font-title);
  font-size: 20px;
  margin-right: 10px;
  color: var(--common-text);
}

.uc-top-btn {
  font-family: var(--font-text);
  border-radius: 5px;
  background: var(--common-bg-2);
  color: var(--common-color-white);
  margin-left: 15px;
}

.uc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 10px;
  margin-top: 10px;
}
</style>
