/**
 * @file plugins/Hutao/api/abyss.ts
 * @description Hutao API 深渊相关
 * @since Beta v0.6.2
 */

const BaseUrl = "https://homa.snapgenshin.com/";
const AbyssUrl = `${BaseUrl}Statistics/`;

export const DataUploadApi = `${BaseUrl}Record/Upload?returningRank=false`;
export const OverviewApi = `${AbyssUrl}Overview`;
export const AvatarUpRateApi = `${AbyssUrl}Avatar/AttendanceRate`;
export const AvatarUseRateApi = `${AbyssUrl}Avatar/UtilizationRate`;
export const AvatarHoldRateApi = `${AbyssUrl}Avatar/HoldingRate`;
export const AvatarCollocationApi = `${AbyssUrl}Avatar/AvatarCollocation`;
export const WeaponCollocationApi = `${AbyssUrl}Weapon/WeaponCollocation`;
export const TeamCombinationApi = `${AbyssUrl}Team/Combination`;
