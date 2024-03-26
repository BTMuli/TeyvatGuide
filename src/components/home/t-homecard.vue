<template>
  <div class="thc-container">
    <div class="thc-title">
      <slot name="title"></slot>
    </div>
    <div class="thc-append" v-if="props.append">
      <slot name="title-append"></slot>
    </div>
    <div class="thc-box">
      <slot name="default"></slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface THomecardProps {
  append?: boolean;
}

const props = defineProps<THomecardProps>();
</script>
<style lang="css" scoped>
.thc-container {
  position: relative;
  min-height: 100px;
  padding: 20px 10px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-top: 30px;
  box-shadow: 5px 5px 10px var(--common-shadow-2);
}

.thc-title,
.thc-append {
  position: absolute;
  top: -20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 5px;
  background: var(--box-bg-blue);
  box-shadow: 0 0 5px var(--common-shadow-2);
  font-family: var(--font-title);
  font-size: 20px;
}

.thc-title {
  left: 10px;
}

.thc-append {
  right: 10px;
}
</style>
