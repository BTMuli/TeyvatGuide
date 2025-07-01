<!-- 怪物Tag -->
<template>
  <div class="tuc-monster-tag-comp" :class="`buff-${props.data.type}`">
    <template v-for="(descItem, idx) in desc" :key="idx">
      <TMiImg
        v-if="descItem.type === 'element'"
        :src="`/icon/element/${getElement(descItem.value)}元素.webp`"
        :alt="getElement(descItem.value)"
      />
      <span v-else>{{ descItem.value }}</span>
    </template>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type TucMonsterTagProps = { data: TGApp.Game.Challenge.MonsterTag };
type MonsterDesc = { type: "element" | "text"; value: string };
const props = defineProps<TucMonsterTagProps>();

const desc: Array<MonsterDesc> = parseDesc(props.data.desc);

function getElement(value: string): string {
  switch (value) {
    case "11001":
      return "冰";
    case "11002":
      return "水";
    case "11003":
      return "火";
    case "11004":
      return "雷";
    case "11005":
      return "风";
    case "11006":
      return "岩";
    case "11007":
      return "草";
    default:
      return value;
  }
}

function parseDesc(desc: string): Array<MonsterDesc> {
  const regex = /{SPRITE_PRESET#(\d+)}([^{}]*)/g;
  const result: Array<MonsterDesc> = [];
  let match;
  while ((match = regex.exec(desc)) !== null) {
    if (match[1]) {
      result.push({ type: "element", value: match[1] });
    }
    if (match[2]) {
      result.push({ type: "text", value: match[2].trim() });
    }
  }
  return result;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tuc-monster-tag-comp {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 16px;
  column-gap: 2px;

  img {
    width: 16px;
    height: 16px;
  }

  span {
    color: var(--box-text-1);
    font-family: var(--font-title);
    font-size: 12px;
    line-height: 16px;
  }

  &.buff-0 {
    @include github-styles.github-tag-dark-gen(#e06c75);
  }

  &.buff-1 {
    @include github-styles.github-tag-dark-gen(#98c379);
  }
}
</style>
