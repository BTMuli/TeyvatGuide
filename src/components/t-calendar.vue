<template>
  <v-list class="calendar-card">
    <v-list-item>
      <v-list-item-title style="color: #fec90b; margin-left: 10px; margin-bottom: 10px; font-family: Genshin, serif">
        <v-icon color="#EBD49E">
          mdi-calendar-clock
        </v-icon>
        今日素材
        <span style="color: #faf7e8">{{ dateNow }}</span>
        <v-btn
          v-for="text of btnText"
          :key="text.week"
          class="calendar-btn"
          :style="{
            border: text.week === weekNow ? '2px solid var(--btn-bg-1)' : '0',
            background: text.week === btnNow ? 'var(--btn-bg-1)' : 'var(--calendar-btn-bg)',
            color: '#faf7e8',
            marginBottom: '1px'
          }"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </v-list-item-title>
      <div class="calendar-box">
        <div class="calendar-single">
          <div class="calendar-title">
            天赋培养
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
        <div class="calendar-single">
          <div class="calendar-title">
            武器突破
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
      </div>
    </v-list-item>
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
                <img src="../assets/icons/arrow-right.svg" alt="right">
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
  </v-list>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TMiniAvatar from "./t-mini-avatar.vue";
import TMiniWeapon from "./t-mini-weapon.vue";
import TCalendarMaterial from "./t-calendar-material.vue";
// data
import { AppCalendarData } from "../data";
// interface
import { OBC_CONTENT_API } from "../plugins/Mys/interface/utils";
import { createTGWindow } from "../utils/TGWindow";

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
/* calendar 大盒子 */
.calendar-card {
    margin-top: 10px;
    font-family: Genshin-Light, serif;
    background: var(--content-bg-1);
    border-radius: 10px;
}

.calendar-btn {
    margin-left: 10px;
    font-family: Genshin-Light, serif;
    color: var(--btn-text-1);
    border-radius: 10px;
}

.calendar-box {
    margin: 5px;
}

.calendar-single {
    margin-bottom: 10px;
    background: var(--content-bg-2);
    color: var(--content-bg-1);
    border-radius: 10px;
}

.calendar-title {
    font-size: 1.5rem;
    font-family: Genshin, serif;
    color: #546D8B;
    padding-left: 15px;
    padding-top: 10px;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-gap: 10px;
    padding: 10px;
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
