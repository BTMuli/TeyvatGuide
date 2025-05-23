<template>
  <THomeCard>
    <template #title>近期活动</template>
    <template #default>
      <div class="position-grid">
        <PhPositionCard v-for="(card, index) in positions" :key="index" :pos="card" />
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PhPositionCard from "@comp/pageHome/ph-position-card.vue";
import takumiReq from "@req/takumiReq.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, shallowRef } from "vue";

import THomeCard from "./ph-comp-card.vue";

type TPositionEmits = (e: "success") => void;
const emits = defineEmits<TPositionEmits>();
const positions = shallowRef<Array<TGApp.BBS.Obc.PositionItem>>([]);

onMounted(async () => {
  const resp = await takumiReq.obc.position();
  if (Array.isArray(resp)) positions.value = resp;
  else {
    showSnackbar.error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
    await TGLogger.Error(`获取近期活动失败：[${resp.retcode}-${resp.message}`);
  }
  emits("success");
});
</script>
<style lang="scss" scoped>
.position-grid {
  display: grid;
  grid-gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px), 0.5fr));
}
</style>
