<template>
  <div
    class="tp-villa-card-box"
    :style="{
      backgroundImage: 'url(' + props.data.insert.villa_card.villa_cover + ')',
    }"
  >
    <div class="tp-villa-card-content">
      <img alt="cardIcon" :src="props.data.insert.villa_card.villa_avatar_url" />
      <div class="tp-villa-card-info">
        <span class="tp-villa-card-name">{{ props.data.insert.villa_card.villa_name }}</span>
        <span class="tp-villa-card-owner">
          <img alt="topIcon" :src="props.data.insert.villa_card.owner_avatar_url" />
          <span>{{ props.data.insert.villa_card.owner_nickname }} 创建</span>
        </span>
      </div>
    </div>
    <div class="tp-villa-card-tags">
      <div class="tp-villa-card-tag">
        {{ props.data.insert.villa_card.villa_member_num }} 人在聊
      </div>
      <div
        v-for="(tag, index) in props.data.insert.villa_card?.tag_list"
        :key="index"
        class="tp-villa-card-tag"
      >
        {{ tag }}
      </div>
    </div>
    <div class="tp-villa-card-desc">
      {{ props.data.insert.villa_card.villa_introduce }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRaw } from "vue";

interface VillaRoom {
  room_id: string;
  room_name: string;
  sender_avatar_list: string[];
  sender_num: string;
}

interface TpVillaCard {
  insert: {
    villa_card: {
      villa_id: string;
      villa_name: string;
      villa_avatar_url: string;
      villa_cover: string;
      owner_uid: string;
      owner_nickname: string;
      owner_avatar_url: string;
      villa_introduce: string;
      tag_list?: string[];
      villa_member_num: string;
      is_official: boolean;
      is_available: boolean;
      hot_member_avatar: string[];
      hot_room: VillaRoom;
    };
  };
}

interface TpVillaCardProps {
  data: TpVillaCard;
}

const props = defineProps<TpVillaCardProps>();

console.log(
  "tpVillaCard",
  props.data.insert.villa_card.villa_id,
  toRaw(props.data).insert.villa_card,
);
</script>
<style lang="css" scoped>
.tp-villa-card-box {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  margin: 10px auto;
  background-position: top center;
  background-repeat: no-repeat;
  background-size: cover;
  row-gap: 10px;
}

.tp-villa-card-content {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;
}

.tp-villa-card-content img {
  width: 80px;
  height: 80px;
  border-radius: 5px;
}

.tp-villa-card-info {
  display: flex;
  height: 80px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  row-gap: 5px;
}

.tp-villa-card-name {
  padding: 0 5px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-8);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.tp-villa-card-owner {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 20px 5px 5px 20px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-8);
  color: var(--common-text-title);
  column-gap: 5px;
}

.tp-villa-card-owner img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.tp-villa-card-owner span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}

.tp-villa-card-tags {
  display: flex;
  flex-wrap: wrap;
  column-gap: 10px;
}

.tp-villa-card-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-8);
  color: var(--tgc-pink-1);
  font-family: var(--font-title);
  font-size: 12px;
}

.tp-villa-card-desc {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 5px;
  margin-right: auto;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-8);
  color: var(--box-text-1);
}
</style>
