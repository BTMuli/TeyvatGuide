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
import { fetch } from "@tauri-apps/plugin-http";
import { parseBirthGal, parseBirthSrc } from "@utils/birthParser.js";

import { ArcBirDraw } from "@/data/index.js";

async function test() {
  for (const item of ArcBirDraw) {
    console.log("尝试解析", item.op_id, item.role_name);
    const srcResp = await fetch(item.gal_resource, {
      method: "GET",
      headers: { "Content-Type": "text/xml" },
    });
    const srcRes = await srcResp.text();
    const parseSrc = parseBirthSrc(new DOMParser().parseFromString(srcRes, "text/xml"));
    console.log("parsedSrc", parseSrc);
    const galResp = await fetch(item.gal_xml, {
      method: "GET",
      headers: { "Content-Type": "text/xml" },
    });
    const galRes = await galResp.text();
    const parseGal = parseBirthGal(new DOMParser().parseFromString(galRes, "text/xml"));
    console.log("parsedScene", parseGal);
  }
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
