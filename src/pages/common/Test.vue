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
  </div>
  <!--  <TpVideo :data="mock" />-->
</template>
<script lang="ts" setup>
import { onMounted } from "vue";

import Bili from "../../plugins/Bili";
// import TpVideo from "../../components/post/TpVideo.vue";

const mock = {
  insert: {
    video: "https://player.bilibili.com/player.html?aid=540893019&autoplay=false&bvid=BV1ri4y1s7sY",
  },
};

onMounted(async () => {
  const url = new URL(mock.insert.video);
  const aid = url.searchParams.get("aid") ?? undefined;
  const bvid = url.searchParams.get("bvid") ?? undefined;
  const baseData = await Bili.video.view(aid, bvid);
  console.log("baseData", baseData);
  const cid = baseData.cid;
  const urlData = await Bili.video.url(cid, undefined, bvid);
  console.log("urlData", urlData);
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
</style>
