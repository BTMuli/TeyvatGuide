/**
 * @file plugins Snap.Hutao Interface Achievement
 * @description plugins Snap.Hutao Interface Achievement
 * @author BTMuli<bt-muli@outlook.com>
 * @see https://github.com/DGP-Studio/Snap.Metadata/blob/main/Output/CHS/Achievement.json
 * @version v3.5
 */

/**
 * @description Snap.Hutao Achievement data interface
 * @interface Achievement
 * @property {number} Id - 成就ID
 * @property {number} Goal - 成就系列对应顺序
 * @property {number} Order - 成就对应顺序
 * @property {string} Title - 成就标题
 * @property {string} Description - 成就描述
 * @property FinishReward - 成就完成奖励
 * @property {number} FinishReward.ID - 物品ID，201为原石
 * @property {number} FinishReward.Count - 物品数量
 * @property {number} Progress - 成就进度
 * @property {string|undefined} Icon - 成就图标
 * @return Achievement
 */
export interface Achievement {
	Id: number;
	Goal: number;
	Order: number;
	Title: string;
	Description: string;
	FinishReward: {
		ID: number;
		Count: number;
	};
	Progress: number;
	Icon?: string;
}

/**
 * @description Snap.Hutao AchievementGoal data interface
 * @see https://github.com/DGP-Studio/Snap.Metadata/blob/main/Output/CHS/AchievementGoal.json
 * @interface AchievementGoal
 * @property {number} Id - 成就系列ID
 * @property {number} Order - 成就系列对应顺序
 * @property {string} Name - 成就系列名称
 * @property FinishReward - 成就系列完成奖励
 * @description 某些成就系列没有完成奖励，这边的FinishReward可能为undefined
 * @property {number} FinishReward.ID - 物品ID，这边指的应该是成就名片ID
 * @property {number} FinishReward.Count - 物品数量
 * @property {string} Icon - 成就系列图标
 * @return AchievementGoal
 */
export interface AchievementGoal {
	Id: number;
	Order: number;
	Name: string;
	FinishReward?: {
		ID: number;
		Count: number;
	};
	Icon: string;
}
