<!-- 设备信息编辑浮窗 -->
<template>
  <TopOverlay
    v-model="visible"
    blurVal="10px"
    closeAriaLabel="关闭设备信息编辑"
    contentMaxHeight="none"
    panelWidth="560px"
    :showShare="false"
    :titleId
  >
    <template #header>
      <div class="device-heading">
        <h2 :id="titleId">编辑设备信息</h2>
        <p>修改后将用于后续请求；重新获取设备信息可能覆盖这些值。</p>
      </div>
    </template>

    <v-form ref="formEl" class="device-fields" @submit.prevent="saveDeviceInfo">
      <v-text-field
        v-model="editing.device_fp"
        :rules="[requiredRule]"
        density="compact"
        label="设备指纹 (device_fp)"
        variant="outlined"
      />
      <v-text-field
        v-model="editing.device_id"
        :rules="[requiredRule]"
        density="compact"
        label="设备 ID (device_id)"
        variant="outlined"
      />
      <v-text-field
        v-model="editing.device_name"
        :rules="[requiredRule]"
        density="compact"
        label="设备名称 (device_name)"
        variant="outlined"
      />
      <v-text-field
        v-model="editing.product"
        :rules="[requiredRule]"
        density="compact"
        label="产品型号 (product)"
        variant="outlined"
      />
      <v-text-field
        v-model="editing.seed_id"
        :rules="[requiredRule]"
        density="compact"
        label="种子 ID (seed_id)"
        variant="outlined"
      />
      <v-text-field
        v-model="editing.seed_time"
        :rules="[requiredRule]"
        density="compact"
        label="种子时间 (seed_time)"
        variant="outlined"
      />
    </v-form>

    <template #footer>
      <div class="device-actions">
        <v-btn variant="text" @click="visible = false">取消</v-btn>
        <v-btn :loading="saving" color="var(--tgc-btn-1)" variant="flat" @click="saveDeviceInfo">
          保存
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref, useId, useTemplateRef, watch } from "vue";
import { VForm } from "vuetify/components";

const visible = defineModel<boolean>({ default: false });
const { deviceInfo } = storeToRefs(useAppStore());
const editing = ref<TGApp.App.Device.DeviceInfo>({ ...deviceInfo.value });
const saving = ref<boolean>(false);
const formRef = useTemplateRef<VForm>("formEl");
const titleId = useId();

watch(visible, (isVisible) => {
  if (isVisible) editing.value = { ...deviceInfo.value };
});

function requiredRule(value: unknown): true | string {
  return typeof value === "string" && value.trim().length > 0 ? true : "不能为空";
}

async function saveDeviceInfo(): Promise<void> {
  if (saving.value) return;
  const validation = await formRef.value?.validate();
  if (!validation?.valid) return;
  const updated: TGApp.App.Device.DeviceInfo = {
    device_fp: editing.value.device_fp.trim(),
    device_id: editing.value.device_id.trim(),
    device_name: editing.value.device_name.trim(),
    product: editing.value.product.trim(),
    seed_id: editing.value.seed_id.trim(),
    seed_time: editing.value.seed_time.trim(),
  };
  if (
    updated.device_fp === deviceInfo.value.device_fp &&
    updated.device_id === deviceInfo.value.device_id &&
    updated.device_name === deviceInfo.value.device_name &&
    updated.product === deviceInfo.value.product &&
    updated.seed_id === deviceInfo.value.seed_id &&
    updated.seed_time === deviceInfo.value.seed_time
  ) {
    visible.value = false;
    return;
  }
  saving.value = true;
  try {
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(updated));
  } catch (error) {
    showSnackbar.error("设备信息保存失败，请重试");
    await TGLogger.Error(`[Config][saveDeviceInfo] 保存失败 ${error}`);
    return;
  } finally {
    saving.value = false;
  }
  deviceInfo.value = updated;
  visible.value = false;
  showSnackbar.success("设备信息已保存");
  await TGLogger.Info("[Config][saveDeviceInfo] 设备信息已手动更新");
}
</script>

<style lang="scss" scoped>
.device-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.device-fields {
  display: grid;
  padding: 20px 8px 4px;
  gap: 4px;
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
