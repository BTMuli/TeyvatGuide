<template>
  <div v-if="props.modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-ag-box">
    <TItembox
      v-for="avatar in props.modelValue"
      :key="avatar.id"
      :model-value="getBoxData(avatar)"
      :title="getTitle(avatar)"
    >
      <template #inner-text>
        <span :style="{ color: getAvatarNameColor(avatar.level) }" :title="getAvatarName(avatar)">
          {{ getAvatarName(avatar) }}
        </span>
      </template>
    </TItembox>
  </div>
</template>
<script lang="ts" setup>
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { getRcStar, getZhElement } from "@utils/toolFunc.js";

type TurAvatarGridProps = { modelValue: Array<TGApp.Game.Record.Avatar> };

const props = defineProps<TurAvatarGridProps>();

function getBoxData(avatar: TGApp.Game.Record.Avatar): TItemBoxData {
  const name = getAvatarName(avatar);
  const isSpecialConstellation = avatar.actived_constellation_num === 6;
  return {
    size: "80px",
    height: "80px",
    ltSize: "20px",
    clickable: false,
    bg: `/icon/bg/${getRcStar(avatar.id, avatar.rarity)}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
    rt:
      avatar.actived_constellation_num > 0
        ? avatar.actived_constellation_num.toString()
        : undefined,
    rtColor: isSpecialConstellation ? "var(--tgc-yellow-1)" : undefined,
    rtSize: "20px",
    innerText: name,
    innerHeight: 20,
    innerBlur: "4px",
    display: "inner",
  };
}

function getAvatarName(avatar: TGApp.Game.Record.Avatar): string {
  let name = avatar.name;
  if (avatar.id === 10000005) name = "旅行者-空";
  if (avatar.id === 10000007) name = "旅行者-荧";
  return name;
}

function getAvatarNameColor(level: number): string | undefined {
  if (level === 95) return "var(--tgc-od-orange)";
  if (level === 100) return "var(--tgc-od-red)";
  return undefined;
}

function getTitle(avatar: TGApp.Game.Record.Avatar): string {
  return `等级：${avatar.level}\n好感：${avatar.fetter}\n角色ID：${avatar.id}`;
}
</script>
<style lang="scss" scoped>
.tur-ag-box {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
