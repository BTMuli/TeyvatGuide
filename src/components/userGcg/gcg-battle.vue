<template>
  <div class="gcg-battle">
    <section :aria-labelledby="challengeTitleId" class="gcg-panel">
      <div class="gcg-panel-heading">
        <h2 :id="challengeTitleId">胜冠之试</h2>
        <v-select
          v-if="schedules.length > 0"
          v-model="selectedScheduleId"
          :hide-details="true"
          :items="schedules"
          class="gcg-schedule-select"
          density="compact"
          item-title="name"
          item-value="id"
          label="选择期数"
          variant="outlined"
        />
      </div>

      <p v-if="scheduleLoading" class="gcg-status" role="status">正在加载挑战期数…</p>
      <div v-else-if="scheduleError" class="gcg-feedback" role="alert">
        <p>{{ scheduleError }}</p>
        <v-btn size="small" type="button" variant="outlined" @click="loadSchedules">重试</v-btn>
      </div>
      <p v-else-if="schedules.length === 0" class="gcg-empty">暂无挑战期数</p>
      <template v-else>
        <p v-if="challengeLoading" class="gcg-status" role="status">正在加载挑战记录…</p>
        <div v-else-if="challengeError" class="gcg-feedback" role="alert">
          <p>{{ challengeError }}</p>
          <v-btn size="small" type="button" variant="outlined" @click="retryChallenge">重试</v-btn>
        </div>
        <template v-else-if="challenge">
          <div class="gcg-challenge-summary">
            <div class="gcg-win-summary">
              <span class="gcg-summary-label">当期最佳记录</span>
              <strong>{{ challenge.basic?.win_cnt ?? 0 }} 胜</strong>
            </div>
            <img
              v-if="challenge.basic?.medal"
              :src="challenge.basic.medal"
              alt="当期试炼奖章"
              class="gcg-medal"
            />
          </div>

          <div class="gcg-subsection">
            <h3>荣誉角色</h3>
            <div v-if="challenge.honor_character?.length" class="gcg-honor-list">
              <div
                v-for="(character, index) in challenge.honor_character"
                :key="`${character.card_icon}-${index}`"
                class="gcg-honor"
              >
                <img
                  :alt="character.name ?? character.card_name ?? '荣誉角色'"
                  :src="character.card_icon"
                />
                <span v-if="character.name ?? character.card_name">
                  {{ character.name ?? character.card_name }}
                </span>
              </div>
            </div>
            <p v-else class="gcg-empty">暂无荣誉角色</p>
          </div>

          <div class="gcg-subsection">
            <h3>使用牌组</h3>
            <GcgDecks
              :account
              :cookie
              :decks="challenge.deck_list ?? []"
              :scheduleId="selectedScheduleId"
            />
          </div>
        </template>
      </template>
    </section>

    <section :aria-labelledby="matchTitleId" class="gcg-panel">
      <div class="gcg-panel-heading">
        <h2 :id="matchTitleId">对局回放</h2>
        <p v-if="matchGroups.some((group) => group.items.length)">完整回放可在游戏内查看</p>
      </div>
      <p v-if="matchLoading" class="gcg-status" role="status">正在加载对局记录…</p>
      <div v-else-if="matchError" class="gcg-feedback" role="alert">
        <p>{{ matchError }}</p>
        <v-btn size="small" type="button" variant="outlined" @click="loadMatches">重试</v-btn>
      </div>
      <div v-else class="gcg-match-grid">
        <div v-for="group in matchGroups" :key="group.title" class="gcg-subsection">
          <h3>{{ group.title }}</h3>
          <div v-if="group.items.length" class="gcg-match-list">
            <article
              v-for="(match, index) in group.items"
              :key="`${formatMatchTime(match)}-${index}`"
              class="gcg-match"
            >
              <div class="gcg-match-side">
                <div class="gcg-match-avatars">
                  <img
                    v-for="(avatar, avatarIndex) in match.self.linups?.slice(0, 3)"
                    :key="`${avatar}-${avatarIndex}`"
                    :src="avatar"
                    alt=""
                    loading="lazy"
                  />
                  <span v-if="hasOverflow(match.self)" class="gcg-overflow">+</span>
                </div>
                <span class="gcg-match-name">{{ match.self.name }}</span>
              </div>
              <div class="gcg-match-result">
                <span :class="{ 'is-win': match.is_win }">{{
                  match.is_win ? "胜利" : "失败"
                }}</span>
                <small>{{ match.match_type }}</small>
                <time>{{ formatMatchTime(match) }}</time>
              </div>
              <div class="gcg-match-side gcg-match-side--opponent">
                <div class="gcg-match-avatars">
                  <img
                    v-for="(avatar, avatarIndex) in match.opposite.linups?.slice(0, 3)"
                    :key="`${avatar}-${avatarIndex}`"
                    :src="avatar"
                    alt=""
                    loading="lazy"
                  />
                  <span v-if="hasOverflow(match.opposite)" class="gcg-overflow">+</span>
                </div>
                <span class="gcg-match-name">{{ match.opposite.name }}</span>
              </div>
            </article>
          </div>
          <p v-else-if="group.hasRecords" class="gcg-empty">暂无匹配对局记录</p>
          <p v-else class="gcg-empty">暂无{{ group.title }}记录</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import GcgDecks from "@comp/userGcg/gcg-decks.vue";
import recordReq from "@req/recordReq.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, onMounted, ref, shallowRef, useId, watch } from "vue";

/** 七圣召唤战绩所用账号。 @since Beta v0.14.1 */
type GcgBattleProps = {
  account: TGApp.Sqlite.Account.Game;
  cookie: TGApp.App.Account.Cookie;
  search: string;
};

const { account, cookie, search } = defineProps<GcgBattleProps>();
const challengeTitleId = useId();
const matchTitleId = useId();

const schedules = shallowRef<Array<TGApp.Game.Gcg.Schedule>>([]);
const selectedScheduleId = ref<string | number>();
const challenge = shallowRef<TGApp.Game.Gcg.Challenge>();
const matches = shallowRef<TGApp.Game.Gcg.Matches>();
const scheduleLoading = ref<boolean>(false);
const challengeLoading = ref<boolean>(false);
const matchLoading = ref<boolean>(false);
const scheduleError = ref<string>();
const challengeError = ref<string>();
const matchError = ref<string>();
let challengeRequestId = 0;
const matchGroups = computed<
  Array<{ title: string; items: Array<TGApp.Game.Gcg.Match>; hasRecords: boolean }>
>(() => {
  const createGroup = (
    title: string,
    sourceMatches: Array<TGApp.Game.Gcg.Match>,
  ): { title: string; items: Array<TGApp.Game.Gcg.Match>; hasRecords: boolean } => ({
    title,
    items: sourceMatches.filter((match) =>
      match.opposite.name.toLocaleLowerCase().includes(search),
    ),
    hasRecords: sourceMatches.length > 0,
  });
  return [
    createGroup("最近对局", matches.value?.recent_matches ?? []),
    createGroup("收藏对局", matches.value?.favourite_matches ?? []),
  ];
});

onMounted(() => {
  void loadSchedules();
  void loadMatches();
});

watch(selectedScheduleId, (scheduleId) => {
  if (scheduleId !== undefined) void loadChallenge(scheduleId);
});

async function loadSchedules(): Promise<void> {
  if (scheduleLoading.value) return;
  scheduleLoading.value = true;
  scheduleError.value = undefined;
  challenge.value = undefined;
  try {
    const response = await recordReq.gcg(cookie, account, "challenge/schedule");
    schedules.value = response.schedule_list ?? [];
    selectedScheduleId.value = schedules.value[0]?.id;
  } catch (error) {
    schedules.value = [];
    selectedScheduleId.value = undefined;
    scheduleError.value = `获取挑战期数失败：${TGHttps.getErrMsg(error)}`;
  } finally {
    scheduleLoading.value = false;
  }
}

async function loadChallenge(scheduleId: string | number): Promise<void> {
  const requestId = ++challengeRequestId;
  challengeLoading.value = true;
  challengeError.value = undefined;
  challenge.value = undefined;
  try {
    const response = await recordReq.gcg(cookie, account, "challenge/record", {
      schedule_id: scheduleId,
    });
    if (requestId !== challengeRequestId) return;
    challenge.value = response;
  } catch (error) {
    if (requestId !== challengeRequestId) return;
    challengeError.value = `获取挑战记录失败：${TGHttps.getErrMsg(error)}`;
  } finally {
    if (requestId === challengeRequestId) challengeLoading.value = false;
  }
}

async function retryChallenge(): Promise<void> {
  if (selectedScheduleId.value === undefined) return;
  await loadChallenge(selectedScheduleId.value);
}

async function loadMatches(): Promise<void> {
  if (matchLoading.value) return;
  matchLoading.value = true;
  matchError.value = undefined;
  matches.value = undefined;
  try {
    matches.value = await recordReq.gcg(cookie, account, "matchList");
  } catch (error) {
    matchError.value = `获取对局记录失败：${TGHttps.getErrMsg(error)}`;
  } finally {
    matchLoading.value = false;
  }
}

function hasOverflow(player: TGApp.Game.Gcg.MatchPlayer): boolean {
  return player.is_overflow === true || (player.linups?.length ?? 0) > 3;
}

function formatMatchTime(match: TGApp.Game.Gcg.Match): string {
  const time = match.match_time;
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return `${time.year}-${pad(time.month)}-${pad(time.day)} ${pad(time.hour)}:${pad(time.minute)}`;
}
</script>

<style lang="scss" scoped>
.gcg-battle {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gcg-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 2px 8px var(--common-shadow-1);
  gap: 16px;
}

.gcg-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }

  p {
    color: var(--box-text-2);
    font-size: 12px;
  }
}

.gcg-schedule-select {
  width: min(240px, 45%);
  min-width: 160px;
}

.gcg-status,
.gcg-empty {
  margin: 0;
  color: var(--box-text-2);
  text-align: center;
}

.gcg-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  p {
    margin: 0;
    color: var(--box-text-1);
  }
}

.gcg-challenge-summary {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--box-bg-2);
}

.gcg-win-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 24px;
    font-weight: normal;
  }
}

.gcg-summary-label {
  color: var(--box-text-2);
  font-size: 12px;
}

.gcg-medal {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.gcg-subsection {
  display: flex;
  flex-direction: column;
  gap: 12px;

  h3 {
    font-size: 16px;
  }
}

.gcg-honor-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.gcg-honor {
  display: flex;
  width: 72px;
  flex-direction: column;
  align-items: center;
  color: var(--box-text-1);
  font-size: 11px;
  gap: 4px;
  text-align: center;

  img {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
  }

  span {
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gcg-match-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gcg-match-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gcg-match {
  display: grid;
  min-height: 112px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.gcg-match-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  &--opponent {
    align-items: flex-end;
    text-align: right;
  }
}

.gcg-match-avatars {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;

  img,
  .gcg-overflow {
    width: 28px;
    height: 28px;
    border: 1px solid var(--common-shadow-2);
    border-radius: 50%;
    margin-right: -4px;
    background: var(--box-bg-1);
    object-fit: cover;
  }

  .gcg-overflow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--box-text-1);
    font-size: 12px;
  }
}

.gcg-match-side--opponent .gcg-match-avatars {
  flex-direction: row-reverse;

  img,
  .gcg-overflow {
    margin-right: 0;
    margin-left: -4px;
  }
}

.gcg-match-name {
  overflow: hidden;
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gcg-match-result {
  display: flex;
  min-width: 70px;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;

  span {
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
  }

  .is-win {
    padding: 0 8px;
    border-radius: 4px;
    background: var(--tgc-yellow-1);
    color: var(--tgc-dark-8);
  }

  small,
  time {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }
}

@media (width <= 800px) {
  .gcg-panel-heading {
    flex-direction: column;
  }

  .gcg-schedule-select {
    width: 100%;
  }

  .gcg-match-grid {
    grid-template-columns: 1fr;
  }
}
</style>
