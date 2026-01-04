<!-- 角色/武器WIKI侧边栏项 -->
<template>
  <div :class="{ selected: props.curItem.id === props.data.id }" class="twc-li-box">
    <div class="twc-li-left">
      <img :src="`/icon/bg/${props.data.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/WIKI/${props.mode}/${props.data.id}.webp`" alt="icon" class="icon" />
    </div>
    <div :title="props.data.name" class="twc-li-right">{{ props.data.name }}</div>
    <div
      :title="`${props.mode === 'weapon' ? '武器' : '角色'}ID:${props.data.id}`"
      class="twc-li-id"
    >
      {{ props.data.id }}
    </div>
    <div class="twc-li-icons">
      <template v-if="props.mode === 'character'">
        <img
          :src="`/icon/element/${props.data.element}元素.webp`"
          :title="`${props.data.element}元素`"
          alt="element"
          class="element"
        />
      </template>
      <img
        :src="`/icon/weapon/${props.data.weapon}.webp`"
        :title="props.data.weapon"
        alt="weapon"
        class="weapon"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed } from "vue";

/** 角色数据 */
type TwcListItemAvatar = {
  mode: "character";
  data: TGApp.App.Character.WikiBriefInfo;
  curItem: TGApp.App.Character.WikiBriefInfo;
};
/** 武器数据 */
type TwcListItemWeapon = {
  mode: "weapon";
  data: TGApp.App.Weapon.WikiBriefInfo;
  curItem: TGApp.App.Weapon.WikiBriefInfo;
};
type TwcListItemProps = (TwcListItemAvatar | TwcListItemWeapon) & {
  width?: number;
};

const props = defineProps<TwcListItemProps>();
const idColor = computed<string>(() => getOdStarColor(props.data.star));
</script>
<style lang="scss" scoped>
.twc-li-box {
  position: relative;
  display: flex;
  height: 40px;
  box-sizing: border-box;
  align-items: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  cursor: pointer;
  gap: 4px;

  &.selected {
    background: var(--box-bg-2);
  }
}

.twc-li-left {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    border-bottom-left-radius: 4px;
    border-top-left-radius: 4px;

    img {
      width: 100%;
      height: 100%;
      border-bottom-left-radius: 4px;
      border-top-left-radius: 4px;
      object-fit: cover;
    }
  }

  .bg {
    z-index: 0;
  }

  .icon {
    z-index: 1;
  }
}

.twc-li-right {
  overflow: hidden;
  padding-right: 8px;
  color: var(--app-page-content);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.twc-li-id {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: v-bind(idColor); /* stylelint-disable-line value-keyword-case */
  font-size: 6px;
  font-style: italic;
  opacity: 0.8;
}

.twc-li-icons {
  position: absolute;
  z-index: 1;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 16px;
    height: 16px;
  }

  .weapon {
    filter: invert(60%);
  }
}

.dark .twc-li-icons .weapon {
  filter: none;
}
</style>
