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
  border-radius: 5px;
  border: 2px solid var(--common-color-grey-2);
  background: rgb(255 255 255 / 20%);
  backdrop-filter: blur(20px);
}

.tuc-dd-title {
  font-family: var(--font-title);
  font-size: 20px;
  color: var(--common-color-blue);
  width: 100%;
  text-align: left;
}

.tuc-dd-divider {
  width: 100%;
  height: 2px;
  background: var(--common-color-grey-2);
  margin: 5px 0;
}

.tuc-dd-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: start;
  align-items: center;
  height: 60px;
}

.tuc-dd-desc {
  font-family: var(--font-text);
  font-size: 14px;
  margin-top: 5px;
  color: var(--common-color-black);
  width: 100%;
  text-align: left;
  word-break: break-all;
  max-height: 50px;
  overflow: hidden;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
