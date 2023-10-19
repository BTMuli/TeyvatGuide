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
  border: 1px solid rgb(0 0 0 /40%);
  border-radius: 5px;
  background: var(--tgc-white-1);
}

.tuc-dd-title {
  width: 100%;
  color: var(--tgc-dark-1);
  font-family: var(--font-title);
  font-size: 20px;
  text-align: left;
}

.tuc-dd-divider {
  width: 100%;
  height: 1px;
  margin: 5px 0;
  background: var(--tgc-dark-1);
  opacity: 0.5;
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
  max-height: 50px;
  margin-top: 5px;
  color: var(--tgc-dark-1);
  font-family: var(--font-text);
  font-size: 14px;
  overflow-x: hidden;
  text-align: left;
  word-break: break-all;
}

/* 隐藏 desc 侧面滚动条 */
.tuc-dd-desc::-webkit-scrollbar {
  display: none;
}
</style>
