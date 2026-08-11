<!-- 标题栏组件 -->
<template>
  <div class="tsl-box">
    <slot name="icon">
      <v-icon aria-hidden="true" class="tsl-icon" icon="mdi-chevron-right" />
    </slot>
    <slot></slot>
  </div>
</template>
<style lang="css" scoped>
.tsl-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  font-family: var(--font-title);
  gap: 4px;
}

.tsl-icon {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  padding: 2px;
  color: var(--box-text-2);
}
</style>
