<template>
  <div class="tsl-box">
    <img src="@/assets/icons/arrow-right.svg" alt="right" />
    <slot></slot>
  </div>
</template>
<style lang="css" scoped>
.tsl-box {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  font-family: var(--font-title);
  gap: 4px;
}

.tsl-box :first-child {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  padding: 2px;
  filter: invert(0.75);
}

.dark .tsl-box :first-child {
  filter: none;
}
</style>
