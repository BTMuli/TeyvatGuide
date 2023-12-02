<template>
  <div class="mys-post-div">
    <div class="mys-post-villa-card">
      <img
        class="mys-post-villa-card-bg"
        alt="bg"
        :src="props.data.insert.villa_card.villa_cover"
      />
      <div class="mys-post-villa-card-bg-before"></div>
      <div class="mys-post-villa-card-flex">
        <div class="mys-post-villa-card-top">
          <img
            alt="topIcon"
            class="mys-post-villa-card-icon"
            :src="props.data.insert.villa_card.villa_avatar_url"
          />
          <div class="mys-post-villa-card-content">
            <div class="mys-post-villa-card-title">
              {{ props.data.insert.villa_card.villa_name }}
            </div>
            <div class="mys-post-villa-card-desc">
              <img
                class="mys-post-villa-card-desc-icon"
                alt="topDesc"
                :src="props.data.insert.villa_card.owner_avatar_url"
              />
              <span class="mys-post-villa-card-desc-text">
                {{ props.data.insert.villa_card.owner_nickname }} 创建
              </span>
            </div>
          </div>
        </div>
        <div class="mys-post-villa-card-mid">
          <div class="mys-post-villa-card-tag">
            {{ props.data.insert.villa_card.villa_member_num }}人在聊
          </div>
          <div v-if="props.data.insert.villa_card.tag_list">
            <div
              v-for="(tag, index) in props.data.insert.villa_card.tag_list"
              :key="index"
              class="mys-post-villa-card-tag"
            >
              {{ tag }}
            </div>
          </div>
        </div>
        <div class="mys-post-villa-card-bottom">
          {{ props.data.insert.villa_card.villa_introduce }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
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
</script>
