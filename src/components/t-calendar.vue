<template>
  <v-list class="calendar-card">
    <v-list-item>
      <v-list-item-title style="color: #fec90b; margin-left: 10px; margin-bottom: 10px; font-family: Genshin, serif">
        <v-icon color="#EBD49E">
          mdi-calendar-clock
        </v-icon> 今日素材
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
              @click="showContent(item)"
            >
              <div class="card-bg">
                <img :src="item.bg" alt="bg">
              </div>
              <div class="card-icon">
                <img :src="item.icon" alt="icon">
              </div>
              <div class="card-cover">
                <div class="card-element">
                  <img :src="item.element" alt="element">
                </div>
                <div class="card-name">
                  <img :src="item.weapon_type" alt="weapon">
                  <span>{{ item.name }}</span>
                </div>
              </div>
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
              @click="showContent(item)"
            >
              <div class="card-bg">
                <img :src="item.bg" alt="bg">
              </div>
              <div class="card-icon">
                <img :src="item.icon" alt="icon">
              </div>
              <div class="card-cover">
                <div class="card-type">
                  <img :src="item.weapon_type" alt="element">
                </div>
                <div class="card-name">
                  <span>{{ item.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-list-item>
    <v-snackbar v-model="snackbar" :timeout="1500" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-list>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
// data
import { TGAppData } from "../data";
// interface
import { OBC_CONTENT_API } from "../plugins/Mys/interface/utils";
import { createTGWindow } from "../utils/TGWindow";

// loading
const loading = ref(true as boolean);

// data
const calendarData = ref(TGAppData.calendar);
const weekNow = ref(0 as number);
const btnNow = ref(0 as number);
const dateNow = ref(new Date().toLocaleDateString());
const calendarNow = ref([] as BTMuli.Genshin.Calendar.Data[]);
const characterCards = ref({} as Record<number, BTMuli.Genshin.Calendar.Data>);
const weaponCards = ref({} as Record<number, BTMuli.Genshin.Calendar.Data>);

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
  characterCards.value = calendarNow.value.filter((item) => item.item_type === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.item_type === "weapon");
  loading.value = false;
});

// 获取当前日历
function getCalendar (day: number) {
  return calendarData.value.filter((item) => item.drop_day.includes(day));
}

function showContent (item: BTMuli.Genshin.Calendar.Data) {
  if (item.content_id === null) {
    snackbarText.value = "暂无详情";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.content_id.toString());
  createTGWindow(url, "素材详情", item.name, 1200, 800, true);
}

function getContents (day: number) {
  btnNow.value = day;
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.filter((item) => item.item_type === "character");
  weaponCards.value = calendarNow.value.filter((item) => item.item_type === "weapon");
}
</script>
<style lang="css" scoped>
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
  margin:5px;
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

.card-box {
  position: relative;
  width: 100px;
  height: 100px;
  cursor: pointer;
}

.card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  overflow: hidden;
}

.card-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-icon {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 5px;
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
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.card-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-element img {
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.card-weapon img {
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.card-type {
  position: absolute;
  top: 0;
  left: 0;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-type img {
  width: 20px;
  height: 20px;
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
  background: rgb(20 20 20 / 50%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: #fff;
  font-size: 8px;
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}

.card-name img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}
</style>
