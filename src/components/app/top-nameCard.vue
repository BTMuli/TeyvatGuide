<!-- 名片栏组件 -->
<template>
  <div
    class="top-nc-box"
    @click="emit('selected', props.data)"
    :class="props.finish ? '' : 'grey'"
    :title.attr="props.data.name"
    :style="{ backgroundImage: `url('/WIKI/nameCard/bg/${props.data.name}.webp')` }"
  >
    <div class="top-nc-bgc" />
    <div class="top-nc-prepend">
      <img :src="`/WIKI/nameCard/icon/${props.data.name}.webp`" alt="icon" />
    </div>
    <div class="top-nc-info">
      <div class="top-nc-title">
        <TwnTypeTag :type="props.data.type" />
        <span>{{ props.data.name }}</span>
      </div>
      <div class="top-nc-desc">
        <span class="desc" :title="props.data.desc">{{ props.data.desc }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TwnTypeTag from "@comp/pageWiki/twn-type-tag.vue";

type TopNameCardProps = { data: TGApp.App.NameCard.Item; finish?: boolean };
type TopNameCardEmits = (e: "selected", v: TGApp.App.NameCard.Item) => void;

const props = withDefaults(defineProps<TopNameCardProps>(), { finish: true });
const emit = defineEmits<TopNameCardEmits>();
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.top-nc-box {
  @include github-styles.github-card-shadow;

  position: relative;
  display: flex;
  width: 100%;
  height: 80px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px 50px 50px 4px;
  background-color: var(--box-bg-1);
  background-position: right;
  background-repeat: no-repeat;
  column-gap: 8px;
  cursor: pointer;
  font-family: var(--font-title);
  transition: filter 0.5s ease-in-out;

  &.grey {
    filter: grayscale(1);
  }

  &.grey:hover {
    filter: grayscale(0);
  }
}

.dark .top-nc-box {
  @include github-styles.github-card-shadow("dark");
}

.top-nc-bgc {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, var(--box-bg-1) 40%, transparent 75%);
}

.top-nc-prepend {
  position: relative;
  z-index: 1;
  display: flex;
  height: 60px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-left: 8px;

  img {
    height: 60px;
    aspect-ratio: 23/15;
  }
}

.top-nc-info {
  position: relative;
  z-index: 1;
  display: flex;
  overflow: hidden;
  height: 100%;
  flex-direction: column;
  flex-grow: 1;
  align-items: flex-start;
  justify-content: center;
  margin-right: 8px;
}

.top-nc-title {
  display: flex;
  align-items: center;
  column-gap: 4px;
  font-size: 16px;
}

.top-nc-desc {
  position: relative;
  overflow: hidden;
  max-width: calc(100% - 16px);
  font-size: 14px;
  opacity: 0.75;
  text-overflow: ellipsis;
  text-shadow: 0 0 2px var(--box-bg-1);
  white-space: nowrap;
}
</style>
