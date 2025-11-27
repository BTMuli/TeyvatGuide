<!-- 切换账号浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="to-sac-box">
      <div class="tsb-title">账号管理</div>
      <v-list variant="text" class="tsb-list" v-model:opened="openList">
        <v-list-group v-for="item in ac" :key="item.user.uid" :title.attr="'点击展开/收起'">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props">
              <template #title>{{ item.user.brief.nickname }}[{{ item.user.uid }}]</template>
              <template #subtitle>{{ item.user.brief.desc }}</template>
              <template #prepend>
                <img class="tsb-avatar" :src="item.user.brief.avatar" alt="userIcon" />
              </template>
              <template #append>
                <v-checkbox-btn
                  :model-value="item.user.uid === curUid"
                  @click="trySelect(item.user)"
                  readonly
                />
              </template>
            </v-list-item>
          </template>
          <v-list-item
            density="compact"
            v-for="(game, idx) in item.gameAc"
            :key="idx"
            :value="game.gameUid"
            class="tsb-list-game"
            @click="trySelect(item.user, game)"
          >
            <template #title>{{ game.nickname }}</template>
            <template #subtitle>{{ game.gameUid }}({{ game.regionName }})</template>
            <template #append>
              <!-- select -->
              <v-checkbox-btn :model-value="game.gameUid === curGameUid" readonly />
            </template>
          </v-list-item>
        </v-list-group>
      </v-list>
      <v-btn class="tsb-confirm" @click="tryConfirm()">确认</v-btn>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { shallowRef, ref, watch } from "vue";

type TsaAcItem = { user: TGApp.App.Account.User; gameAc: Array<TGApp.Sqlite.Account.Game> };

const userStore = useUserStore();
const { uid, account, briefInfo, cookie } = storeToRefs(userStore);

const visible = defineModel<boolean>();
const ac = shallowRef<Array<TsaAcItem>>([]);
const openList = ref<Array<string>>([]);
const curUid = ref<string>();
const curGameUid = ref<string>();

watch(
  () => visible.value,
  async (value) => {
    if (value) {
      await loadAccounts();
    }
  },
);

async function loadAccounts(): Promise<void> {
  const uidList = await TSUserAccount.account.getAllAccount();
  const tmp: Array<TsaAcItem> = [];
  for (const item of uidList) {
    let accounts = await TSUserAccount.game.getAccount(item.uid);
    accounts = accounts.filter((a) => a.gameBiz === "hk4e_cn");
    tmp.push({ user: item, gameAc: accounts });
  }
  ac.value = tmp;
  curUid.value = uid.value ?? "";
  curGameUid.value = account.value.gameUid;
  openList.value = [];
}

function trySelect(user: TGApp.App.Account.User, game?: TGApp.Sqlite.Account.Game): void {
  if (game) {
    curUid.value = user.uid;
    curGameUid.value = game.gameUid;
  } else if (curUid.value !== user.uid) {
    curUid.value = user.uid;
    const firstGame = ac.value.find((u) => u.user.uid === user.uid)?.gameAc?.[0];
    curGameUid.value = firstGame ? firstGame.gameUid : "";
  }
}

async function tryConfirm(): Promise<void> {
  if (!curUid.value) {
    showSnackbar.warn("请选择要切换的账号");
    return;
  }
  if (curUid.value === uid.value && curGameUid.value === account.value.gameUid) {
    showSnackbar.warn("无需切换当前账号");
    return;
  }
  const acFind = ac.value.find((u) => u.user.uid === curUid.value);
  if (!acFind) {
    showSnackbar.error("未找到对应用户信息，请重试");
    return;
  }
  const game = acFind.gameAc.find((g) => g.gameUid === curGameUid.value);
  uid.value = acFind.user.uid;
  briefInfo.value = acFind.user.brief;
  cookie.value = acFind.user.cookie;
  if (!game) {
    showSnackbar.error("未找到对应游戏账号信息，请重试");
    return;
  } else {
    account.value = game;
    await userStore.switchGameAccount(game.gameUid);
    showSnackbar.success(`成功切换到用户${uid.value}的游戏UID${game.gameUid}`);
    await TGLogger.Info(`[ToSwitchAc] 切换到用户${uid.value}的游戏UID${game.gameUid}成功`);
  }
}
</script>
<style lang="scss" scoped>
.to-sac-box {
  display: flex;
  width: 400px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
  row-gap: 12px;
}

.tsb-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.tsb-list {
  position: relative;
  display: flex;
  width: 100%;
  height: fit-content;
  max-height: 400px;
  flex: 1;
  flex-direction: column;
  background: var(--box-bg-1);
  overflow-y: auto;
}

.tsb-list-item {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-color);
}

.tsb-avatar {
  width: 32px;
  height: 32px;
  margin-right: 4px;
}

.tsb-list-user {
  padding: 12px 16px;
  cursor: pointer;

  &:hover {
    background-color: var(--hover-bg);
  }
}

.tsb-list-user.active {
  background-color: var(--active-bg);
  font-weight: bold;
}

.tsb-list-game {
  cursor: pointer;
}

.tsb-confirm {
  height: 40px;
  border-radius: 3px;
  margin-left: auto;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}
</style>
