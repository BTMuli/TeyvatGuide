<!-- 首页限时祈愿组件 -->
<template>
  <THomeCard :append="isLogin" title="限时祈愿">
    <template #title>
      <span>限时祈愿</span>
      <v-icon class="tp-refresh" size="small" title="刷新" @click.stop="handleRefresh()">
        mdi-refresh
      </v-icon>
    </template>
    <template v-if="isLogin" #title-append>
      <v-switch v-model="isUserPool" class="tp-switch"></v-switch>
      <span>{{ isUserPool ? "用户" : "百科" }}</span>
    </template>
    <template #default>
      <div v-show="!isUserPool">
        <div v-if="obcPools.length < 3" class="pool-grid">
          <PhPoolCard v-for="(pool, idx) in obcPools" :key="idx" :pool="pool" />
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
          <SwiperSlide v-for="(pool, idx) in obcPools" :key="idx">
            <PhPoolCard :pool="pool" />
          </SwiperSlide>
        </Swiper>
      </div>
      <div v-show="isUserPool">
        <div class="pool-list">
          <PhPoolUser v-for="(pool, idx) in userPools" :key="idx" :pool="pool" />
        </div>
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhPoolCard from "@comp/pageHome/ph-pool-card.vue";
import PhPoolUser from "@comp/pageHome/ph-pool-user.vue";
import miscReq from "@req/miscReq.js";
import recordReq from "@req/recordReq.js";
import useAppStore from "@store/app.js";
import useHomeStore from "@store/home.js";
import useUserStore from "@store/user.js";
import takumiReq from "@req/takumiReq.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import THomeCard from "./ph-comp-card.vue";

import gameEnum from "@enum/game.js";

type TPoolEmits = (e: "success") => void;

const { isLogin } = storeToRefs(useAppStore());
const { cookie, account } = storeToRefs(useUserStore());
const homeStore = useHomeStore();

const emits = defineEmits<TPoolEmits>();

const isInit = ref<boolean>(false);
const isRefreshing = ref<boolean>(false);
const isUserPool = ref<boolean>(isLogin.value);
const obcPools = shallowRef<Array<TGApp.BBS.Obc.GachaItem>>([]);
const userPools = shallowRef<Array<TGApp.Game.ActCalendar.ActPool>>([]);
const swiperModules = [Autoplay, A11y];

watch(
  () => isUserPool.value,
  async () => {
    if (isUserPool.value) await loadUserPool();
    else await loadObcPool();
  },
);

watch(
  () => account.value.gameUid,
  async () => {
    if (isUserPool.value) {
      userPools.value = [];
      homeStore.actCalendarData = undefined;
      await loadUserPool(true);
    }
  },
);

onMounted(async () => {
  if (isLogin.value) await loadUserPool();
  else await loadObcPool();
  emits("success");
  isInit.value = true;
});

async function handleRefresh(): Promise<void> {
  isRefreshing.value = true;
  if (isUserPool.value) {
    userPools.value = [];
    homeStore.actCalendarData = undefined;
    await loadUserPool(true);
  } else {
    obcPools.value = [];
    await loadObcPool();
  }
}

async function loadUserPool(forceReload: boolean = false): Promise<void> {
  if (userPools.value.length > 0 && !forceReload) return;
  if (!cookie.value) {
    showSnackbar.warn("获取限时祈愿失败：未登录");
    isLogin.value = false;
    if (isInit.value) await showLoading.end();
    return;
  }
  if (isInit.value) await showLoading.start("正在获取限时祈愿");
  let data: TGApp.Game.ActCalendar.ActRes | undefined;
  try {
    if (homeStore.actCalendarData && !forceReload) {
      data = homeStore.actCalendarData;
    } else {
      const resp = await recordReq.actCalendar(cookie.value, account.value);
      console.log(resp);
      if (<number>resp.retcode === 1034) {
        await TGLogger.Warn("[PhCompPool][loadUserPool] 触发1034验证");
        if (!isInit.value || !isRefreshing.value) {
          if (isInit.value) await showLoading.end();
          isUserPool.value = false;
          if (isRefreshing.value) isRefreshing.value = false;
          await loadObcPool();
          return;
        }
        const challenge = await miscReq.challenge({
          account_id: cookie.value.account_id,
          cookie_token: cookie.value.cookie_token,
        });
        if (challenge === false) {
          if (isInit.value) {
            showSnackbar.error("极验验证失败，已切换至百科模式");
            await showLoading.end();
          }
          isUserPool.value = false;
          if (isRefreshing.value) isRefreshing.value = false;
          await loadObcPool();
          return;
        }
        const resp2 = await recordReq.actCalendar(cookie.value, account.value, challenge);
        if (resp2.retcode !== 0) {
          if (isInit.value) {
            showSnackbar.warn(`[${resp2.retcode}] ${resp2.message}`);
            await showLoading.end();
          }
          if (isRefreshing.value) isRefreshing.value = false;
          await TGLogger.Warn(`[PhCompPool][loadUserPool] ${resp2.retcode}-${resp2.message}`);
          emits("success");
          return;
        }
        data = resp2.data;
      } else if (resp.retcode !== 0) {
        if (isInit.value) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          await showLoading.end();
        }
        if (isRefreshing.value) isRefreshing.value = false;
        await TGLogger.Warn(`[PhCompPool][loadUserPool] ${resp.retcode}-${resp.message}`);
        emits("success");
        return;
      } else {
        data = resp.data;
      }
      homeStore.actCalendarData = data;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    if (isInit.value) {
      showSnackbar.error(`获取限时祈愿失败：${errMsg}`);
      await showLoading.end();
    }
    if (isRefreshing.value) isRefreshing.value = false;
    await TGLogger.Error("[PhCompPool][loadUserPool] 获取限时祈愿异常");
    await TGLogger.Error(`[PhCompPool][loadUserPool] ${e}`);
    emits("success");
    return;
  }
  const pools = filterPools([
    ...data.avatar_card_pool_list,
    ...data.weapon_card_pool_list,
    ...data.mixed_card_pool_list,
  ]);
  if (pools.length === 0) {
    if (isInit.value) {
      showSnackbar.warn("用户模式暂无卡池数据，已切换至百科模式");
      await showLoading.end();
    }
    if (isRefreshing.value) isRefreshing.value = false;
    isUserPool.value = false;
    await loadObcPool();
    return;
  }
  userPools.value = pools;
  if (isInit.value) await showLoading.end();
  if (isRefreshing.value) {
    showSnackbar.success("限时祈愿数据已刷新");
    isRefreshing.value = false;
  }
}

async function loadObcPool(): Promise<void> {
  if (obcPools.value.length > 0) return;
  if (isInit.value) await showLoading.start("正在加载限时祈愿");
  let resp: TGApp.BBS.Obc.GachaResp | undefined;
  try {
    resp = await takumiReq.obc.gacha();
    if (resp.retcode !== 0) {
      if (isInit.value) {
        showSnackbar.error(`获取限时祈愿失败：[${resp.retcode}] ${resp.message}`);
        await showLoading.end();
      }
      await TGLogger.Warn(`[PhCompPool][loadObcPool] ${resp.retcode}-${resp.message}`);
      emits("success");
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    if (isInit.value) {
      showSnackbar.error(`获取限时祈愿失败：${errMsg}`);
      await showLoading.end();
    }
    await TGLogger.Error("[PhCompPool][loadObcPool] 获取限时祈愿异常");
    await TGLogger.Error(`[PhCompPool][loadObcPool] ${e}`);
    emits("success");
    return;
  }
  const list = resp.data.list;
  if (list.length < 3) obcPools.value = list;
  else obcPools.value = [...list, ...list];
  if (list.length === 0 && isInit.value) showSnackbar.warn("暂无卡池信息");
  if (isInit.value) await showLoading.end();
  if (isRefreshing.value) {
    showSnackbar.success("限时祈愿数据已刷新");
    isRefreshing.value = false;
  }
}

function filterPools(
  pools: Array<TGApp.Game.ActCalendar.ActPool>,
): Array<TGApp.Game.ActCalendar.ActPool> {
  if (pools.length === 0) return [];
  const ongoing = pools.filter((p) => p.pool_status === gameEnum.actCalendar.poolStatus.Ongoing);
  if (ongoing.length > 0) return ongoing;
  const notStart = pools.filter((p) => p.pool_status === gameEnum.actCalendar.poolStatus.NotStart);
  if (notStart.length > 0) return notStart;
  return pools.filter((p) => p.pool_status === gameEnum.actCalendar.poolStatus.Ended);
}
</script>
<style lang="scss" scoped>
.tp-refresh {
  margin-left: 8px;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.tp-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.pool-grid {
  display: grid;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  grid-template-columns: repeat(2, 0.5fr);
}

.pool-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(calc(300px), 0.5fr));
}

.pool-swiper {
  width: 100%;
}
</style>
