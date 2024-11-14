<template>
  <div class="gro-container">
    <v-tabs class="gro-tabs" v-model="historyTab" align-tabs="start" direction="vertical">
      <v-tab v-for="(item, index) in tabList" :key="index" :value="item.tab">
        v{{ item.tab }}
      </v-tab>
    </v-tabs>
    <v-window v-model="historyTab" class="gro-window">
      <v-window-item
        v-for="(item, index) in tabList"
        :key="index"
        :value="item.tab"
        class="gro-pools"
      >
        <div v-for="pool in item.value" :key="pool.order" class="gro-pool">
          <img
            :src="pool.banner"
            class="gro-banner"
            alt="banner"
            @click="createPost(pool.postId)"
          />
          <div class="gro-pool-info">
            <div class="gro-pi-title">
              <span>{{ pool.name }}</span>
              <span class="gro-pi-tag">{{ pool.order === 1 ? "上半" : "下半" }}</span>
              <span class="gro-pi-tag">{{ getType(pool.type) }}</span>
            </div>
            <div class="gro-pi-time">{{ getTimeStr(pool) }}</div>
            <div class="gro-pi-sub">Up 五星</div>
            <div class="gro-pool-up lv5">
              <TItembox
                v-for="i in pool.up5List"
                :key="i"
                :model-value="getBox(i)"
                @click="toWiki(i)"
              />
            </div>
            <div class="gro-pi-sub">Up 四星</div>
            <div class="gro-pool-up lv4">
              <TItembox
                v-for="i in pool.up4List"
                :key="i"
                :model-value="getBox(i)"
                @click="toWiki(i)"
              />
            </div>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { AppGachaData, AppCharacterData, AppWeaponData } from "../../data/index.js";
import { createPost } from "../../utils/TGWindow.js";
import { timestampToDate } from "../../utils/toolFunc.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

interface GroHistoryMap {
  tab: string;
  value: TGApp.App.Gacha.PoolItem[];
}

const historyTab = ref<string>("");
const tabList = ref<GroHistoryMap[]>([]);
const router = useRouter();

onMounted(() => {
  const res: GroHistoryMap[] = [];
  AppGachaData.forEach((pool) => {
    const index = res.findIndex((item) => item.tab === pool.version);
    if (index === -1) {
      res.push({
        tab: pool.version,
        value: [pool],
      });
    } else {
      res[index].value.push(pool);
    }
  });
  tabList.value = res.reverse();
  historyTab.value = res[0].tab;
});

async function toWiki(id: number): Promise<void> {
  const cFind = AppCharacterData.find((item) => item.id === id);
  const wFind = AppWeaponData.find((item) => item.id === id);
  const confirm = await showConfirm({
    title: "是否跳转到对应图鉴界面？",
  });
  if (confirm === undefined || confirm === false) {
    showSnackbar.cancel("已取消");
    return;
  }
  if (cFind) {
    await router.push({ name: "角色图鉴", params: { id: id.toString() } });
  } else if (wFind) {
    await router.push({ name: "武器图鉴", params: { id: id.toString() } });
  } else {
    showSnackbar.warn("未找到对应角色或武器");
  }
}

function getType(type: TGApp.App.Gacha.WishType): string {
  switch (type) {
    case 301:
      return "角色活动祈愿";
    case 400:
      return "角色活动祈愿2";
    case 302:
      return "武器活动祈愿";
    case 500:
      return "集录祈愿";
    default:
      return `未知类型 ${type}`;
  }
}

function getTimeStr(pool: TGApp.App.Gacha.PoolItem): string {
  const startTime = timestampToDate(Date.parse(pool.from));
  const endTime = timestampToDate(Date.parse(pool.to));
  return `${startTime} ~ ${endTime}`;
}

function getBox(id: number): TItemBoxData {
  const cFind = AppCharacterData.find((item) => item.id === id);
  const wFind = AppWeaponData.find((item) => item.id === id);
  if (cFind) {
    return {
      bg: `/icon/bg/${cFind.star}-Star.webp`,
      icon: `/WIKI/character/${cFind.id}.webp`,
      size: "80px",
      height: "80px",
      display: "inner",
      clickable: true,
      lt: `/icon/element/${cFind.element}元素.webp`,
      ltSize: "20px",
      innerHeight: 20,
      innerIcon: `/icon/weapon/${cFind.weapon}.webp`,
      innerText: cFind.name,
    };
  }
  if (wFind) {
    return {
      bg: `/icon/bg/${wFind.star}-Star.webp`,
      icon: `/WIKI/weapon/${wFind.id}.webp`,
      size: "80px",
      height: "80px",
      display: "inner",
      clickable: true,
      lt: wFind.weaponIcon,
      ltSize: "20px",
      innerHeight: 20,
      innerText: wFind.name,
    };
  }
  return {
    bg: "/icon/bg/0-Star.webp",
    icon: "/source/UI/empty/webp",
    size: "80px",
    height: "80px",
    display: "inner",
    clickable: false,
    lt: "",
    ltSize: "0",
    innerHeight: 20,
    innerText: "未找到对应角色或武器",
  };
}
</script>
<style lang="css" scoped>
.gro-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  column-gap: 10px;
}

.gro-tabs {
  width: 100px;
  height: 100%;
}

/* stylelint-disable-next-line selector-class-pattern */
.gro-container :deep(.v-tabs.v-slide-group--vertical) {
  max-height: 100%;
}

.gro-window {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-right: 10px;
  overflow-y: scroll;
}

/* stylelint-disable-next-line selector-class-pattern */
.gro-window :deep(.v-window__container) {
  width: 100%;
}

.gro-pools {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 10px;
}

.gro-pool {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-2);
  column-gap: 10px;
}

.gro-banner {
  width: 50vw;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.5s ease-in-out;
}

.gro-banner:hover {
  box-shadow: 0 0 10px 5px var(--box-bg-2);
  scale: 0.95;
  transition: 0.5s ease-in-out;
}

.gro-pool-info {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.gro-pi-title {
  display: flex;
  column-gap: 10px;
}

.gro-pi-title :first-child {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.gro-pi-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--box-bg-1);
  color: var(--box-text-5);
  font-size: 16px;
}

.gro-pi-sub {
  font-family: var(--font-title);
  font-size: 18px;
}

.gro-pool-up {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  overflow-y: auto;
}

.gro-pool-up.lv5 {
  max-height: 80px;
}

.gro-pool-up.lv4 {
  max-height: 170px;
}
</style>
