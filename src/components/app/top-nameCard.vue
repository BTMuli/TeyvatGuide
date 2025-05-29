<template>
  <v-list
    class="top-nc-box"
    @click="emit('selected', props.data)"
    :class="{ grey: !props.finish }"
    :title.attr="props.data.name"
  >
    <v-list-item :title="props.data.name">
      <template #subtitle>
        <span class="desc" :title="props.data.desc">{{ props.data.desc }}</span>
      </template>
      <template #prepend>
        <v-img
          width="80px"
          style="margin-right: 8px"
          :src="`/WIKI/nameCard/icon/${props.data.name}.webp`"
        />
      </template>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type TopNameCardProps = { data: TGApp.App.NameCard.Item; finish?: boolean };
type TopNameCardEmits = (e: "selected", v: TGApp.App.NameCard.Item) => void;

const props = withDefaults(defineProps<TopNameCardProps>(), {
  finish: true,
});
const emit = defineEmits<TopNameCardEmits>();

const bgImage = computed<string>(() => {
  if (props.data.name === "原神·印象") return "none;";
  return `url("/WIKI/nameCard/bg/${props.data.name}.webp")`;
});
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.top-nc-box {
  width: 100%;
  height: 80px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px 50px 50px 4px;
  margin-bottom: 8px;
  background-color: var(--box-bg-1);
  background-image: v-bind(bgImage); /* stylelint-disable-line value-keyword-case */
  background-position: right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-family: var(--font-title);
  transition: filter 0.5s ease-in-out;

  &.grey {
    filter: grayscale(1);
  }

  &.grey:hover {
    filter: grayscale(0);
  }

  @include github-styles.github-card-shadow;
}

.dark .top-nc-box {
  @include github-styles.github-card-shadow("dark");
}

.desc {
  text-shadow: 0 0 2px var(--common-shadow-t-8);
}
</style>
