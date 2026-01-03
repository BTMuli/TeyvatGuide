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
    <div class="btn-list">
      <v-btn class="test-btn" @click="test()">测试</v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import useHutaoStore from "@store/hutao.js";
import { storeToRefs } from "pinia";

const { userName, accessToken, refreshToken } = storeToRefs(useHutaoStore());

async function test() {
  const inputN = await showDialog.input("UserName");
  const inputP = await showDialog.input("Pwd");
  if (!inputN || !inputP) return;
  const resp = await hutao.Account.login(inputN, inputP);
  if ("retcode" in resp) {
    showSnackbar.warn(`${resp.retcode}-${resp.message}`);
    return;
  }
  userName.value = inputN;
  accessToken.value = resp.AccessToken;
  refreshToken.value = resp.RefreshToken;
  showSnackbar.success("登录成功!");
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
</style>
