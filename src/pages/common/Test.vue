<template>
  <div>
    <h1>测试米游社扫码登录</h1>
    <div class="btn-list">
      <v-btn class="test-btn" @click="showScan">弹窗</v-btn>
    </div>
    <ToGameLogin v-model="visible" />
    <h1>颜色测试</h1>
    <div class="test-box">
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
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref } from "vue";
import ToGameLogin from "../../components/overlay/to-gameLogin.vue";

const visible = ref<boolean>(false);

function showScan(): void {
  visible.value = true;
}
</script>
<style lang="css" scoped>
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

.test-box {
  display: flex;
  border-radius: 5px;
  gap: 10px;
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
