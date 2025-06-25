<!-- 幽境危战 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="ucp-top-prepend">
        <img alt="icon" src="/source/UI/userChallenge.webp" />
        <span>幽境危战</span>
        <v-select
          density="compact"
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          label="游戏UID"
        />
        <v-btn :rounded="true" class="ucp-btn" @click="toAbyss()">
          <img src="/source/UI/userAbyss.webp" alt="abyss" />
          <span>深境螺旋</span>
        </v-btn>
        <v-btn :rounded="true" class="ucp-btn" @click="toCombat()">
          <img src="/source/UI/userCombat.webp" alt="abyss" />
          <span>真境剧诗</span>
        </v-btn>
        <v-btn :rounded="true" class="ucp-btn" @click="loadWiki()">
          <img src="/source/UI/wikiAbyss.webp" alt="abyss" />
          <span>统计数据</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="ucp-top-append">
        <v-select
          :items="serverList"
          v-model="server"
          item-title="text"
          item-value="value"
          label="服务器"
          width="200px"
          density="compact"
          :disabled="isReq"
        />
      </div>
    </template>
    <template #extension>
      <div class="ucp-top-extension">
        <div class="act-list">
          <v-btn
            class="ucp-btn"
            @click="shareChallenge()"
            :disabled="localChallenge.length === 0"
            prepend-icon="mdi-share"
          >
            分享
          </v-btn>
          <v-btn class="ucp-btn" @click="refreshChallenge()" prepend-icon="mdi-refresh">刷新</v-btn>
          <v-btn class="ucp-btn" @click="uploadChallenge()" prepend-icon="mdi-cloud-upload">
            上传
          </v-btn>
          <v-btn class="ucp-btn" @click="deleteChallenge()" prepend-icon="mdi-delete">删除</v-btn>
        </div>
        <div class="pop-list">
          <TucPopItem v-for="avatar in popList" :key="avatar.avatar_id" :avatar />
          <v-btn
            :loading="reqPop"
            size="36"
            class="pop-btn"
            @click="refreshPopList"
            icon="mdi-refresh"
            :disabled="reqPop"
          />
        </div>
      </div>
    </template>
  </v-app-bar>
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TucPopItem from "@comp/userChallenge/tuc-pop-item.vue";
import { GameServerEnum, getGameServerDesc } from "@enum/game.js";
import recordReq from "@req/recordReq.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

type SelectItem<T = string> = { text: string; value: T };
const serverList: ReadonlyArray<SelectItem<TGApp.Game.Base.ServerTypeEnum>> = [
  GameServerEnum.CN_GF01,
  GameServerEnum.CN_QD01,
  // TODO: 目前不支持国际服务器
  // GameServerEnum.OS_ASIA,
  // GameServerEnum.OS_EURO,
  // GameServerEnum.OS_USA,
  // GameServerEnum.OS_CHT,
].map((i) => ({ text: getGameServerDesc(i), value: i }));

const router = useRouter();

const isReq = ref<boolean>(false);
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localChallenge = shallowRef<unknown[]>([]);

const server = ref<TGApp.Game.Base.ServerTypeEnum>(GameServerEnum.CN_GF01);
const reqPop = ref<boolean>(false);
const popList = shallowRef<Array<TGApp.Game.Challenge.PopularityItem>>([]);

onMounted(async () => {
  await refreshPopList();
  // TODO: 获取数据库数据
});

watch(
  () => server.value,
  async () => {
    const name = getGameServerDesc(server.value);
    await TGLogger.Info(`[UserChallenge][watch][server] 切换服务器: ${name}`);
    await refreshPopList();
  },
);

async function toAbyss(): Promise<void> {
  await router.push({ name: "深境螺旋" });
}

async function toCombat(): Promise<void> {
  await router.push({ name: "真境剧诗" });
}

async function loadWiki(): Promise<void> {
  showSnackbar.warn("暂未接入胡桃数据库");
}

async function shareChallenge(): Promise<void> {
  // TODO: 实现分享功能
}

async function refreshChallenge(): Promise<void> {
  // TODO: 实现刷新挑战记录功能
}

async function uploadChallenge(): Promise<void> {
  showSnackbar.warn("暂未接入胡桃数据库");
}

async function deleteChallenge(): Promise<void> {
  if (localChallenge.value.length === 0) {
    showSnackbar.warn("没有可删除的挑战记录");
    return;
  }
  // TODO: 实现删除挑战记录功能
}

async function refreshPopList(): Promise<void> {
  if (reqPop.value) return;
  reqPop.value = true;
  await showLoading.start("正在加载赋光之人列表", `服务器： ${getGameServerDesc(server.value)}`);
  const resp = await recordReq.challenge.pop(server.value);
  if (resp.retcode !== 0) {
    reqPop.value = false;
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(
      `[UserChallenge][RefreshPopList] Error: ${resp.retcode} - ${resp.message}`,
    );
    await showLoading.end();
    return;
  }
  popList.value = resp.data.avatar_list;
  await showLoading.end();
  reqPop.value = false;
  showSnackbar.success(`加载完成，共 ${popList.value.length} 位赋光之人`);
}
</script>
<style lang="scss" scoped>
.ucp-top-prepend {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 8px;
  column-gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    font-family: var(--font-title);
    font-size: 20px;
  }

  span :first-child {
    color: var(--common-text-title);
  }
}

.ucp-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);

  img {
    width: 24px;
    height: 24px;
    margin-right: 4px;
    object-fit: contain;
  }
}

.dark .ucp-btn {
  border: 1px solid var(--common-shadow-2);
}

.ucp-top-append {
  position: relative;
  width: fit-content;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
}

.ucp-top-extension {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.act-list {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pop-list {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

.pop-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .pop-btn {
  border: 1px solid var(--common-shadow-2);
}
</style>
