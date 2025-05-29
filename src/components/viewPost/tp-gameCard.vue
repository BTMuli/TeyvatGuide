<!-- 游戏卡片 -->
<template>
  <div class="tp-game-card-box">
    <div class="icon">
      <img :src="props.data.insert.reception_card.icon" alt="icon" />
    </div>
    <div class="info">
      <span>{{ props.data.insert.reception_card.prompt }}</span>
      <span>{{ props.data.insert.reception_card.custom_toast }}</span>
    </div>
    <v-btn class="act" @click="toGame()">
      <span>查看</span>
    </v-btn>
  </div>
</template>
<script lang="ts" setup>
import { openUrl } from "@tauri-apps/plugin-opener";

type TpGameCard = {
  insert: {
    backup_text: "[游戏卡片]";
    reception_card: {
      id: string;
      game_id: number;
      name: number;
      icon: string;
      game_reception_status: number;
      pre_register_count: { count: string };
      is_order: boolean;
      prompt: string;
      custom_toast: string;
      pkg: {
        android_url: string;
        pkg_name: string;
        pkg_version: string;
        ios_url: string;
        pkg_length: number;
        pkg_md5: string;
        pkg_version_code: number;
        ios_version: string;
        ios_scheme_url: string;
      };
      user_status: {
        is_device_support: boolean;
        pre_register_status: number;
        is_order: boolean;
        has_qualification: boolean;
        qualify_type: number;
      };
    };
  };
};
type TpGameCardProps = { data: TpGameCard };

const props = defineProps<TpGameCardProps>();

async function toGame(): Promise<void> {
  await openUrl(`https://www.miyoushe.com/ys/gameCenter/${props.data.insert.reception_card.id}`);
}
</script>
<style lang="scss" scoped>
.tp-game-card-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin: 12px 0;
  background: var(--box-bg-1);
  column-gap: 12px;
}

.icon {
  position: relative;
  overflow: hidden;
  width: 80px;
  height: 80px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  span {
    &:first-child {
      color: var(--common-text-title);
      font-family: var(--font-title);
      font-size: 20px;
    }

    &:last-child {
      font-size: 16px;
    }
  }
}

.act {
  height: 40px;
  margin-left: auto;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .act {
  border: 1px solid var(--common-shadow-2);
}
</style>
