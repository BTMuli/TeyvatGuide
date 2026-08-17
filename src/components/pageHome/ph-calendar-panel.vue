<!-- 首页素材日历-普通条目内容 -->
<template>
  <section ref="panelRef" class="phmo-panel">
    <header class="phmo-header">
      <UcItemIcon :alt="item.name" :icon="itemIcon" :size="84" :star="item.star" />
      <div class="phmo-heading">
        <div class="phmo-title-row">
          <h2>{{ item.name }}</h2>
          <v-chip color="var(--tgc-od-orange)" size="small" variant="tonal">
            <v-icon size="15" start>mdi-calendar-today</v-icon>
            {{ src }}
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
            <img :alt="item.weapon" :src="`/icon/weapon/${item.weapon}.webp`" class="icon-filter" />
            {{ item.weapon }}
          </span>
        </div>
        <div class="phmo-source">
          <img :alt="item.source.area" :src="`/icon/nation/${item.source.area}.webp`" />
          <span>{{ item.source.area }} · {{ item.source.name }}</span>
        </div>
      </div>
      <div class="phmo-actions" data-html2canvas-ignore="true">
        <v-btn
          aria-label="保存素材日历分享图"
          density="comfortable"
          icon="mdi-share-variant"
          title="保存素材日历分享图"
          variant="text"
          @click="shareCalendar"
        />
        <v-btn
          aria-label="关闭素材日历详情"
          density="comfortable"
          icon="mdi-close"
          title="关闭"
          variant="text"
          @click="emits('close')"
        />
      </div>
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
            :variant="day.isToday ? 'tonal' : 'outlined'"
            size="small"
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
        <div
          :class="{ 'phmo-materials--weapon': item.itemType === 'weapon' }"
          class="phmo-materials"
        >
          <article v-for="material in sortedMaterials" :key="material.id" class="phmo-material">
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

    <footer ref="footerRef" class="phmo-footer" data-html2canvas-ignore="true">
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

    <footer class="phmo-share">{{ shareCaption }} · Rendered by TeyvatGuide v{{ version }}</footer>
  </section>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { toObcPage } from "@utils/TGWindow.js";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

type PhCalendarPanelProps = {
  item: TGApp.App.Calendar.Item;
  /** 来源组件标签 */
  src?: string;
};
type PhCalendarPanelEmits = { close: [] };

const props = withDefaults(defineProps<PhCalendarPanelProps>(), {
  src: "素材日历",
});
const emits = defineEmits<PhCalendarPanelEmits>();
const router = useRouter();
const panelRef = useTemplateRef<HTMLElement>("panelRef");
const footerRef = useTemplateRef<HTMLElement>("footerRef");
const version = ref<string>();

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
const shareCaption = computed<string>(
  () => `${props.item.name} · ${itemTypeLabel.value} · ${props.src}`,
);
const sortedMaterials = computed<Array<TGApp.App.Calendar.Material>>(() =>
  [...props.item.materials].sort((a, b) => b.star - a.star),
);
const dropDayLabels = computed<Array<TGApp.App.Calendar.DropDayLabel>>(() =>
  props.item.dropDays.map((day) => ({
    isToday: day === today,
    label: dayLabels[day] ?? `周${day}`,
    value: day,
  })),
);

onMounted(async () => {
  version.value = await getVersion();
});

async function shareCalendar(): Promise<void> {
  const element = panelRef.value;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const maxHeight = element.style.maxHeight;
  const overflowY = element.style.overflowY;
  element.style.maxHeight = "none";
  element.style.overflowY = "visible";
  const footer = footerRef.value;
  const footerDisplay = footer?.style.display;
  if (footer !== null) footer.style.display = "none";
  try {
    await generateShareImg(`素材日历_${props.item.name}`, element, 1.5);
  } finally {
    element.style.maxHeight = maxHeight;
    element.style.overflowY = overflowY;
    if (footer !== null) footer.style.display = footerDisplay;
  }
}

async function openDetail(): Promise<void> {
  emits("close");
  await router.push(`/wiki/${props.item.itemType}/${props.item.id}`);
}

async function openObcDetail(): Promise<void> {
  emits("close");
  await toObcPage(props.item.contentId);
}
</script>

<style lang="scss" scoped>
.phmo-panel {
  display: flex;
  overflow: hidden;
  width: min(720px, calc(100vw - 160px));
  max-height: calc(100% - 32px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 18px 48px #00000066;
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

.phmo-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  gap: 4px;
}

.phmo-header {
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
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

    &.icon-filter {
      filter: var(--icon-filter);
    }
  }
}

.phmo-source {
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 6px;

  img {
    width: 20px;
    height: 20px;
    filter: var(--icon-filter);
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

  &.phmo-materials--weapon {
    grid-template-columns: repeat(2, 1fr);
  }
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

.phmo-share {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
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
