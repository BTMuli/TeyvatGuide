<template>
  <div class="tpu-box">
    <div class="tpu-top">
      <span @click="copyUid()" data-html2canvas-ignore>
        <v-icon size="12">mdi-content-copy</v-icon>
        <span>复制</span>
      </span>
      <span class="tpu-game">{{ gameInfo?.name ?? "未知游戏" }}</span>
    </div>
    <div class="tpu-main">UID {{ props.data.insert.game_user_info.game_uid }}</div>
    <div class="tpu-sub">
      <span>{{ nickname }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.region_name }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.level }}级</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import useBBSStore from "@store/bbs.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef } from "vue";

type TpUid = {
  insert: {
    backup_text: string;
    game_user_info: {
      game_uid: string;
      game_biz: string;
      nickname: string;
      region_name: string;
      level: string;
    };
  };
};
type TpUidProps = { data: TpUid };

const { gameUidCards, gameList } = storeToRefs(useBBSStore());

const defaultCard: TGApp.BBS.AppConfig.GameUidCardConf = {
  main_text_color: "#a17a58ff",
  is_open: true,
  background_color: "#ffffff",
  image_url: "/source/post/tp_uid_bg.webp",
};

const props = defineProps<TpUidProps>();
const nickname = ref<string>();
const gameInfo = shallowRef<TGApp.BBS.Game.Item>();
const cardInfo = shallowRef<TGApp.BBS.AppConfig.GameUidCardConf>(defaultCard);

console.log("tpUid", props.data.insert.game_user_info);

onMounted(async () => {
  nickname.value = decodeURIComponent(props.data.insert.game_user_info.nickname);
  gameInfo.value = getGameInfo();
  if (gameInfo.value) cardInfo.value = gameUidCards.value[gameInfo.value.id] ?? defaultCard;
});

async function copyUid(): Promise<void> {
  await navigator.clipboard.writeText(props.data.insert.game_user_info.game_uid);
  showSnackbar.success("已复制UID");
}

function getGameInfo(): TGApp.BBS.Game.Item | undefined {
  const enName = props.data.insert.game_user_info.game_biz.split("_")[0];
  if (!enName) return undefined;
  return gameList.value.find((g) => g.op_name === enName);
}
</script>
<style lang="scss" scoped>
.tpu-box {
  position: relative;
  display: flex;
  max-width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 4px 4px 8px;
  border-radius: 2px;
  background-color: v-bind("cardInfo.background_color");
  background-image: v-bind("'url(' + cardInfo.image_url + ')'");
  background-position: right bottom;
  background-repeat: no-repeat;
  background-size: contain;
  color: v-bind("cardInfo.main_text_color");
}

.tpu-top {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
  font-size: 12px;

  :first-child {
    cursor: pointer;
  }
}

.tpu-main {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 16px;
}

.tpu-sub {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  column-gap: 2px;
  font-size: 12px;
}

.tpu-game {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  border: 1px solid v-bind("cardInfo.main_text_color");
  border-radius: 2px;
  font-size: 10px;
  opacity: 0.75;
}
</style>
