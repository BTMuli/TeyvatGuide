<template>
  <div class="test-box">
    <h1>颜色测试</h1>
    <div class="test-item">
      <div class="test-1">
        Box 1
        <div class="test-2">
          Box 2
          <div class="test-3">
            Box 3
            <div class="test-4">Box 4</div>
          </div>
        </div>
      </div>
    </div>
    <h1>数据请求测试</h1>
    <div class="btn-list">
      <v-btn class="test-btn" @click="tryGetList">获取角色列表</v-btn>
      <v-btn class="test-btn" @click="tryGetDetail">获取角色详情</v-btn>
    </div>
    <div class="test-grid">
      <TuaAvatarBox v-for="avatar in avatarList" :key="avatar.base.id" :model-value="avatar" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import showSnackbar from "../../components/func/snackbar.js";
import TuaAvatarBox from "../../components/userAvatar/tua-avatar-box.vue";
import TSUserAvatar from "../../plugins/Sqlite/modules/userAvatar.js";
import { useUserStore } from "../../store/modules/user.js";
import TGRequest from "../../web/request/TGRequest.js";

const userStore = useUserStore();
const avatarList = ref<TGApp.Game.Avatar.DetailList[]>();

async function tryGetList(): Promise<void> {
  const ck = userStore.cookie;
  if (!userStore.cookie) {
    showSnackbar({ text: "请先登录！", color: "warn" });
    return;
  }
  const cookie = { account_id: ck!.account_id, cookie_token: ck!.cookie_token };
  const account = userStore.account;
  const res = await TGRequest.User.byCookie.getAvatarList(cookie, account.gameUid);
  if (!Array.isArray(res)) {
    showSnackbar({ text: `[${res.retcode}] ${res.message}`, color: "error" });
    return;
  }
  console.log(res);
  showSnackbar({ text: "获取成功！", color: "success" });
}

async function tryGetDetail(): Promise<void> {
  const ck = userStore.cookie;
  if (!userStore.cookie) {
    showSnackbar({ text: "请先登录！", color: "warn" });
    return;
  }
  const cookie = { account_id: ck!.account_id, cookie_token: ck!.cookie_token };
  const account = userStore.account;
  const idList = await TSUserAvatar.getAllAvatarId();
  const res = await TGRequest.User.byCookie.getAvatarDetail(cookie, account.gameUid, idList);
  if ("retcode" in res) {
    showSnackbar({ text: `[${res.retcode}] ${res.message}`, color: "error" });
    return;
  }
  console.log(res);
  showSnackbar({ text: "获取成功！", color: "success" });
  userStore.propMap = res.property_map;
  avatarList.value = res.list;
}
</script>
<style lang="css" scoped>
.test-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-item {
  padding: 10px;
  border-radius: 5px;
}

.btn-list {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 10px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.test-1,
.test-2,
.test-3,
.test-4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
}

.test-1 {
  background: var(--box-bg-1);
}

.test-2 {
  background: var(--box-bg-2);
}

.test-3 {
  background: var(--box-bg-3);
}

.test-4 {
  background: var(--box-bg-4);
}

.test-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
