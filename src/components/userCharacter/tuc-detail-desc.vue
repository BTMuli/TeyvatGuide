<template>
  <div class="tuc-dd-box">
    <div class="tuc-dd-title">
      <slot name="title" />
    </div>
    <div class="tuc-dd-divider" />
    <div class="tuc-dd-content">
      <slot name="content" />
    </div>
    <div class="tuc-dd-desc">
      <slot name="desc" />
    </div>
  </div>
</template>
<style lang="css" scoped>
.tuc-dd-box {
  padding: 10px;
  border: 2px solid var(--common-color-grey-2);
  border-radius: 5px;
  backdrop-filter: blur(20px);
  background: rgb(255 255 255 / 20%);
}

.tuc-dd-title {
  width: 100%;
  color: var(--common-color-blue);
  font-family: var(--font-title);
  font-size: 20px;
  text-align: left;
}

.tuc-dd-divider {
  width: 100%;
  height: 2px;
  margin: 5px 0;
  background: var(--common-color-grey-2);
}

.tuc-dd-content {
  display: flex;
  height: 60px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
}

.tuc-dd-desc {
  overflow: hidden;
  width: 100%;
  max-height: 50px;
  margin-top: 5px;
  color: var(--common-color-black);
  font-family: var(--font-text);
  font-size: 14px;
  overflow-y: scroll;
  text-align: left;
  word-break: break-all;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
