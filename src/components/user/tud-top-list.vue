<template>
  <div class="tud-tl-box">
    <div class="tud-tl-icon">
      <slot name="icon"></slot>
    </div>
    <div class="tud-tl-lcontent">
      <div class="tud-tl-title">
        <slot name="title"></slot>
      </div>
      <div class="tud-tl-subtitle">
        <slot name="subtitle"></slot>
      </div>
    </div>
    <div class="tud-tl-rcontent">
      <slot name="rcontent"></slot>
    </div>
  </div>
</template>
<style lang="css" scoped>
.tud-tl-box {
  display: flex;
  width: 100%;
  height: 20px;
  align-items: center;
  justify-content: space-between;
  border: 1px inset var(--common-color-grey);
}
</style>
