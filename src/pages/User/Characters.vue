<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="uc-box">
    <div class="uc-top">
      <div class="uc-top-title">
        <span v-if="user">
          {{ user.nickname }} UID：{{ user.gameUid }} 更新于 {{ getUpdateTime() }}
        </span>
        <span v-else> 暂无数据 </span>
      </div>
      <div class="uc-top-btns">
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
  <ToUcDetail v-model="visible" :data-val="dataVal" />
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import ToUcDetail from "../../components/userCharacter/tuc-detail-overlay.vue";
import TucRoleBox from "../../components/userCharacter/tuc-role-box.vue";
import TGSqlite from "../../plugins/Sqlite";
import { useUserStore } from "../../store/modules/user";
import { generateShareImg } from "../../utils/TGShare";
import TGRequest from "../../web/request/TGRequest";

// store
const userStore = useUserStore();
const user = userStore.getCurAccount();

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const isEmpty = ref(true);
const roleList = ref<TGApp.Sqlite.Character.UserRole[]>([]);
const roleCookie = computed(() => userStore.getCookieGroup4());

// overlay
const visible = ref(false);
const dataVal = ref<TGApp.Sqlite.Character.UserRole>(<TGApp.Sqlite.Character.UserRole>{});

onMounted(async () => {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  await loadRole();
  loading.value = false;
});

async function loadRole(): Promise<void> {
  const roleData = await TGSqlite.getUserCharacter(user.gameUid);
  if (roleData !== false) {
    roleData.sort((a, b) => {
      if (a.star !== b.star) return b.star - a.star;
      if (a.element !== b.element) return a.element.localeCompare(b.element);
      return a.cid - b.cid;
    });
    roleList.value = roleData;
    isEmpty.value = false;
  }
}

async function refreshRoles(): Promise<void> {
  loadingTitle.value = "正在获取角色数据";
  loading.value = true;
  const res = await TGRequest.User.byLToken.getRoleList(roleCookie.value, user);
  if (Array.isArray(res)) {
    loadingTitle.value = "正在保存角色数据";
    await TGSqlite.saveUserCharacter(user.gameUid, res);
    loadingTitle.value = "正在更新角色数据";
    await loadRole();
  } else {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    console.error(res);
  }
  loading.value = false;
}

async function refreshTalent(): Promise<void> {
  loadingTitle.value = "正在获取天赋数据";
  loading.value = true;
  const talentCookie = userStore.getCookieGroup2();
  for (const role of roleList.value) {
    loadingTitle.value = `正在获取${role.name}的天赋数据`;
    loadingSub.value = `CID：${role.cid}`;
    const res = await TGRequest.User.calculate.getSyncAvatarDetail(
      talentCookie,
      user.gameUid,
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
      await TGSqlite.saveUserCharacterTalent(user.gameUid, role.cid, talent);
    } else {
      loadingTitle.value = `获取${role.name}的天赋数据失败`;
      loadingSub.value = `[${res.retcode}] ${res.message}`;
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
  const rolesBox = <HTMLElement>document.querySelector(".uc-box");
  const fileName = `【角色列表】-${user.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  await generateShareImg(fileName, rolesBox);
  loadingSub.value = "";
  loading.value = false;
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
  console.log(role);
  dataVal.value = role;
  visible.value = true;
}
</script>
<style lang="css" scoped>
.uc-box {
  display: flex;
  width: 100%;
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
