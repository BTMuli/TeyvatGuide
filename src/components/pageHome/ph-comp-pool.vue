<template>
  <THomeCard :append="false">
    <template #title>限时祈愿</template>
    <template #default>
      <!-- TODO: 当数量超过2时，改为走轮播，显示2个 -->
      <div class="pool-grid">
        <PhPoolCard v-for="(pool, idx) in pools" :key="idx" :pool="pool" />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PhPoolCard from "@comp/pageHome/ph-pool-card.vue";
import takumiReq from "@req/takumiReq.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, shallowRef } from "vue";

import THomeCard from "./ph-comp-card.vue";

type TPoolEmits = (e: "success") => void;

const emits = defineEmits<TPoolEmits>();
const pools = shallowRef<Array<TGApp.BBS.Obc.GachaItem>>([]);

onMounted(async () => {
  const resp = await takumiReq.obc.gacha();
  if (Array.isArray(resp)) pools.value = resp;
  else {
    showSnackbar.error(`获取限时祈愿失败：[${resp.retcode}-${resp.message}`);
    await TGLogger.Error(`获取限时祈愿失败：[${resp.retcode}-${resp.message}`);
  }
  emits("success");
});
</script>
<style lang="scss" scoped>
.pool-grid {
  display: grid;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  grid-template-columns: repeat(2, 0.5fr);
}
</style>
