<template>
  <div class="tw-nc-box">
    <!-- todo search -->
    <v-virtual-scroll :items="AppNameCardsData" :item-height="80" class="cards-list">
      <template #default="{ item }">
        <v-list
          :style="{ backgroundImage: `url(${item.bg})` }"
          class="card-box"
          @click="toNameCard(item)"
        >
          <v-list-item :title="item.name" :subtitle="item.desc">
            <template #prepend>
              <v-img width="80px" style="margin-right: 10px" :src="item.icon" />
            </template>
          </v-list-item>
        </v-list>
      </template>
    </v-virtual-scroll>
    <ToNamecard v-model="visible" :data="curNameCard">
      <template #left>
        <div class="card-arrow left" @click="switchCard(false)">
          <img src="../../assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
      <template #right>
        <div class="card-arrow" @click="switchCard(true)">
          <img src="../../assets/icons/arrow-right.svg" alt="right" />
        </div>
      </template>
    </ToNamecard>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import ToNamecard from "../../components/overlay/to-namecard.vue";
import { AppNameCardsData } from "../../data";

const curNameCard = ref<TGApp.App.NameCard.Item>();
const visible = ref(false);

onMounted(() => {
  curNameCard.value = AppNameCardsData[0];
});

function toNameCard(item: TGApp.App.NameCard.Item) {
  curNameCard.value = item;
  visible.value = true;
}

function switchCard(isNext: boolean) {
  const index = AppNameCardsData.findIndex((item) => item.name === curNameCard.value?.name);
  if (index === -1) return;
  if (isNext) {
    if (index === AppNameCardsData.length - 1) {
      curNameCard.value = AppNameCardsData[0];
    } else {
      curNameCard.value = AppNameCardsData[index + 1];
    }
  } else {
    if (index === 0) {
      curNameCard.value = AppNameCardsData[AppNameCardsData.length - 1];
    } else {
      curNameCard.value = AppNameCardsData[index - 1];
    }
  }
}
</script>
<style lang="css" scoped>
.tw-nc-box {
  overflow: auto;
  width: 100%;
  height: 100%;
  padding: 10px;
}

.card-box {
  width: 100%;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px 50px 50px 10px;
  margin-bottom: 10px;
  background-position: right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-family: var(--font-title);
}

.card-arrow {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.card-arrow img {
  width: 100%;
  height: 100%;
}

.card-arrow.left img {
  transform: rotate(180deg);
}
</style>
