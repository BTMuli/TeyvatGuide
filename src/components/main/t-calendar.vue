<template>
  <div class="calendar-box">
    <div class="calendar-title">
      <div class="calendar-title-left">
        <v-icon size="small">
          mdi-calendar-clock
        </v-icon>
        <span>今日素材</span>
        <span>{{ dateNow }}</span>
      </div>
      <div class="calendar-title-right">
        <v-btn
          v-for="text of btnText"
          :key="text.week"
          class="calendar-title-btn"
          :style="{
            boxShadow: text.week === weekNow ? '0 0 5px #FEC90B' : 'none',
            background: text.week === btnNow ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
          }"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </div>
    </div>
    <div class="calendar-divider" />
    <div class="calendar-sub">
      <div class="calendar-sub-title">
        <img src="/src/assets/icons/arrow-right.svg" alt="character">
        <span>角色突破</span>
      </div>
      <div class="cards-grid">
        <div
          v-for="item in characterCards"
          :key="item.id"
          class="card-box"
          @click="selectContent(item, 'character')"
        >
          <TMiniAvatar size="100px" :model-value="item" />
        </div>
      </div>
    </div>
    <div class="calendar-sub">
      <div class="calendar-sub-title">
        <img src="/src/assets/icons/arrow-right.svg" alt="character">
        <span>武器突破</span>
      </div>
      <div class="cards-grid">
        <div
          v-for="item in weaponCards"
          :key="item.id"
          class="card-box"
          @click="selectContent(item, 'weapon')"
        >
          <TMiniWeapon size="100px" :model-value="item" />
        </div>
      </div>
    </div>
    <v-snackbar v-model="snackbar" :timeout="1500" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
    <v-overlay v-model="showItem">
      <div class="calendar-item-box">
        <div class="calendar-item-top">
          <div class="calendar-item-icon">
            <TMiniAvatar v-if="selectedType=== 'character'" :model-value="selectedItem" size="100px" />
            <TMiniWeapon v-if="selectedType=== 'weapon'" :model-value="selectedItem" size="100px" />
          </div>
          <div class="calendar-item-content">
            <div v-for="item in selectedItem.materials" class="calendar-item-sub">
              <TCalendarMaterial :item="item" />
            </div>
          </div>
        </div>
        <div class="calendar-item-line">
          <img src="/source/UI/item-line.webp" alt="line">
        </div>
        <div class="calendar-item-bottom">
          <div class="calendar-item-source">
            <div class="calendar-source-text">
              来源：
            </div>
            <img :src="`/icon/nation/${selectedItem.source.area}.webp`" alt="icon">
            <div class="calendar-source-text">
              {{ selectedItem.source.area }} - {{ selectedItem.source.name }}
            </div>
          </div>
          <div class="detail-btn">
            <v-btn @click="showDetail(selectedItem)">
              <template #append>
                <img src="../../assets/icons/arrow-right.svg" alt="right">
              </template>
              详情
            </v-btn>
          </div>
        </div>
      </div>
      <div class="calendar-item-close" @click="showItem = false">
        <v-icon>mdi-close</v-icon>
      </div>
    </v-overlay>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TMiniAvatar from "../mini/t-mini-avatar.vue";
import TMiniWeapon from "../mini/t-mini-weapon.vue";
import TCalendarMaterial from "../mini/t-calendar-material.vue";
// data
import { AppCalendarData } from "../../data";
// interface
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";
import { createTGWindow } from "../../utils/TGWindow";

// loading
const loading = ref(true as boolean);

// data
const calendarData = computed(() => AppCalendarData);
const weekNow = ref(0 as number);
const btnNow = ref(0 as number);
const dateNow = ref(new Date().toLocaleDateString());

// calendar
const calendarNow = ref([] as TGApp.App.Calendar.Item[]);
const characterCards = ref([] as TGApp.App.Calendar.Item[]);
const weaponCards = ref([] as TGApp.App.Calendar.Item[]);

// calendar item
const showItem = ref(false as boolean);
const selectedItem = ref({} as TGApp.App.Calendar.Item);
const selectedType = ref("character");

// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

const btnText = [
  {
    week: 7,
    text: "周日",
  },
  {
    week: 1,
    text: "周一",
  },
  {
    week: 2,
    text: "周二",
  },
  {
    week: 3,
    text: "周三",
  },
  {
    week: 4,
    text: "周四",
  },
  {
    week: 5,
    text: "周五",
  },
  {
    week: 6,
    text: "周六",
  },
];
// expose
defineExpose({
  name: "素材日历",
  loading,
});

onMounted(() => {
  const dayNow = (new Date().getDay()) === 0 ? 7 : (new Date().getDay());
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarNow.value = getCalendar(dayNow);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
  loading.value = false;
});

// 获取当前日历
function getCalendar (day: number) {
  return calendarData.value.filter((item) => item.dropDays.includes(day));
}

function selectContent (item: TGApp.App.Calendar.Item, type: string) {
  selectedItem.value = item;
  selectedType.value = type;
  showItem.value = true;
}

function showDetail (item: TGApp.App.Calendar.Item) {
  if (item.contentId === 0) {
    snackbarText.value = "暂无详情";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.contentId.toString());
  createTGWindow(url, "素材详情", item.name, 1200, 800, true);
}

function getContents (day: number) {
  btnNow.value = day;
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.filter((item) => item.itemType === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.itemType === "weapon");
}
</script>
<style lang="css" scoped>
.calendar-box {
  margin-bottom: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
  border-radius: 5px;
}

.calendar-title {
  height: 45px;
  font-size: 20px;
  display: flex;
  color:rgba(255, 255, 255, 0.8);
}

.calendar-title-left {
  width: 20%;
  height: 45px;
  font-family: Genshin, serif;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
}

.calendar-title-left span {
  margin-left: 10px;
}

.calendar-title-right {
  width: 80%;
  font-family: Genshin-Light, serif;
  height: 45px;
}

.calendar-title-btn {
    margin-left: 10px;
    border-radius: 5px;
}

.calendar-divider {
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.4);
}

.calendar-sub {
    margin: 5px;
}

.calendar-sub-title {
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  margin: 5px 0;
  border-radius: 5px;
  font-family: Genshin-Light, serif;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
}

.calendar-sub-title img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-gap: 8px;
}

/* overlay 盒子 */
.calendar-item-box {
    position: absolute;
    width: 440px;
    height: 200px;
    color: #faf7e8;
    top: calc(50vh - 100px);
    left: calc(50vw - 220px);
    background: var(--content-bg-2);
    border-radius: 10px;
    padding: 10px;
    align-items: center;
}

.calendar-item-top {
  height: 100px;
  width: 100%;
  display: flex;
}

.calendar-item-icon {
    height: 100px;
    width: 100px;
}

.calendar-item-content {
    margin-left: 10px;
    font-family: Genshin, serif;
    color: var(--content-bg-1);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: 10px;
		row-gap: 10px;
}

.calendar-item-sub {
  width: 150px;
  height: 45px;
	border-radius: 10px;
}

.calendar-item-sub img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 10px;
}

.calendar-item-line {
    width: 420px;
}

.calendar-item-line img {
    width: 100%;
    height: auto;
}

.calendar-item-bottom {
  background: rgb(0 0 0 / 30%);
  padding: 3px 10px;
  width: 420px;
  height: 56px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-item-bottom img {
  width: 50px;
  height: 50px;
}

.calendar-item-source {
  width: 300px;
  height: 50px;
  display: flex;
  justify-content: left;
  align-items: center;
}

.calendar-source-text {
  height: 50px;
  font-size: 20px;
  font-family: Genshin-Light, serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-btn {
  font-family: Genshin, serif;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
  transition: all 0.3s linear;
}

.detail-btn button {
  background: var(--btn-bg-1);
  color: #faf7e8;
}

.detail-btn button img {
  width: 18px;
  height: 18px;
}

.calendar-item-close {
    position: absolute;
    top: calc(50vh + 120px);
    left: calc(50vw - 15px);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    background: var(--content-bg-2);
    color: #546D8B;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
