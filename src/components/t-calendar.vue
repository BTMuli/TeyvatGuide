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
            background: text.week === btnNow ? 'var(--btn-bg-1)' : 'var(--btn-bg-2)',
            color: '#faf7e8'
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
                <div
                  v-for="item of character.contents"
                  :key="item.id"
                  class="card-box"
                  @click="showContent(item)"
                >
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
                    <div class="card-name">
                      <img :src="item.weapon" alt="weapon">
                      <span>{{ item.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
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
              <div
                v-for="item of weapon.contents"
                :key="item.id"
                alt="content.content_id"
                class="card-box"
                @click="showContent(item)"
              >
                <!-- 底层背景图 -->
                <div class="card-bg">
                  <img :src="item.bg" alt="bg">
                </div>
                <!-- 中层武器图 -->
                <div class="card-icon">
                  <img :src="item.icon" alt="icon">
                </div>
                <!-- 上层图标&内容 -->
                <div class="card-cover">
                  <div class="card-type">
                    <img :src="item.type" alt="type">
                  </div>
                  <div class="card-name">
                    <span>{{ item.name }}</span>
                  </div>
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
const characterCards = ref({} as Record<number, BTMuli.Genshin.Calendar.CharaacterItem>);
const weaponCards = ref({} as Record<number, BTMuli.Genshin.Calendar.WeaponItem>);

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

function showContent (material: BTMuli.Genshin.Calendar.Material | BTMuli.Genshin.Wiki.Character.BriefInfo | BTMuli.Genshin.Wiki.Weapon.BriefInfo) {
  if (material.content_id === null || material.content_id === undefined) {
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

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 10px;
}

.calendar-single {
  margin-bottom: 10px;
  background: var(--content-bg-2);
  color: var(--content-bg-1);
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
  background: var(--content-bg-1);
  color:var(--content-bg-2);
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  grid-gap: 10px;
  padding: 5px;
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

.card-element img {
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.card-type img {
  width: 20px;
  height: 20px;
  object-fit: cover;
}

.card-name img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
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
  font-size: 10px;
  text-shadow: 0 0 5px #000;
  font-family: Genshin, serif;
}
</style>
