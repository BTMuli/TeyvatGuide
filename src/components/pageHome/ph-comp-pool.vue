<template>
  <THomeCard :append="false">
    <template #title>限时祈愿</template>
    <template #default>
      <div class="pool-grid" v-if="pools.length < 3">
        <PhPoolCard v-for="(pool, idx) in pools" :key="idx" :pool="pool" />
      </div>
      <!-- TODO: 优化Swiper效果 -->
      <Swiper
        v-else
        :slides-per-view="2"
        :space-between="12"
        :loop="true"
        :centered-slides="true"
        :navigation="true"
        :autoplay="{ delay: 3000, disableOnInteraction: false }"
        :modules="swiperModules"
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
import TGLogger from "@utils/TGLogger.js";
import { Autoplay, A11y } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { onMounted, shallowRef } from "vue";

import THomeCard from "./ph-comp-card.vue";

type TPoolEmits = (e: "success") => void;

const emits = defineEmits<TPoolEmits>();
const pools = shallowRef<Array<TGApp.BBS.Obc.GachaItem>>([]);
const swiperModules = [Autoplay, A11y];

onMounted(async () => {
  const resp = await takumiReq.obc.gacha();
  if (Array.isArray(resp)) {
    if (resp.length < 3) pools.value = resp;
    else pools.value = [...resp, ...resp];
  } else {
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
