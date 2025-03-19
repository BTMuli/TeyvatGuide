<template>
  <div class="tur-hs-box">
    <div class="bg">
      <img :src="data.bg" alt="bg" />
    </div>
    <div class="tur-hs-top">
      <div class="tur-hs-title">
        <img :src="data.comfortIcon" alt="icon" />
        <span>{{ data.comfortName }}</span>
      </div>
      <div class="tur-hs-name">{{ data.name }}</div>
    </div>
    <div class="tur-hs-text-grid">
      <div class="tur-hs-text">
        <div>{{ data.level }}</div>
        <div>信任等阶</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.comfort }}</div>
        <div>最高洞天仙力</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.furniture }}</div>
        <div>获得摆设数</div>
      </div>
      <div class="tur-hs-text">
        <div>{{ data.visit }}</div>
        <div>历史访客数</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
defineProps<{ data: TGApp.Sqlite.Record.Home }>();
</script>
<style lang="css" scoped>
.tur-hs-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
}

.bg {
  position: absolute;
  z-index: 0;
  right: 0;
  object-fit: cover;
}

.tur-hs-top {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
}

.tur-hs-name {
  color: var(--tgc-white-1);
  font-family: var(--font-text);
  font-size: 16px;
  text-shadow: 0 0 4px var(--tgc-yellow-1);
}

.tur-hs-title {
  display: flex;
  align-items: center;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 18px;
  text-shadow: 0 0 4px var(--tgc-yellow-1);
}

.tur-hs-title img {
  width: 24px;
  height: 24px;
  margin-right: 4px;
}

.tur-hs-text-grid {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 8px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  color: var(--tgc-white-1);
  text-align: center;
}

.tur-hs-text :nth-child(1) {
  color: var(--tgc-yellow-1);
  font-family: var(--font-text);
}

.tur-hs-text :nth-child(2) {
  font-family: var(--font-title);
  font-size: 16px;
}
</style>
