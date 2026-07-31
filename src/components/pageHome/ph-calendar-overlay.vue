<!-- 首页素材日历-普通条目浮窗 -->
<template>
  <TOverlay v-model="visible" blur-val="8px">
    <section class="phmo-panel">
      <header class="phmo-header">
        <UcItemIcon :alt="item.name" :icon="itemIcon" :size="84" :star="item.star" />
        <div class="phmo-heading">
          <div class="phmo-title-row">
            <h2>{{ item.name }}</h2>
            <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
              <v-icon start size="15">mdi-calendar-today</v-icon>
              素材日历
            </v-chip>
          </div>
          <div class="phmo-attributes">
            <span>
              <v-icon size="16">{{ itemTypeIcon }}</v-icon>
              {{ itemTypeLabel }}
            </span>
            <span>
              <v-icon color="var(--tgc-od-orange)" size="16">mdi-star</v-icon>
              {{ itemRarityLabel }}
            </span>
            <span v-if="item.element">
              <img :alt="`${item.element}元素`" :src="`/icon/element/${item.element}元素.webp`" />
              {{ item.element }}元素
            </span>
            <span>
              <img :alt="item.weapon" :src="`/icon/weapon/${item.weapon}.webp`" />
              {{ item.weapon }}
            </span>
          </div>
          <div class="phmo-source">
            <img :alt="item.source.area" :src="`/icon/nation/${item.source.area}.webp`" />
            <span>{{ item.source.area }} · {{ item.source.name }}</span>
          </div>
        </div>
        <v-btn icon="mdi-close" title="关闭" variant="text" @click="visible = false" />
      </header>

      <div class="phmo-content">
        <section class="phmo-schedule">
          <div class="phmo-section-title">
            <div>
              <v-icon color="var(--tgc-od-orange)" size="18">mdi-clock-outline</v-icon>
              <strong>开放时间</strong>
            </div>
            <span>周日全部素材副本开放</span>
          </div>
          <div class="phmo-days">
            <v-chip
              v-for="day in dropDayLabels"
              :key="day.value"
              :color="day.isToday ? 'var(--tgc-od-orange)' : undefined"
              :prepend-icon="day.isToday ? 'mdi-calendar-check-outline' : undefined"
              size="small"
              :variant="day.isToday ? 'tonal' : 'outlined'"
            >
              {{ day.label }}
            </v-chip>
          </div>
        </section>

        <section class="phmo-material-section">
          <div class="phmo-section-title">
            <div>
              <v-icon color="var(--tgc-od-orange)" size="18">mdi-package-variant-closed</v-icon>
              <strong>{{ materialSectionTitle }}</strong>
            </div>
            <span>共 {{ item.materials.length }} 种</span>
          </div>
          <div class="phmo-materials">
            <article v-for="material in item.materials" :key="material.id" class="phmo-material">
              <UcItemIcon
                :alt="material.name"
                :icon="`/icon/material/${material.id}.webp`"
                :size="52"
                :star="material.star"
              />
              <div class="phmo-material-info">
                <span class="phmo-material-name">{{ material.name }}</span>
                <span class="phmo-material-rarity">{{ material.star }} 星素材</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <footer class="phmo-footer">
        <v-btn prepend-icon="mdi-open-in-new" variant="text" @click="openObcDetail">
          观测枢资料
        </v-btn>
        <v-btn
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-book-open-page-variant-outline"
          variant="tonal"
          @click="openDetail"
        >
          {{ itemTypeLabel }}详情
        </v-btn>
      </footer>
    </section>
  </TOverlay>
</template>

<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { computed } from "vue";
import { useRouter } from "vue-router";

type PhCalendarOverlayProps = { item: TGApp.App.Calendar.Item };
type DropDayLabel = { isToday: boolean; label: string; value: number };

const props = defineProps<PhCalendarOverlayProps>();
const visible = defineModel<boolean>({ default: false });
const router = useRouter();

const dayLabels: Record<number, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
};
const today = new Date().getDay() || 7;
const itemIcon = computed<string>(() => `/WIKI/${props.item.itemType}/${props.item.id}.webp`);
const itemTypeIcon = computed<string>(() =>
  props.item.itemType === "character" ? "mdi-account-outline" : "mdi-sword",
);
const itemTypeLabel = computed<string>(() =>
  props.item.itemType === "character" ? "角色" : "武器",
);
const itemRarityLabel = computed<string>(() =>
  props.item.star === 105 ? "特殊五星" : `${props.item.star} 星`,
);
const materialSectionTitle = computed<string>(() =>
  props.item.itemType === "character" ? "天赋培养材料" : "武器突破材料",
);
const dropDayLabels = computed<Array<DropDayLabel>>(() =>
  props.item.dropDays.map((day) => ({
    isToday: day === today,
    label: dayLabels[day] ?? `周${day}`,
    value: day,
  })),
);

async function openDetail(): Promise<void> {
  visible.value = false;
  await router.push(`/wiki/${props.item.itemType}/${props.item.id}`);
}

async function openObcDetail(): Promise<void> {
  visible.value = false;
  await toObcPage(props.item.contentId);
}
</script>

<style lang="scss" scoped>
.phmo-panel {
  display: flex;
  width: min(680px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 18px 48px #00000066;
  overflow-y: auto;
}

.phmo-header,
.phmo-title-row,
.phmo-attributes,
.phmo-attributes > span,
.phmo-source,
.phmo-section-title,
.phmo-section-title > div,
.phmo-days,
.phmo-material,
.phmo-footer {
  display: flex;
  align-items: center;
}

.phmo-header {
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: color-mix(in srgb, var(--tgc-od-orange) 8%, var(--box-bg-1));
  gap: 14px;
}

.phmo-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.phmo-title-row {
  flex-wrap: wrap;
  gap: 8px;

  h2 {
    margin: 0;
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 500;
  }
}

.phmo-attributes {
  flex-wrap: wrap;
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 6px 12px;

  > span {
    gap: 4px;
  }

  img {
    width: 17px;
    height: 17px;
    object-fit: contain;
  }
}

.phmo-source {
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 6px;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.phmo-content {
  display: flex;
  flex-direction: column;
  padding: 14px 16px 16px;
  gap: 16px;
}

.phmo-schedule,
.phmo-material-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phmo-section-title {
  justify-content: space-between;
  gap: 12px;

  > div {
    gap: 6px;
  }

  > span {
    color: var(--common-text-sub);
    font-size: 12px;
    text-align: right;
  }
}

.phmo-days {
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.phmo-materials {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.phmo-material {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-1);
  gap: 10px;
}

.phmo-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;

  .phmo-material-name {
    overflow: hidden;
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .phmo-material-rarity {
    color: var(--common-text-sub);
    font-size: 12px;
  }
}

.phmo-footer {
  justify-content: flex-end;
  padding: 10px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

@media (width <= 600px) {
  .phmo-header {
    align-items: flex-start;
  }

  .phmo-section-title {
    flex-direction: column;
    align-items: flex-start;

    > span {
      text-align: left;
    }
  }
}
</style>
