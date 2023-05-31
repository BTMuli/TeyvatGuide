/**
 * @file plugins Hutao api abyss.ts
 * @description Hutao API 深渊相关
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

const BaseUrl = "https://homa.snapgenshin.com/";

export const DataUploadApi = `${BaseUrl}Record/Upload?returningRank=false`;
export const UidCheckApi = `${BaseUrl}Record/Check?Uid={uid}`;
export const UidRankApi = `${BaseUrl}Record/Rank?Uid={uid}`;
export const OverviewApi = `${BaseUrl}Statistics/Overview`;
export const AvatarUpRateApi = `${BaseUrl}Statistics/Avatar/AttendanceRate`;
export const AvatarUseRateApi = `${BaseUrl}Statistics/Avatar/UtilizationRate`;
export const AvatarHoldRateApi = `${BaseUrl}Statistics/Avatar/HoldingRate`;
export const AvatarCollocationApi = `${BaseUrl}Statistics/Avatar/AvatarCollocation`;
export const WeaponCollocationApi = `${BaseUrl}Statistics/Weapon/WeaponCollocation`;
export const TeamCombinationApi = `${BaseUrl}Statistics/Team/Combination`;
