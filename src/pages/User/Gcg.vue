<template>
  <v-app-bar :extensionHeight="56">
    <template #prepend>
      <div class="gcg-heading">
        <div class="gcg-title">
          <img alt="" src="/UI/nav/userGcg.webp" />
          <h1>七圣召唤</h1>
        </div>
        <div
          v-if="mode === 'user' && basic?.level"
          :title="'UID ' + maskUid(account.gameUid) + ' · ' + account.regionName"
          class="gcg-player"
        >
          <strong class="gcg-player-name">{{ account.nickname }}</strong>
          <span>牌手 Lv.{{ basic.level }}</span>
          <span>角色牌 {{ basic.avatar_card_num_gained }}/{{ basic.avatar_card_num_total }}</span>
          <span>行动牌 {{ basic.action_card_num_gained }}/{{ basic.action_card_num_total }}</span>
        </div>
      </div>
    </template>
    <template #append>
      <div class="gcg-actions">
        <v-btn
          v-if="mode === 'user'"
          :disabled="!credentials"
          :loading
          aria-label="刷新七圣召唤数据"
          density="compact"
          icon="mdi-refresh"
          title="刷新"
          type="button"
          variant="text"
          @click="revision++"
        />
        <v-btn-toggle
          v-model="mode"
          aria-label="七圣召唤视图"
          class="gcg-toggle"
          color="var(--tgc-od-blue)"
          density="comfortable"
          divided
          mandatory
          role="group"
          variant="outlined"
        >
          <v-btn
            v-for="option in modeOptions"
            :key="option.value"
            :aria-label="option.label"
            :aria-pressed="mode === option.value"
            :icon="option.icon"
            :title="option.label"
            :value="option.value"
            type="button"
          />
        </v-btn-toggle>
      </div>
    </template>
    <template #extension>
      <div class="gcg-toolbar">
        <div class="gcg-search-tools">
          <v-text-field
            v-if="mode === 'wiki' || userTab !== 'backs'"
            v-model="search"
            :disabled="mode === 'user' && !basic?.level"
            :label="searchLabel"
            autocomplete="off"
            class="gcg-search"
            clearable
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <v-btn-toggle
            v-if="mode === 'user' && userTab === 'cards' && basic?.level"
            v-model="cardFilter"
            aria-label="收藏卡牌类型"
            class="gcg-toggle"
            color="var(--tgc-od-blue)"
            density="comfortable"
            divided
            mandatory
            role="group"
            variant="outlined"
          >
            <v-btn
              v-for="option in cardFilterOptions"
              :key="option.value"
              :aria-label="option.label"
              :aria-pressed="cardFilter === option.value"
              :icon="option.icon"
              :title="option.label"
              :value="option.value"
              type="button"
            />
          </v-btn-toggle>
          <div v-else-if="mode === 'wiki' && catalogFilters" class="gcg-wiki-filters">
            <v-btn-toggle
              v-if="catalogTab === 'role'"
              :model-value="catalogSelection.element"
              aria-label="按元素筛选角色牌"
              class="gcg-toggle"
              color="var(--tgc-od-blue)"
              density="comfortable"
              divided
              role="group"
              variant="outlined"
              @update:model-value="catalogSelection.element = $event ?? null"
            >
              <v-btn
                v-for="element in catalogFilters.role_element"
                :key="element.id"
                :aria-label="element.name"
                :aria-pressed="catalogSelection.element === element.id"
                :icon="true"
                :title="element.name"
                :value="element.id"
                type="button"
              >
                <img :src="`/icon/element/${element.name}.webp`" alt="" class="gcg-wiki-element" />
              </v-btn>
            </v-btn-toggle>
            <GcgActionFilter v-else v-model="catalogSelection" :filters="catalogFilters" />
          </div>
        </div>
        <v-btn-toggle
          v-if="mode === 'user'"
          v-model="userTab"
          aria-label="用户内容"
          class="gcg-toggle"
          color="var(--tgc-od-blue)"
          density="comfortable"
          divided
          mandatory
          role="group"
          variant="outlined"
        >
          <v-btn
            v-for="option in userOptions"
            :key="option.value"
            :aria-label="option.label"
            :aria-pressed="userTab === option.value"
            :icon="option.icon"
            :title="option.label"
            :value="option.value"
            type="button"
          />
        </v-btn-toggle>
        <v-btn-toggle
          v-else
          v-model="catalogTab"
          aria-label="图鉴卡牌类别"
          class="gcg-toggle"
          color="var(--tgc-od-blue)"
          density="comfortable"
          divided
          mandatory
          role="group"
          variant="outlined"
        >
          <v-btn
            v-for="option in catalogOptions"
            :key="option.value"
            :aria-label="option.label"
            :aria-pressed="catalogTab === option.value"
            :icon="option.icon"
            :title="option.label"
            :value="option.value"
            type="button"
          />
        </v-btn-toggle>
      </div>
    </template>
  </v-app-bar>

  <div class="gcg-page">
    <template v-if="mode === 'user'">
      <div v-if="!credentials" class="gcg-status">
        <template v-if="!isLogin || !cookie">
          <p>登录米游社后可查看七圣召唤战绩与收藏。</p>
          <v-btn :to="{ name: '设置' }" variant="tonal">前往设置</v-btn>
        </template>
        <p v-else>请在侧栏选择已绑定的原神账号。</p>
      </div>
      <div v-else-if="loading" class="gcg-status" role="status">
        <v-progress-circular indeterminate />
        <p>正在加载七圣召唤数据…</p>
      </div>
      <p v-else-if="error" class="gcg-status" role="status">{{ error }}</p>
      <p v-else-if="basic && !basic.level" class="gcg-status">当前账号尚未解锁七圣召唤。</p>
    </template>

    <v-window :model-value="activePane" :touch="false">
      <v-window-item v-if="isDevEnv" :reverseTransition="false" :transition="false" value="battle">
        <GcgBattle
          v-if="credentials && basic?.level"
          :account="credentials.account"
          :cookie="credentials.cookie"
          :search="userKeyword"
        />
      </v-window-item>
      <v-window-item :reverseTransition="false" :transition="false" value="collection">
        <GcgCollection
          v-if="credentials && basic?.level"
          :account="credentials.account"
          :cardFilter
          :cookie="credentials.cookie"
          :search="userKeyword"
          :section="collectionTab"
        />
      </v-window-item>
      <v-window-item :reverseTransition="false" :transition="false" value="catalog">
        <GcgCatalog
          v-model:filters="catalogFilters"
          :search="catalogKeyword"
          :selection="catalogSelection"
          :tab="catalogTab"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts" setup>
import GcgActionFilter from "@comp/userGcg/gcg-action-filter.vue";
import GcgBattle from "@comp/userGcg/gcg-battle.vue";
import GcgCatalog from "@comp/userGcg/gcg-catalog.vue";
import GcgCollection from "@comp/userGcg/gcg-collection.vue";
import recordReq from "@req/recordReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { maskUid } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";

/** 七圣召唤用户视图。 @since Beta v0.14.1 */
type GcgUserTab = "battle" | TGApp.Game.Gcg.CollectionTab;

// @ts-expect-error NodeNext treats Vue scripts as CommonJS; Vite provides import.meta.env.
const isDevEnv = import.meta.env.DEV;
const modeOptions = <const>[
  { value: "user", label: "用户", icon: "mdi-account-outline" },
  { value: "wiki", label: "Wiki", icon: "mdi-book-open-variant" },
];
const userOptions = (<const>[
  { value: "battle", label: "战绩", icon: "mdi-sword-cross" },
  { value: "decks", label: "牌组", icon: "mdi-cards-playing-outline" },
  { value: "cards", label: "卡牌", icon: "mdi-card-bulleted-outline" },
  { value: "backs", label: "牌背", icon: "mdi-card-outline" },
]).filter((option) => isDevEnv || option.value !== "battle");
const catalogOptions = <const>[
  { value: "role", label: "角色牌", icon: "mdi-card-account-details-outline" },
  { value: "action", label: "行动牌", icon: "mdi-lightning-bolt-outline" },
];
const cardFilterOptions = <const>[
  { value: "all", label: "全部", icon: "mdi-view-grid-outline" },
  { ...catalogOptions[0], value: "avatar" },
  catalogOptions[1],
];

const { isLogin } = storeToRefs(useAppStore());
const { account, cookie, uid } = storeToRefs(useUserStore());
const revision = ref<number>(0);
const mode = ref<"user" | "wiki">("user");
const userTab = ref<GcgUserTab>(isDevEnv ? "battle" : "decks");
const catalogTab = ref<TGApp.Game.CardSquare.CardTab>("role");
const catalogFilters = shallowRef<TGApp.Game.CardSquare.Filters>();
const catalogSelection = ref<TGApp.Game.CardSquare.CatalogSelection>({
  element: null,
  actionType: null,
  actionTag: null,
  actionCost: null,
});
const cardFilter = ref<TGApp.Game.Gcg.CardFilter>("all");
const catalogSearch = ref<string | null>("");
const userSearch = ref<Record<Exclude<GcgUserTab, "backs">, string | null>>({
  battle: "",
  decks: "",
  cards: "",
});
const search = computed<string | null>({
  get: () => {
    if (mode.value === "wiki") return catalogSearch.value;
    if (userTab.value === "backs") return null;
    return userSearch.value[userTab.value];
  },
  set: (value) => {
    if (mode.value === "wiki") catalogSearch.value = value;
    else if (userTab.value !== "backs") userSearch.value[userTab.value] = value;
  },
});
const userKeyword = computed<string>(() => {
  if (userTab.value === "backs") return "";
  return userSearch.value[userTab.value]?.trim().toLocaleLowerCase() ?? "";
});
const catalogKeyword = computed<string>(
  () => catalogSearch.value?.trim().toLocaleLowerCase() ?? "",
);
const searchLabel = computed<string>(() => {
  if (mode.value === "wiki") return "搜索卡牌名称";
  if (userTab.value === "backs") return "";
  return {
    battle: "搜索对手",
    decks: "搜索牌组",
    cards: "搜索已加载的卡牌",
  }[userTab.value];
});
const activePane = computed<"catalog" | "battle" | "collection">(() => {
  if (mode.value === "wiki") return "catalog";
  return userTab.value === "battle" ? "battle" : "collection";
});
const collectionTab = computed<TGApp.Game.Gcg.CollectionTab>((previous = "decks") =>
  userTab.value === "battle" ? previous : userTab.value,
);
const basic = shallowRef<TGApp.Game.Gcg.BasicInfo>();
const loading = ref<boolean>(false);
const error = ref<string>("");
const credentials = computed<TGApp.App.Account.RfAc | undefined>(() => {
  const role = account.value;
  if (
    !isLogin.value ||
    !cookie.value ||
    role.uid !== uid.value ||
    role.gameBiz !== "hk4e_cn" ||
    !role.gameUid ||
    !role.region
  ) {
    return undefined;
  }
  return { account: role, cookie: cookie.value };
});

watch(
  [credentials, revision],
  async ([current], _, onCleanup) => {
    basic.value = undefined;
    error.value = "";
    loading.value = current !== undefined;
    if (!current) return;

    let stale = false;
    onCleanup(() => {
      stale = true;
    });
    try {
      const data = await recordReq.gcg(current.cookie, current.account, "basicInfo");
      if (stale) return;
      if (data.is_version_upgrading) error.value = "版本更新期间，七圣召唤数据维护中";
      else basic.value = data;
    } catch (cause) {
      if (!stale) error.value = `加载七圣召唤失败：${TGHttps.getErrMsg(cause)}`;
    } finally {
      if (!stale) loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.gcg-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
  margin-inline-start: 12px;
}

.gcg-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  h1 {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }
}

.gcg-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-end: 12px;
}

.gcg-toolbar {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-inline: 16px;
}

.gcg-search-tools {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
}

.gcg-search {
  min-width: 0;
  max-width: 320px;
  flex: 1 1 240px;
}

.gcg-toggle.v-btn-toggle {
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;

  :deep(.v-btn) {
    width: 44px;
    min-width: 44px;
    height: 100%;
  }

  :deep(.v-icon) {
    font-size: 20px;
  }
}

.gcg-wiki-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gcg-wiki-element {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.gcg-page {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.gcg-player {
  display: flex;
  min-width: 0;
  align-items: center;
  border-inline-start: 1px solid var(--common-shadow-2);
  color: var(--app-page-content);
  font-size: 13px;
  gap: 12px;
  padding-inline-start: 16px;
  white-space: nowrap;
}

.gcg-player-name {
  overflow: hidden;
  color: var(--common-text-title);
  text-overflow: ellipsis;
}

.gcg-status {
  display: grid;
  min-height: 220px;
  padding: 16px;
  gap: 12px;
  justify-items: center;
  place-content: center;
  text-align: center;
}
</style>
