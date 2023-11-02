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
    <h1>角色详情（beta）</h1>
    <div class="test-item">
      <div class="role-box">
        {{ JSON.stringify(roleItem, null, 2) }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import { useUserStore } from "../../store/modules/user";

const visible = ref<boolean>(false);
const userStore = useUserStore();

const roleItem = ref<TGApp.Sqlite.Character.UserRole>();

onMounted(async () => {
  const user = userStore.getCurAccount();
  const roleData = await TGSqlite.getUserCharacter(user.gameUid);
  if (roleData !== false) {
    roleItem.value = roleData[0];
  }
  visible.value = false;
});
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

.role-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 10px;
  white-space: pre-wrap;
}
</style>
