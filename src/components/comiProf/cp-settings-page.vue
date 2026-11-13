<template>
  <CpSettings
    v-if="profile"
    :audit="profileAudit"
    class="community-profile-panel"
    :profile
    :section
    @saved="handleSaved"
  />
</template>

<script lang="ts" setup>
import CpSettings from "@comp/comiProf/cp-settings.vue";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";

const { section } = defineProps<{ section: TGApp.BBS.Profile.SettingsSection }>();
const context = useCommunityProfile();
const { profile, profileAudit } = context;

function handleSaved(warning?: string): void {
  context.settingsSaved(section, warning);
}
</script>
