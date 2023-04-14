<template>
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <!-- 底层背景图 -->
      <div class="card-bg">
        <img :src="item.bg" alt="bg">
      </div>
      <!-- 中层角色图 -->
      <div class="card-icon">
        <img :src="item.icon" alt="icon">
      </div>
      <!-- 上层图标&内容 -->
      <div class="card-cover">
        <div class="card-element">
          <img :src="item.element" alt="element">
        </div>
        <div class="card-weapon">
          <img :src="item.weapon" alt="weapon">
        </div>
        <div class="card-name">
          <span>{{ item.name }}</span>
        </div>
      </div>
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error">
      该角色暂无详情
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
// utils
// import { createTGWindow } from "../../utils/TGWindow";
import { TGAppData } from "../../data";

// snackbar
const snackbar = ref(false);
// data
const cardsInfo = ref([] as BTMuli.Genshin.Wiki.Character.BriefInfo[]);

onMounted(async () => {
  cardsInfo.value = TGAppData.character;
});

function toOuter (item: BTMuli.Genshin.Wiki.Character.BriefInfo) {
  if (item.content_id === null) {
    snackbar.value = true;
    // return;
  }
  // createTGWindow("character", item.id);
}

</script>
<style scoped>
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  grid-gap: 10px;
  padding: 10px;
}

.card-box {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
}

.card-icon {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 10px;
}

.card-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.card-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  border-top-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-element img {
  width: 30px;
  height: 30px;
  object-fit: cover;
}

.card-weapon {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  border-top-right-radius: 10px;
  border-bottom-left-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-weapon img {
  width: 30px;
  height: 30px;
  object-fit: cover;
}

.card-name {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  color: #fff;
  font-size: 20px;
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}
</style>
