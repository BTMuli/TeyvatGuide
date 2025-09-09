<template>
  <div class="twn-type-tag" :class="typeCls">
    {{ props.type }}
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type TwnTypeTagProps = { type: string };

const props = defineProps<TwnTypeTagProps>();

const typeCls = computed<string>(() => {
  switch (props.type) {
    case "成就":
      return "achi";
    case "好感":
      return "fetter";
    case "活动":
      return "act";
    case "纪行":
      return "journey";
    case "声望":
      return "pop";
    default:
      return "default";
  }
});
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.twn-type-tag {
  padding: 0 4px;
  border-radius: 4px;
  font-size: 12px;

  &.achi {
    @include github-styles.github-tag-dark-gen(#4db6ac);
  }

  &.fetter {
    @include github-styles.github-tag-dark-gen(#ba68c8);
  }

  &.act {
    @include github-styles.github-tag-dark-gen(#81c784);
  }

  &.journey {
    @include github-styles.github-tag-dark-gen(#64b5f6);
  }

  &.pop {
    @include github-styles.github-tag-dark-gen(#e57373);
  }

  &.default {
    @include github-styles.github-tag-dark-gen(#ffb74d);
  }
}
</style>
