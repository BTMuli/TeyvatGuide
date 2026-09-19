<template>
  <div class="pc-page">
    <div class="config-box">
      <TcInfo />
      <TcData />
      <TcDebug />
      <TcDataDir />
    </div>
    <div class="config-right"><TcAppBadge /><TcUserBadge /><TcHutaoBadge /></div>
  </div>
</template>
<script lang="ts" setup>
import TcAppBadge from "@comp/pageConfig/tc-appBadge.vue";
import TcData from "@comp/pageConfig/tc-data.vue";
import TcDataDir from "@comp/pageConfig/tc-dataDir.vue";
import TcDebug from "@comp/pageConfig/tc-debug.vue";
import TcHutaoBadge from "@comp/pageConfig/tc-hutaoBadge.vue";
import TcInfo from "@comp/pageConfig/tc-info.vue";
import TcUserBadge from "@comp/pageConfig/tc-userBadge.vue";
</script>
<style lang="scss" scoped>
.pc-page {
  position: relative;
  display: flex;
  height: calc(100vh - 32px);
  align-items: stretch;
  column-gap: 8px;
}

.config-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  row-gap: 12px;
}

.config-list {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--box-bg-1);
  font-family: var(--font-text);
}

.config-right {
  position: relative;
  display: flex;
  overflow: hidden auto;
  width: 256px;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  justify-content: flex-start;
  row-gap: 8px;
}
</style>
