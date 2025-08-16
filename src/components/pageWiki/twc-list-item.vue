<template>
  <div class="twc-li-box">
    <div class="twc-li-left">
      <!-- TODO: 角色添加元素&武器类型，武器添加类型 -->
      <img class="twc-li-bg" :src="`/icon/bg/${props.data.star}-Star.webp`" alt="bg" />
      <img class="twc-li-icon" :src="`/WIKI/${props.mode}/${props.data.id}.webp`" alt="icon" />
    </div>
    <div class="twc-li-right" :title="props.data.name">{{ props.data.name }}</div>
  </div>
</template>
<script lang="ts" setup>
type TwcListItemProps =
  | {
      mode: "character";
      data: TGApp.App.Character.WikiBriefInfo;
      curItem: TGApp.App.Character.WikiBriefInfo;
    }
  | {
      mode: "weapon";
      data: TGApp.App.Weapon.WikiBriefInfo;
      curItem: TGApp.App.Weapon.WikiBriefInfo;
    };

const props = defineProps<TwcListItemProps>();
</script>
<style lang="scss" scoped>
.twc-li-box {
  position: relative;
  display: flex;
  height: 45px;
  align-items: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: v-bind("props.data.id === props.curItem.id ? 'var(--box-bg-2)' : 'var(--box-bg-1)'");
  cursor: pointer;
  gap: 10px;
}

.twc-li-left {
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twc-li-bg,
.twc-li-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twc-li-bg img,
.twc-li-icon img {
  width: 100%;
  height: 100%;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
  object-fit: cover;
}

.twc-li-right {
  overflow: hidden;
  color: var(--app-page-content);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
