<template>
  <div
    class="tur-hs-box"
    :style="{
      backgroundImage: 'url(' + data.bg + ')',
      backgroundSize: 'cover',
    }"
  >
    <div class="tur-hs-name">
      {{ data.name }}
    </div>
    <div class="tur-hs-title">
      <img :src="data.comfortIcon" alt="comfort">
      {{ data.comfortName }}
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
interface TurHomeSubProps {
  data: TGApp.Sqlite.Record.Home;
}

const props = defineProps<TurHomeSubProps>();
console.log(props.data);
</script>
<style lang="css" scoped>
.tur-hs-box {
  border-radius: 5px;
  position: relative;
}

.tur-hs-name {
  position: absolute;
  top: 10px;
  right: 10px;
  font-family: var(--font-text);
  font-size: 16px;
  color: var(--common-color-white);
  text-shadow: 0 0 10px rgb(0 0 0 / 40%);
}

.tur-hs-title {
  padding: 10px;
  font-family: var(--font-title);
  font-size: 20px;
  display: flex;
  align-items: center;
  color: var(--common-color-white);
  text-shadow: 0 0 10px rgb(0 0 0 / 40%);
}

.tur-hs-title img {
  width: 30px;
  height: 30px;
  margin-right: 5px;
}

.tur-hs-text-grid {
  padding: 10px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  background: rgb(0 0 0 / 20%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  text-align: center;
  color: var(--common-color-white);
}

.tur-hs-text :nth-child(1) {
  font-family: var(--font-text);
  text-shadow: #fec90b 0 0 5px;
}

.tur-hs-text :nth-child(2) {
  font-family: var(--font-title);
  font-size: 16px;
  text-shadow: 0 0 10px rgb(0 0 0 / 40%);
}
</style>
