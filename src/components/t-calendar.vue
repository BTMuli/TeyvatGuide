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
            border: text.week === weekNow ? '2px solid #fec90b' : '0',
            background: text.week === btnNow ? '#fec90b' : '#4A5366',
          }"
          @click="getContents(text.week)"
        >
          {{ text.text }}
        </v-btn>
      </v-list-item-title>
      <div v-if="!loading" class="calendar-box">
        <div class="calendar-single">
          <div class="card-title">
            天赋培养
          </div>
          <div class="calendar-grid">
            <div
              v-for="character of characterCards"
              :key="character.title"
              class="calendar-content"
            >
              <div class="content-title">
                {{ character.title }}
              </div>
              <div class="content-material">
                <v-img
                  v-for="material of character.materials"
                  :key="material.content_id"
                  alt="material.content_id"
                  :src="material.icon"
                  class="calendar-icon"
                  @click="showContent(material)"
                />
              </div>
              <div class="content-detail">
                <v-img
                  v-for="content of character.contents"
                  :key="content.content_id"
                  alt="content.content_id"
                  :src="content.icon"
                  class="calendar-icon"
                  @click="showContent(content)"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="calendar-single">
          <div class="card-title">
            武器突破
          </div>
          <div class="calendar-grid">
            <div
              v-for="weapon of weaponCards"
              :key="weapon.title"
              class="calendar-content"
            >
              <div class="content-title">
                {{ weapon.title }}
              </div>
              <div class="content-material">
                <v-img
                  v-for="material of weapon.materials"
                  :key="material.content_id"
                  alt="material.content_id"
                  :src="material.icon"
                  class="calendar-icon"
                  @click="showContent(material)"
                />
              </div>
              <div class="content-detail">
                <v-img
                  v-for="content of weapon.contents"
                  :key="content.content_id"
                  alt="content.content_id"
                  :src="content.icon"
                  class="calendar-icon"
                  @click="showContent(content)"
                />
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
import { TGAppData } from "../data/index";
// interface
import { OBC_CONTENT_API } from "../plugins/Mys/interface/utils";
import { createTGWindow } from "../utils/TGWindow";

// loading
const loading = ref(true as boolean);

// data
const calendarData = ref(TGAppData.calendar as Record<number, BTMuli.Genshin.Calendar.Data>);
const weekNow = ref(0 as number);
const btnNow = ref(0 as number);
const dateNow = ref(new Date().toLocaleDateString());
const calendarNow = ref({} as BTMuli.Genshin.Calendar.Data);
const characterCards = ref({} as Record<number, BTMuli.Genshin.Calendar.Item>);
const weaponCards = ref({} as Record<number, BTMuli.Genshin.Calendar.Item>);

// snackbar
const snackbar = ref(false as boolean);
const snackbarText = ref("" as string);
const snackbarColor = ref("success" as string);

const btnText = [
  {
    week: 0,
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
  const dayNow = new Date().getDay();
  weekNow.value = dayNow;
  btnNow.value = dayNow;
  calendarNow.value = getCalendar(dayNow);
  characterCards.value = calendarNow.value.characters;
  weaponCards.value = calendarNow.value.weapons;
  loading.value = false;
});

// 获取当前日历
function getCalendar (day: number) {
  let week;
  if (day < 4) week = day;
  else week = day - 3;
  return calendarData.value[week];
}

function showContent (material: BTMuli.Genshin.Calendar.Material) {
  if (material.content_id === null) {
    snackbarText.value = "暂无详情";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", material.content_id.toString());
  createTGWindow(url, "素材详情", material.name, 1200, 800, true);
}

function getContents (day: number) {
  const oldValue = btnNow.value;
  btnNow.value = day;
  if (oldValue % 3 === day % 3 && oldValue !== 0 && day !== 0) {
    return;
  }
  calendarNow.value = getCalendar(day);
  characterCards.value = calendarNow.value.characters;
  weaponCards.value = calendarNow.value.weapons;
}
</script>
<style lang="css" scoped>
.calendar-card {
  margin-top: 10px;
  font-family: Genshin-Light, serif;
  background: #546d8b;
  border-radius: 10px;
}

.calendar-btn {
  margin-left: 10px;
  font-family: Genshin-Light, serif;
  color: #faf7e8;
  border-radius: 10px;
}

.calendar-box {
  margin:5px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 10px;
}

.calendar-single {
  margin-bottom: 10px;
  background: #faf7e8;
  color: #546d8b;
  border-radius: 10px;
}

.card-title {
  font-size: 1.5rem;
  font-family: Genshin, serif;
  color: #546D8B;
  padding-left: 15px;
  padding-top: 10px;
}

.calendar-content {
  background: #546D8B;
  color:#faf7e8;
  margin: 5px;
  border-radius: 10px;
  padding: 10px;
}

.content-title {
  font-size: 1.2rem;
  font-family: Genshin, serif;
  color: #faf7e8;
  padding: 10px;
  display: v-bind("btnNow === 0 ? 'block' : 'inline-block'")
}

.content-material {
  display: inline-block;
  margin-bottom: 10px;
}

.calendar-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: inline-block;
  margin-left: 10px;
}

.calendar-icon :hover {
  cursor: pointer;
}

.content-detail {
  border-top: 1px solid #faf7e8;
  padding-top: 10px;
}
</style>
