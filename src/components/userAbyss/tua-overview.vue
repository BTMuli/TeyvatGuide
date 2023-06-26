<template>
  <div class="tuao-box">
    <div class="tuao-title">
      <slot name="title">
        {{ props.title }}
      </slot>
    </div>
    <div v-if="props.valText" class="tuao-val-text">
      <slot name="val-text">
        {{ props.valText }}
      </slot>
    </div>
    <div v-if="props.valIcons" class="tuao-val-icons">
      <slot name="val-icons">
        <TibAbyssOverview
          v-for="avatar in JSON.parse(props.valIcons) as TGApp.Sqlite.Abyss.Character[]"
          :key="avatar.id"
          :model-value="avatar"
        />
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import TibAbyssOverview from "../itembox/tib-abyss-overview.vue";

interface TAOProps {
  title: string;
  valText?: string | number;
  valIcons?: string;
  iconNum: number;
}

const props = withDefaults(defineProps<TAOProps>(), {
  iconNum: 1,
});
</script>
<style lang="css" scoped>
.tuao-box {
  width: 100%;
  height: auto;
  padding: 10px;
  border-radius: 5px;
  background: var(--common-shadow-1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tuao-title {
  font-family: var(--font-title);
  font-size: 20px;
  color: var(--common-text-content);
}

.tuao-val-text {
  font-family: var(--font-text);
  font-size: 20px;
  color: var(--common-color-white);
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .tuao-val-text {
  color: var(--common-color-yellow);
  text-shadow: none;
}

.tuao-val-icons {
  display: grid;
  grid-template-columns: repeat(v-bind(iconNum), 1fr);
  column-gap: 10px;
}
</style>
