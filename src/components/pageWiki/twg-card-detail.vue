<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId
    class="card-detail-overlay"
    closeAriaLabel="关闭卡牌详情"
    panelMaxHeight="calc(100dvh - var(--v-layout-top, 0px) - 32px)"
    panelWidth="min(600px, calc(100vw - 24px))"
    topOffset="var(--v-layout-top, 0px)"
  >
    <template #header>
      <h2 :id="titleId" class="card-detail-title">{{ cardName || "卡牌详情" }}</h2>
    </template>

    <div v-if="card" class="card-detail">
      <TwgCardTile :card hideName />
      <div class="card-detail-info">
        <template v-if="!('basic' in card)">
          <dl v-if="hasCharacterStats" class="card-detail-stats">
            <div v-if="card.use_count !== undefined">
              <dt>使用次数</dt>
              <dd>{{ card.use_count }}</dd>
            </div>
            <div v-if="card.proficiency !== undefined">
              <dt>角色熟练度</dt>
              <dd>{{ card.proficiency }}</dd>
            </div>
          </dl>
          <TwgCardDescription v-if="card.desc" :value="card.desc" />
          <section v-for="skill in card.card_skills" :key="skill.id" class="card-detail-skill">
            <div class="card-detail-heading">
              <h3>{{ skill.name }}</h3>
              <div v-if="skill.tag" class="card-detail-types">
                <TpcTag :tag="skill.tag" :title="skill.tag" />
              </div>
            </div>
            <TwgCardDescription v-if="skill.desc" :value="skill.desc" />
          </section>
          <div v-if="card.card_sources?.length" class="card-detail-state">
            <h3>获取方式</h3>
            <TwgCardDescription
              v-for="(source, index) in card.card_sources"
              :key="index"
              :value="source"
            />
          </div>
          <p
            v-if="
              !hasCharacterStats &&
              !card.desc &&
              !card.card_skills?.length &&
              !card.card_sources?.length
            "
          >
            暂无卡牌详情
          </p>
        </template>
        <p v-else-if="loading" role="status">正在加载卡牌详情…</p>
        <div v-else-if="error" class="card-detail-state" role="status">
          <p>{{ error }}</p>
          <v-btn size="small" type="button" variant="outlined" @click="reload++">重试</v-btn>
        </div>
        <template v-else-if="'element' in card">
          <section v-for="skill in skills" :key="skill.id" class="card-detail-skill">
            <div class="card-detail-heading">
              <img v-if="skill.icon" :src="skill.icon" alt="" />
              <h3>{{ skill.name }}</h3>
              <div v-if="skill.type.length" class="card-detail-types">
                <TpcTag v-for="type in skill.type" :key="type" :tag="type" :title="type" />
              </div>
              <div
                v-if="skill.cost_types?.length"
                class="card-detail-costs card-detail-skill-costs"
              >
                <span>花费</span>
                <span v-for="(cost, index) in skill.cost_types" :key="index">
                  <img v-if="cost.icon" :src="cost.icon" alt="" />
                  {{ cost.cost_num }}
                </span>
              </div>
            </div>
            <TwgCardDescription v-if="skill.rich_desc" :value="skill.rich_desc" />
          </section>
          <p v-if="skills.length === 0">暂无技能详情</p>
        </template>
        <template v-else-if="action">
          <div
            v-if="action.desc || action.cost1_type_raw || action.cost2_raw > 0"
            class="card-detail-costs"
          >
            <span>花费</span>
            <span>
              <img
                v-if="action.cost1_type_raw && action.cost1_type_icon"
                :src="action.cost1_type_icon"
                alt=""
              />
              {{ action.cost1_raw }}
            </span>
            <span v-if="action.cost2_raw > 0">
              <img v-if="action.cost2_type_icon" :src="action.cost2_type_icon" alt="" />
              {{ action.cost2_raw }}
            </span>
          </div>
          <TwgCardDescription :value="action.desc || '暂无效果描述'" />
          <div v-if="action.access" class="card-detail-state">
            <h3>获取方式</h3>
            <TwgCardDescription :value="action.access" />
          </div>
        </template>
      </div>
    </div>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import TwgCardDescription from "@comp/pageWiki/twg-card-description.vue";
import TwgCardTile from "@comp/pageWiki/twg-card-tile.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import cardSquareReq from "@req/cardSquareReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, ref, shallowRef, useId, watch } from "vue";

const { card } = defineProps<{ card?: TGApp.Game.CardSquare.Card | TGApp.Game.Gcg.Card }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const cardName = computed<string | undefined>(() =>
  card && "basic" in card ? card.basic.name : card?.name,
);
const hasCharacterStats = computed<boolean>(() =>
  Boolean(
    card &&
    !("basic" in card) &&
    card.hp &&
    (card.use_count !== undefined || card.proficiency !== undefined),
  ),
);
const skills = shallowRef<Array<TGApp.Game.CardSquare.RoleSkill>>([]);
const action = shallowRef<TGApp.Game.CardSquare.ActionDetail>();
const loading = ref<boolean>(false);
const error = ref<string>("");
const reload = ref<number>(0);

watch([visible, () => card, reload], async ([open, current], _, onCleanup) => {
  loading.value = false;
  if (!open || !current || !("basic" in current)) return;
  let stale = false;
  onCleanup(() => {
    stale = true;
  });

  loading.value = true;
  error.value = "";
  skills.value = [];
  action.value = undefined;
  const id = current.basic.item_id;
  try {
    if ("element" in current) {
      const result = await cardSquareReq.roleDetail(id);
      if (stale) return;
      skills.value = result.map((skill) => ({
        ...skill,
        type: skill.type.filter(Boolean),
      }));
    } else {
      const result = await cardSquareReq.actionDetail(id);
      if (stale) return;
      action.value = result;
    }
  } catch (cause) {
    if (!stale) error.value = "加载卡牌详情失败：" + TGHttps.getErrMsg(cause);
  } finally {
    if (!stale) loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.card-detail-overlay {
  :deep(.tolp-header) {
    flex-shrink: 0;
    padding: 4px 12px;
  }

  :deep(.tolp-content) {
    padding: 12px 12px 12px 20px;
  }
}

.card-detail-title,
.card-detail-info :is(h3, p) {
  margin: 0;
}

.card-detail-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.card-detail {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: 140px minmax(0, 1fr);
  line-height: 1.4;
}

.card-detail-info,
.card-detail-state,
.card-detail-skill {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.card-detail-state {
  justify-items: start;
}

.card-detail-state h3,
.card-detail-heading h3 {
  color: var(--common-text-title);
  font-size: 16px;
  font-weight: 600;
}

.card-detail-skill {
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 4px;
}

.card-detail-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  > img {
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 1px 1px var(--common-shadow-4));
    object-fit: contain;
  }
}

.card-detail-types {
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 4px;
  line-height: 18px;

  :deep(.tag-label) {
    cursor: default;
  }
}

.card-detail-stats {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  gap: 4px 16px;

  div {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  dt {
    color: var(--box-text-2);
  }

  dd {
    margin: 0;
    color: var(--common-text-title);
    font-weight: 600;
  }
}

.card-detail-costs,
.card-detail-costs span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-detail-costs {
  flex-wrap: wrap;
  gap: 8px;

  img {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }
}

.card-detail-skill-costs {
  font-size: 12px;
  margin-inline-start: auto;
}

@media (width <= 420px) {
  .card-detail {
    gap: 8px;
    grid-template-columns: 72px minmax(0, 1fr);
  }
}
</style>
