<!-- 首页 -->
<template>
  <div class="home-container">
    <div class="home-top">
      <div v-if="isLogin" class="home-tools">
        <v-select
          v-model="curGid"
          :hide-details="true"
          :items="games"
          class="home-tool-select"
          item-value="gid"
          label="小工具（右侧）分区"
          variant="outlined"
        >
          <template #selection="{ item }">
            <div class="select-item main">
              <TMiImg
                v-if="item.raw.icon"
                :alt="item.raw.title"
                :ori="true"
                :src="item.raw.icon"
                :title="item.raw.title"
                class="icon"
              />
              <span>{{ item.raw.title }}</span>
            </div>
          </template>
          <template #item="{ props, item }">
            <div
              :class="item.raw.gid === curGid ? 'selected' : ''"
              class="select-item sub"
              v-bind="props"
            >
              <TMiImg
                v-if="item.raw.icon"
                :alt="item.raw.title"
                :src="item.raw.icon"
                :title="item.raw.title"
                class="icon"
              />
              <span>{{ item.raw.title }}</span>
            </div>
          </template>
        </v-select>
        <TGameNav :model-value="curGid" />
      </div>
      <div class="home-select">
        <v-select
          v-model="showItems"
          :chips="true"
          :hide-details="true"
          :items="showItemsAll"
          :multiple="true"
          label="首页组件显示"
          variant="outlined"
          width="360px"
        />
        <v-btn :rounded="true" class="select-btn" @click="submitHome">确定</v-btn>
      </div>
    </div>
    <component :is="item" v-for="item in components" :key="item" @success="loadEnd(item)" />
  </div>
</template>
<script lang="ts" setup>
import TGameNav from "@comp/app/t-gameNav.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhCompCalendar from "@comp/pageHome/ph-comp-calendar.vue";
import PhCompPool from "@comp/pageHome/ph-comp-pool.vue";
import PhCompPosition from "@comp/pageHome/ph-comp-position.vue";
import PhCompSign from "@comp/pageHome/ph-comp-sign.vue";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useHomeStore from "@store/home.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, defineComponent, onMounted, ref, shallowRef, watch } from "vue";

/**
 * 单文件组件类型
 */
type SFComp = ReturnType<typeof defineComponent>;
/**
 * 选项类型
 */
type SelectItem = {
  /** 图标 */
  icon: string;
  /** 标题 */
  title: string;
  /** 分区ID */
  gid: number;
};

const homeStore = useHomeStore();
const bbsStore = useBBSStore();

const { devMode, isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(bbsStore);

const showItemsAll: Array<string> = ["游戏签到", "素材日历", "限时祈愿", "近期活动"];

const curGid = ref<number>(2);

const games = shallowRef<Array<SelectItem>>();
const loadItems = shallowRef<Array<string>>([]);
const components = shallowRef<Array<SFComp>>([]);
const showItems = computed<Array<string>>({
  get: () => homeStore.getShowItems(),
  set: (v: Array<string>) => homeStore.setShowItems(v),
});

onMounted(async () => {
  await bbsStore.refreshGameList();
  await bbsStore.refreshGameUidCards();
  // @ts-expect-error-next-line The import.meta meta-property is not allowed in files which will build into CommonJS output.
  const isProdEnv = import.meta.env.MODE === "production";
  if (isProdEnv && devMode.value) devMode.value = false;
  if (isLogin.value) {
    await showLoading.start("正在加载首页小部件");
    games.value = gameList.value.map((i) => ({ icon: i.app_icon, title: i.name, gid: i.id }));
  }
  await loadComp();
});

watch(
  () => components.value,
  async (cur, old) => {
    const newComp = cur.filter((i) => !old.includes(i));
    if (newComp.length === 0) await showLoading.end();
  },
);

async function loadComp(): Promise<void> {
  const temp: Array<SFComp> = [];
  for (const item of showItems.value) {
    switch (item) {
      case "游戏签到":
        temp.push(PhCompSign);
        break;
      case "限时祈愿":
        temp.push(PhCompPool);
        break;
      case "近期活动":
        temp.push(PhCompPosition);
        break;
      case "素材日历":
        temp.push(PhCompCalendar);
        break;
    }
  }
  await showLoading.start(`正在加载：${showItems.value.join("、")}`);
  components.value = temp;
  await TGLogger.Info(`[Home][loadComp] 打开首页，当前显示：${showItems.value.join("、")}`);
}

async function submitHome(): Promise<void> {
  if (showItems.value.length === 0) {
    showSnackbar.warn("请至少选择一个!");
    return;
  }
  showSnackbar.success("设置成功!");
  await TGLogger.Info("[Home][submitHome] 首页设置成功，当前显示：" + showItems.value.join("、"));
  loadItems.value = showItems.value.filter((i) => loadItems.value.includes(i));
  await loadComp();
}

function getName(name: string): string | undefined {
  switch (name) {
    case "ph-comp-sign":
      return "签到";
    case "ph-comp-pool":
      return "限时祈愿";
    case "ph-comp-position":
      return "近期活动";
    case "ph-comp-calendar":
      return "素材日历";
    default:
      return undefined;
  }
}

async function loadEnd(item: ReturnType<typeof defineComponent>): Promise<void> {
  const compName = getName(item.__name ?? "");
  if (!compName) return;
  await TGLogger.Info(`[Home][loadEnd] ${compName} 加载完成`);
  await showLoading.update(`${compName} 加载完成`);
  if (!loadItems.value.includes(compName)) loadItems.value.push(compName);
  else showSnackbar.warn(`${compName} 已加载`);
  if (loadItems.value.length === components.value.length) await showLoading.end();
}
</script>
<style lang="scss" scoped>
.home-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.home-tools {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.home-tool-select {
  width: 250px;
  max-width: 250px;
}

.home-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.select-btn {
  width: 100px;
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.select-item {
  position: relative;
  display: flex;
  align-items: center;
  column-gap: 4px;

  &.main {
    position: relative;
    height: 24px;
    font-family: var(--font-title);
    font-size: 16px;
  }

  &.sub {
    padding: 8px;
    font-family: var(--font-title);
    font-size: 16px;

    &:hover {
      background: var(--common-shadow-2);
    }

    &.selected:not(:hover) {
      background: var(--common-shadow-1);
    }
  }

  .icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }
}
</style>
