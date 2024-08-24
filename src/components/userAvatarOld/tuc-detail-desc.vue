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
  width: 100%;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-2);
}

.tuc-dd-title {
  width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  text-align: left;
}

.tuc-dd-divider {
  width: 100%;
  height: 1px;
  margin: 5px 0;
  background: var(--common-shadow-2);
}

.tuc-dd-content {
  display: flex;
  height: 60px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: start;
}

.tuc-dd-desc {
  width: 100%;
  height: 80px;
  margin-top: 5px;
  color: var(--box-text-4);
  font-family: var(--font-text);
  font-size: 14px;
  overflow-x: hidden;
  text-align: left;
  word-break: break-all;
}
</style>
