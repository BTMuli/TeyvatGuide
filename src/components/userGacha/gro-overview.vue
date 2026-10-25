<!-- 祈愿数据概览轮播 -->
<template>
  <Swiper
    :autoplay="false"
    :centered-slides="false"
    :loop="false"
    :modules="swiperModules"
    :pagination="{ clickable: true }"
    :slides-per-view="3"
    :space-between="12"
    class="gro-o-swiper"
  >
    <SwiperSlide>
      <GroDataView
        :data-val="normalData"
        :gridMode
        :periodEnd
        :periodStart
        :versionFilter
        data-type="normal"
      />
    </SwiperSlide>
    <SwiperSlide>
      <GroDataView
        :data-val="avatarData"
        :gridMode
        :periodEnd
        :periodStart
        :versionFilter
        data-type="avatar"
      />
    </SwiperSlide>
    <SwiperSlide>
      <GroDataView
        :data-val="weaponData"
        :gridMode
        :periodEnd
        :periodStart
        :versionFilter
        data-type="weapon"
      />
    </SwiperSlide>
    <SwiperSlide v-if="mixData.length !== 0">
      <GroDataView
        :data-val="mixData"
        :gridMode
        :periodEnd
        :periodStart
        :versionFilter
        data-type="mix"
      />
    </SwiperSlide>
    <SwiperSlide v-if="newData.length !== 0">
      <GroDataView
        :data-val="newData"
        :gridMode
        :periodEnd
        :periodStart
        :versionFilter
        data-type="new"
      />
    </SwiperSlide>
  </Swiper>
</template>
<script lang="ts" setup>
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { A11y, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { computed } from "vue";

import GroDataView from "./gro-data-view.vue";

/**
 * 祈愿数据概览参数
 * @since Beta v0.13.0
 */
type GachaOverviewProps = {
  gridMode?: boolean;
  modelValue: Array<TGApp.Sqlite.Gacha.Gacha>;
  versionFilter?: string | null;
  periodStart?: string;
  periodEnd?: string;
};

const {
  gridMode = false,
  modelValue,
  versionFilter = null,
  periodStart = "",
  periodEnd = "",
} = defineProps<GachaOverviewProps>();
const swiperModules = [Autoplay, A11y, Pagination];

const newData = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  modelValue.filter((item) => item.uigfType === "100"),
);
const normalData = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  modelValue.filter((item) => item.uigfType === "200"),
);
const avatarData = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  modelValue.filter((item) => item.uigfType === "301"),
);
const weaponData = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  modelValue.filter((item) => item.uigfType === "302"),
);
const mixData = computed<Array<TGApp.Sqlite.Gacha.Gacha>>(() =>
  modelValue.filter((item) => item.uigfType === "500"),
);
</script>
<style lang="scss" scoped>
.gro-o-swiper {
  --swiper-pagination-bottom: 16px;
  --swiper-pagination-color: var(--tgc-pink-1);
  --swiper-pagination-bullet-inactive-color: var(--tgc-od-white);
  --swiper-pagination-bullet-inactive-opacity: 1;

  width: 100%;
  height: 100%;
  column-gap: 8px;
}

:deep(.swiper-pagination-bullet) {
  box-shadow: 0 0 4px var(--common-shadow-4);
}
</style>
