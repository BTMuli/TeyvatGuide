<template>
  <div>
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
    <h1>极验测试</h1>
    <div class="btn-list">
      <v-btn class="test-btn" @click="getGC">获取极验</v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import showGeetest from "../../components/func/geetest";

const visible = ref<boolean>(false);

onMounted(async () => {
  visible.value = false;
});

async function getGC(): Promise<void> {
  const res = await showGeetest();
  console.log(res);
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
