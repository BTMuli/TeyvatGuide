<template>
  <div class="hta-tl-box">
    <div class="hta-tl-item">
      <TibWikiAbyss2
        v-for="item in props.modelValue.Item.split(',')"
        :key="item"
        :model-value="item"
      />
    </div>
    <div class="hta-tl-rate">上场{{ props.modelValue.Rate }}次</div>
  </div>
</template>
<script lang="ts" setup>
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTeamLineProps {
  modelValue: { Item: string; Rate: number };
}

const props = defineProps<HtaTeamLineProps>();
</script>
<style lang="css" scoped>
.hta-tl-box {
  position: relative;
  display: flex;
  width: calc(100% - 20px);
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin: 10px;
  background: var(--box-bg-2);
}

.hta-tl-item {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.hta-tl-rate {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}
</style>
