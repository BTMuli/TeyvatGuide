<!-- UGC关卡组件 TODO:UI调整-->
<template>
  <div class="tul-card-box" @click="console.log(props.data)">
    <TMiImg
      @click="toLevel()"
      class="tul-cover"
      :src="props.data.insert.level.cover.url"
      alt="cover"
    />
    <div class="tul-content">
      <div class="tul-top">
        <div class="tul-title">{{ props.data.insert.level.level_name }}</div>
        <div class="tul-sub">
          <div class="tul-info-item" title="游戏类型">
            <v-icon size="16" color="yellow">mdi-gamepad-variant</v-icon>
            <span>{{ props.data.insert.level.play_type }}</span>
          </div>
          <div class="tul-info-item" title="游玩人数">
            <v-icon size="16" color="blue">mdi-account-multiple</v-icon>
            <span>{{ props.data.insert.level.show_limit_play_num_str }}</span>
          </div>
        </div>
        <div class="tul-attach" v-if="props.data.insert.level.level_attachment">
          <span>“</span>
          <span>{{ props.data.insert.level.level_attachment.content }}</span>
        </div>
      </div>
      <div class="tul-bottom">
        <div class="tul-info">
          <div class="tul-info-item" title="热度">
            <v-icon size="16" color="orange">mdi-fire</v-icon>
            <span>{{ props.data.insert.level.hot_score }}</span>
          </div>
          <div class="tul-info-item" title="点赞率">
            <v-icon size="16" color="pink">mdi-thumb-up</v-icon>
            <span>{{ props.data.insert.level.good_rate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { openUrl } from "@tauri-apps/plugin-opener";

type TpUgcLevel = { insert: { level: TGApp.BBS.UGC.Level } };
type TpUgcLevelProps = { data: TpUgcLevel };

const props = defineProps<TpUgcLevelProps>();

async function toLevel(): Promise<void> {
  let url = `https://act.miyoushe.com/ys/ugc_community/mx/#/pages/level-detail/index?`;
  url = `${url}id=${props.data.insert.level.level_id}&region=${props.data.insert.level.region}`;
  // TODO: 存在BUG
  // await TGClient.open("web_act_thin", url.toString());
  await openUrl(url);
}
</script>
<style lang="scss" scoped>
.tul-card-box {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin-bottom: 8px;
  background: var(--box-bg-1);
  column-gap: 8px;
}

.tul-cover {
  max-width: 50%;
  max-height: 180px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.5s;

  &:hover {
    scale: 0.9;
  }
}

.tul-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
}

.tul-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tul-title {
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 20px;
}

.tul-sub {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  color: var(--tgc-od-white);
  column-gap: 16px;
  font-size: 16px;
}

.tul-attach {
  margin-top: 8px;
  color: var(--common-text-secondary);
  font-size: 16px;

  span {
    color: var(--tgc-od-blue);

    &:first-child {
      font-family: Genshin, sans-serif;
      font-size: 20px;
      line-height: 14px;
      vertical-align: top;
    }
  }
}

.tul-bottom {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
}

.tul-info {
  display: flex;
  gap: 16px;
}

.tul-info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  gap: 4px;
}
</style>
