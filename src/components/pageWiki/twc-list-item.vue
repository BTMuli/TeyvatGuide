<!-- 角色/武器WIKI侧边栏项 -->
<template>
  <div
    :class="props.curItem.id === props.data.id ? 'selected' : ''"
    class="twc-li-box"
    role="button"
    tabindex="0"
    @keydown.enter.self="triggerClick"
    @keydown.space.self.prevent="triggerClick"
  >
    <div class="twc-li-left">
      <img :src="`/icon/bg/${props.data.star}-Star.webp`" alt="" class="bg" />
      <img :alt="props.data.name" :src="`/WIKI/${props.mode}/${props.data.id}.webp`" class="icon" />
    </div>
    <div class="twc-li-main">
      <div :title="props.data.name" class="twc-li-name">{{ props.data.name }}</div>
      <div
        :title="`${props.mode === 'weapon' ? '武器' : '角色'} ID：${props.data.id}`"
        class="twc-li-id"
      >
        #{{ props.data.id }}
      </div>
    </div>
    <div :class="{ 'has-costumes': extraCostumes.length > 0 }" class="twc-li-meta">
      <div v-if="extraCostumes.length > 0" aria-label="额外衣装" class="twc-li-costumes">
        <img
          v-for="costume in extraCostumes"
          :key="costume.id"
          :alt="`${costume.name}衣装`"
          :src="`/WIKI/costume/${costume.id}.webp`"
          :title="costume.name"
        />
      </div>
      <div class="twc-li-attributes">
        <template v-if="props.mode === 'character' && props.data.element !== ''">
          <img
            :alt="props.data.element"
            :src="`/icon/element/${props.data.element}元素.webp`"
            :title="`${props.data.element}元素`"
            class="element"
          />
        </template>
        <img
          :alt="props.data.weapon"
          :src="`/icon/weapon/${props.data.weapon}.webp`"
          :title="props.data.weapon"
          class="weapon"
        />
      </div>
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
type TwcListItemProps = TwcListItemAvatar | TwcListItemWeapon;

const props = defineProps<TwcListItemProps>();
const idColor = computed<string>(() => getOdStarColor(props.data.star));
const extraCostumes = computed<Array<TGApp.App.Character.Costume>>(() => {
  if (props.mode !== "character") return [];
  return props.data.costumes.filter((costume) => !costume.isDefault);
});

function triggerClick(event: KeyboardEvent): void {
  (<HTMLElement>event.currentTarget).click();
}
</script>
<style lang="scss" scoped>
$twc-li-base: v-bind(idColor); /* stylelint-disable-line value-keyword-case */

.twc-li-box {
  position: relative;
  display: flex;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  cursor: pointer;
  gap: 4px;

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-4);
    box-shadow: 0 1px 4px var(--common-shadow-t-2);
  }

  &.selected {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-2);
    box-shadow: 0 1px 4px var(--common-shadow-t-2);
  }

  &:focus-visible {
    outline: 2px solid $twc-li-base;
    outline-offset: 1px;
  }
}

.twc-li-left {
  position: relative;
  overflow: hidden;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bg {
    z-index: 0;
  }

  .icon {
    z-index: 1;
  }
}

.twc-li-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}

.twc-li-name {
  overflow: hidden;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.twc-li-id {
  overflow: hidden;
  color: v-bind(idColor); /* stylelint-disable-line value-keyword-case */
  font-size: 9px;
  font-style: italic;
  line-height: 12px;
  opacity: 0.8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.twc-li-meta {
  display: flex;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  align-items: flex-end;
  justify-content: center;
  padding: 4px;
  gap: 2px;

  &.has-costumes {
    justify-content: space-between;
  }
}

.twc-li-costumes,
.twc-li-attributes {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 2px;
}

.twc-li-costumes {
  height: 20px;

  img {
    width: 20px;
    height: 20px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 2px;
    background: var(--box-bg-2);
    object-fit: cover;
  }
}

.twc-li-attributes {
  height: 14px;

  img {
    width: 14px;
    height: 14px;
  }

  .weapon {
    filter: var(--icon-filter);
  }
}
</style>
