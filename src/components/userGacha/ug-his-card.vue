<template>
  <div class="user-gacha-history-card-comp">
    <img
      class="ug-his-banner"
      :src="props.pool.banner"
      alt="banner"
      @click="createPost(pool.postId)"
    />
    <div class="ug-his-info">
      <div class="ug-his-title">
        <span>{{ props.pool.name }}</span>
        <span class="ug-his-tag">{{ props.pool.order === 1 ? "上半" : "下半" }}</span>
        <span class="ug-his-tag">{{ getType(props.pool.type) }}</span>
      </div>
      <div class="ug-his-time">{{ getTimeStr(props.pool) }}</div>
      <div class="ug-his-sub">Up 五星</div>
      <div class="ug-his-up lv5">
        <TItemBox
          v-for="i in props.pool.up5List"
          :key="i"
          :model-value="getBox(i)"
          @click="toWiki(i)"
        />
      </div>
      <div class="ug-his-sub">Up 四星</div>
      <div class="ug-his-up lv4">
        <TItemBox
          v-for="i in props.pool.up4List"
          :key="i"
          :model-value="getBox(i)"
          @click="toWiki(i)"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { createPost } from "@utils/TGWindow.js";
import { getWikiBrief, timestampToDate } from "@utils/toolFunc.js";
import { useRouter } from "vue-router";

type UgHisCardProps = { pool: TGApp.App.Gacha.PoolItem };

const router = useRouter();
const props = defineProps<UgHisCardProps>();

async function toWiki(id: number): Promise<void> {
  const find = getWikiBrief(id);
  if (!find) {
    showSnackbar.warn("未找到对应角色或武器");
    return;
  }
  if ("element" in find) {
    await router.push({ name: "角色图鉴", params: { id: id.toString() } });
    return;
  }
  await router.push({ name: "武器图鉴", params: { id: id.toString() } });
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
  const bFind = getWikiBrief(id);
  if (!bFind) {
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
  if ("element" in bFind) {
    return {
      bg: `/icon/bg/${bFind.star}-Star.webp`,
      icon: `/WIKI/character/${bFind.id}.webp`,
      size: "80px",
      height: "80px",
      display: "inner",
      clickable: true,
      lt: `/icon/element/${bFind.element}元素.webp`,
      ltSize: "20px",
      innerHeight: 20,
      innerIcon: `/icon/weapon/${bFind.weapon}.webp`,
      innerText: bFind.name,
    };
  }
  return {
    bg: `/icon/bg/${bFind.star}-Star.webp`,
    icon: `/WIKI/weapon/${bFind.id}.webp`,
    size: "80px",
    height: "80px",
    display: "inner",
    clickable: true,
    lt: `/icon/weapon/${bFind.weapon}.webp`,
    ltSize: "20px",
    innerHeight: 20,
    innerText: bFind.name,
  };
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.user-gacha-history-card-comp {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  column-gap: 8px;
}

.ug-his-banner {
  @include github-styles.github-card-shadow();

  width: 50vw;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.5s ease-in-out;

  &:hover {
    scale: 0.95;
    transition: 0.5s ease-in-out;
  }
}

.ug-his-info {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.ug-his-title {
  display: flex;
  column-gap: 8px;
  align-items: center;
  justify-content: flex-start;

  :first-child {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.ug-his-tag {
  @include github-styles.github-tag-dark-gen(#e06c63);

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  height: fit-content;
  border-radius: 4px;
  font-size: 16px;
}

.ug-his-sub {
  font-family: var(--font-title);
  font-size: 18px;
}

.ug-his-up {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-y: auto;

  &.lv5 {
    max-height: 80px;
  }

  &.lv4 {
    max-height: 168px;
  }
}
</style>
