<template>
  <div class="hta-title">
    <span>胡桃数据库</span>
    <span @click="showDialog = true">更新于 {{ getUpdated() }}</span>
  </div>
  <HtaOverlayOverview v-model="showDialog" :data="overview" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
// utils
import HutaoRequest from "../../plugins/Hutao";
import HtaOverlayOverview from "../../components/hutaoAbyss/hta-overlay-overview.vue";

const showDialog = ref(false);

// data
const overview = ref({} as TGApp.Plugins.Hutao.AbyssOverview);

onMounted(async () => {
  overview.value = await HutaoRequest.Abyss.getOverview();
});

function getUpdated() {
  return new Date(overview.value.timestamp)
    .toLocaleString("zh-CN", { hour12: false })
    .replace(/\//g, "-");
}
</script>
<style lang="css" scoped>
.hta-title {
  font-family: var(--font-title);
  font-size: 20px;
  display: flex;
  align-items: end;
  justify-content: start;
}

.hta-title :nth-child(2) {
  margin-left: 10px;
  font-size: 12px;
  color: #5e7987; /* 淡蓝灰 */
}

.hta-title :nth-child(2):hover {
  cursor: pointer;
  text-decoration: underline;
}
</style>
