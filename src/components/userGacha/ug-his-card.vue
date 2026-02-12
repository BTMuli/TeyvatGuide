<!-- 单个卡池抽卡记录 -->
<template>
  <div class="ug-his-cc">
    <!-- 卡池封面 -->
    <div class="ug-hisc-banner">
      <TMiImg :ori="true" :src="props.pool.banner" alt="banner" @click="createPost(pool.postId)" />
    </div>
    <!-- 卡池信息 -->
    <div class="ug-hisc-info">
      <div class="ug-hisci-title">
        <span>{{ props.pool.name }}</span>
        <span class="ug-hisci-tag">{{ props.pool.order === 1 ? "上半" : "下半" }}</span>
        <span class="ug-hisci-tag">{{ getType(props.pool.type) }}</span>
      </div>
      <div :title="getTimeStr(props.pool)" class="ug-hisci-time">{{ getTimeStr(props.pool) }}</div>
      <div class="ug-hisci-sub">Up 五星</div>
      <div class="ug-hisci-up">
        <TItemBox
          v-for="i in props.pool.up5List"
          :key="i"
          :model-value="getBox(i)"
          @click="toWiki(i)"
        />
      </div>
      <div class="ug-hisci-sub">Up 四星</div>
      <div class="ug-hisci-up">
        <TItemBox
          v-for="i in props.pool.up4List"
          :key="i"
          :model-value="getBox(i)"
          @click="toWiki(i)"
        />
      </div>
    </div>
    <!-- 抽卡信息 -->
    <div v-if="gachaRecords.length > 0" class="ug-hisc-records">
      <div class="ug-hiscr-title">抽卡记录({{ gachaRecords.length }}条)</div>
      <div class="ug-hiscr-list">
        <TItemBox
          v-for="(item, idx) in gachaBoxes"
          :key="idx"
          :model-value="getBox2(item)"
          :title="item.name"
          class="ug-hicr-item"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import { createPost } from "@utils/TGWindow.js";
import { getWikiBrief, timestampToDate } from "@utils/toolFunc.js";
import { shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

type UgHisCardProps = {
  /** 卡池信息 */
  pool: TGApp.App.Gacha.PoolItem;
  /** UID */
  uid?: string;
};
type UgcHisCardBox = {
  /** 星级 */
  rank: number;
  /** 名称 */
  name: string;
  /** itemId */
  id: number;
  /** 列表 */
  list: Array<TGApp.Sqlite.Gacha.Gacha>;
  /** 数量 */
  cnt: number;
};

const router = useRouter();
const props = defineProps<UgHisCardProps>();

const gachaTypeList: ReadonlyArray<TGApp.App.Gacha.PoolGachaType> = [
  gameEnum.gachaType.AvatarUp,
  gameEnum.gachaType.AvatarUp2,
  gameEnum.gachaType.WeaponUp,
  gameEnum.gachaType.MixUp,
];
const gachaRecords = shallowRef<Array<TGApp.Sqlite.Gacha.Gacha>>([]);
const gachaBoxes = shallowRef<Array<UgcHisCardBox>>([]);

watch(
  () => props.uid,
  async () => await loadRecords(),
  { immediate: true },
);

async function loadRecords(): Promise<void> {
  if (!props.uid) gachaRecords.value = [];
  else gachaRecords.value = await TSUserGacha.record.pool(props.pool, props.uid);
  gachaBoxes.value = [];
  const tmpBoxes: Record<string, UgcHisCardBox> = {};
  for (const r of gachaRecords.value) {
    if (r.itemId in tmpBoxes) {
      tmpBoxes[r.itemId].list.push(r);
      tmpBoxes[r.itemId].cnt++;
    } else {
      tmpBoxes[r.itemId] = {
        rank: Number(r.rank),
        id: Number(r.itemId),
        name: r.name,
        list: [r],
        cnt: 1,
      };
    }
  }
  gachaBoxes.value = Array.from(Object.values(tmpBoxes)).sort(
    (a, b) => b.rank - a.rank || b.cnt - a.cnt || b.id - a.id,
  );
}

function isPoolGachaType(x: string): x is TGApp.App.Gacha.PoolGachaType {
  return (<ReadonlyArray<string>>gachaTypeList).includes(x);
}

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

function getType(type: number): string {
  const typeStr = type.toString();
  if (isPoolGachaType(typeStr)) {
    switch (typeStr) {
      case gameEnum.gachaType.AvatarUp:
        return "角色活动祈愿";
      case gameEnum.gachaType.AvatarUp2:
        return "角色活动祈愿2";
      case gameEnum.gachaType.WeaponUp:
        return "武器活动祈愿";
      case gameEnum.gachaType.MixUp:
        return "集录祈愿";
      default:
        return `未知类型 ${type}`;
    }
  }
  return `未知类型 ${type}`;
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
      icon: "/UI/app/empty.webp",
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
      clickable: false,
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

function getBox2(item: UgcHisCardBox): TItemBoxData {
  const bFind = getWikiBrief(item.id);
  if (!bFind) {
    return {
      bg: "/icon/bg/0-Star.webp",
      icon: "/UI/app/empty.webp",
      size: "40px",
      height: "64px",
      display: "outer",
      clickable: false,
      lt: "",
      ltSize: "0",
      innerHeight: 0,
      innerText: "",
      outerHeight: 24,
      outerText: item.cnt.toString(),
    };
  }
  if ("element" in bFind) {
    return {
      bg: `/icon/bg/${bFind.star}-Star.webp`,
      icon: `/WIKI/character/${bFind.id}.webp`,
      size: "40px",
      height: "64px",
      display: "outer",
      clickable: false,
      lt: `/icon/element/${bFind.element}元素.webp`,
      ltSize: "12px",
      innerText: "",
      innerHeight: 0,
      outerText: item.cnt.toString(),
      outerHeight: 24,
    };
  }
  return {
    bg: `/icon/bg/${bFind.star}-Star.webp`,
    icon: `/WIKI/weapon/${bFind.id}.webp`,
    size: "40px",
    height: "64px",
    display: "outer",
    clickable: false,
    lt: `/icon/weapon/${bFind.weapon}.webp`,
    ltSize: "12px",
    innerHeight: 0,
    innerText: "",
    outerText: item.cnt.toString(),
    outerHeight: 24,
  };
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.ug-his-cc {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: stretch;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  column-gap: 8px;
}

.ug-hisc-banner {
  @include github-styles.github-card-shadow;

  display: flex;
  min-width: 550px;
  height: 270px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);
  cursor: pointer;
  transition: 0.5s ease-in-out;

  img {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }

  &:hover {
    scale: 0.95;
    transition: 0.5s ease-in-out;
  }
}

.ug-hisc-info,
.ug-hisc-records {
  position: relative;
  display: flex;
  width: 100%;
  height: 270px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-x: hidden;
}

.ug-hisci-title,
.ug-hiscr-title {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  gap: 4px;
}

.ug-hisci-tag {
  @include github-styles.github-tag-dark-gen(#e06c63);

  display: flex;
  height: fit-content;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  font-family: var(--font-text);
  font-size: 12px;
}

.ug-hisci-time {
  position: relative;
  display: inline;
  overflow: hidden;
  max-width: 100%;
  font-size: 12px;
  max-lines: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.ug-hisci-sub {
  font-family: var(--font-title);
  font-size: 16px;
}

.ug-hisci-up {
  display: flex;
  min-height: 80px;
  max-height: 80px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-y: auto;
}

.ug-hiscr-list {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  overflow-y: auto;
}
</style>
