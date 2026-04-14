<!-- 首页限时祈愿组件 -->
<template>
  <THomeCard :append="false" title="限时祈愿">
    <template #default>
      <div v-if="pools.length < 3" class="pool-grid">
        <PhPoolCard v-for="(pool, idx) in pools" :key="idx" :pool="pool" />
      </div>
      <Swiper
        v-else
        :autoplay="{ delay: 3000, disableOnInteraction: false }"
        :centered-slides="true"
        :loop="true"
        :modules="swiperModules"
        :navigation="true"
        :slides-per-view="2"
        :space-between="12"
        class="pool-swiper"
      >
        <SwiperSlide v-for="(pool, idx) in pools" :key="idx">
          <PhPoolCard :pool="pool" />
        </SwiperSlide>
      </Swiper>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import showSnackbar from "@comp/func/snackbar.js";
import PhPoolCard from "@comp/pageHome/ph-pool-card.vue";
import takumiReq from "@req/takumiReq.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { onMounted, shallowRef } from "vue";

import THomeCard from "./ph-comp-card.vue";

type TPoolEmits = (e: "success") => void;

const emits = defineEmits<TPoolEmits>();
const pools = shallowRef<Array<TGApp.BBS.Obc.GachaItem>>([]);
const swiperModules = [Autoplay, A11y];

onMounted(async () => {
  let resp: TGApp.BBS.Obc.GachaResp | undefined;
  try {
    resp = await takumiReq.obc.gacha();
    if (resp.retcode !== 0) {
      showSnackbar.error(`获取限时祈愿失败：[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[PhCompPool] 获取限时祈愿失败：[${resp.retcode}] ${resp.message}`);
      emits("success");
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取限时祈愿失败：${errMsg}`);
    await TGLogger.Error(`[PhCompPool] 获取限时祈愿异常`);
    await TGLogger.Error(`[PhCompPool] ${e}`);
    emits("success");
    return;
  }
  const list = resp.data.list;
  if (list.length < 3) pools.value = list;
  else pools.value = [...list, ...list];
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
