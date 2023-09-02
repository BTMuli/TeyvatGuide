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
import { computed } from "vue";
import TibAbyssOverview from "../itembox/tib-abyss-overview.vue";

interface TAOProps {
  title: string;
  valText?: string | number;
  valIcons?: string;
  multi4?: boolean;
}

const props = defineProps<TAOProps>();
const getIconNum = computed(() => (props.multi4 ? 4 : 1));
</script>
<style lang="css" scoped>
.tuao-box {
  display: flex;
  width: 100%;
  height: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-2);
}

.tuao-title {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 20px;
}

.tuao-val-text {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
  font-size: 20px;
}

.tuao-val-icons {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(v-bind(getIconNum), 1fr);
}
</style>
