<!-- 首页素材日历-普通条目内容 -->
<template>
  <TOverlayPanel
    ref="panelRef"
    contentMaxHeight="none"
    panelMaxHeight="calc(100% - 32px)"
    panelWidth="min(720px, calc(100vw - 160px))"
    :shareCaption
  >
    <template #header>
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
    </template>

    <template #actions>
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
    </template>

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
      <div :class="{ 'phmo-materials--weapon': item.itemType === 'weapon' }" class="phmo-materials">
        <UcMaterialReq
          v-for="material in displayMaterials"
          :key="material.id"
          :interactive="false"
          :material
          :showMetrics="false"
        />
      </div>
    </section>

    <template #footer>
      <div class="phmo-footer-actions">
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
      </div>
    </template>
  </TOverlayPanel>
</template>
<script lang="ts" setup>
import TOverlayPanel from "@comp/app/t-overlay-panel.vue";
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import { generateShareImg } from "@utils/TGShare.js";
import { toObcPage } from "@utils/TGWindow.js";
import { computed, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";

type PhCalendarPanelProps = {
  item: TGApp.App.Calendar.Item;
  /** 来源组件标签 */
  src?: string;
};

const emits = defineEmits<{ close: [] }>();
const props = withDefaults(defineProps<PhCalendarPanelProps>(), {
  src: "素材日历",
});
const router = useRouter();
const panelRef = useTemplateRef<InstanceType<typeof TOverlayPanel>>("panelRef");

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
  () => `${props.src} · ${props.item.name} · ${itemTypeLabel.value}`,
);
const displayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  [...props.item.materials]
    .sort((a, b) => b.star - a.star)
    .map((material) => {
      const wiki = WikiMaterialData.find((item) => item.id === material.id);
      return {
        id: material.id,
        name: material.name,
        type: wiki?.type ?? `${material.star} 星素材`,
        star: material.star,
        required: 0,
        owned: 0,
        craftable: 0,
        craftingCosts: [],
        missing: 0,
        progress: 100,
      };
    }),
);
const dropDayLabels = computed<Array<TGApp.App.Calendar.DropDayLabel>>(() =>
  props.item.dropDays.map((day) => ({
    isToday: day === today,
    label: dayLabels[day] ?? `周${day}`,
    value: day,
  })),
);

async function shareCalendar(): Promise<void> {
  const element = panelRef.value?.panel ?? null;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const maxHeight = element.style.maxHeight;
  const overflowY = element.style.overflowY;
  element.style.maxHeight = "none";
  element.style.overflowY = "visible";
  try {
    await generateShareImg(`素材日历_${props.item.name}`, element, 1.5);
  } finally {
    element.style.maxHeight = maxHeight;
    element.style.overflowY = overflowY;
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
.phmo-title-row,
.phmo-attributes,
.phmo-attributes > span,
.phmo-source,
.phmo-section-title,
.phmo-section-title > div,
.phmo-days {
  display: flex;
  align-items: center;
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
    font-weight: normal;
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
  grid-template-columns: repeat(3, 1fr);

  &.phmo-materials--weapon {
    grid-template-columns: repeat(2, 1fr);
  }
}

.phmo-footer-actions {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  gap: 8px;
}

@media (width <= 600px) {
  .phmo-section-title {
    flex-direction: column;
    align-items: flex-start;

    > span {
      text-align: left;
    }
  }
}
</style>
