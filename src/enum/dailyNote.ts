/**
 * 实时便笺相关枚举
 * @since Beta v0.10.0
 */

/**
 * 探索派遣状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.ExpeditionStatusEnum
 */
const ExpeditionStatusEnum: typeof TGApp.Game.DailyNote.ExpeditionStatus = {
  ONGOING: "Ongoing",
  FINISHED: "Finished",
};

/**
 * 任务奖励状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.TaskRewardStatusEnum
 */
const TaskRewardStatusEnum: typeof TGApp.Game.DailyNote.TaskRewardStatus = {
  INVALID: "TaskRewardStatusInvalid",
  TAKEN: "TaskRewardStatusTakenAward",
  FINISHED: "TaskRewardStatusFinished",
  UNFINISHED: "TaskRewardStatusUnfinished",
};

/**
 * 历练点奖励状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.AttendanceRewardStatusEnum
 */
const AttendanceRewardStatusEnum: typeof TGApp.Game.DailyNote.AttendanceRewardStatus = {
  FORBID: "AttendanceRewardStatusForbid",
  INVALID: "AttendanceRewardStatusInvalid",
  NON_REWARD: "AttendanceRewardStatusFinishedNonReward",
  WAIT_TAKEN: "AttendanceRewardStatusWaitTaken",
  UNFINISHED: "AttendanceRewardStatusUnfinished",
  TAKEN: "AttendanceRewardStatusTakenAward",
};

/**
 * 任务状态枚举
 * @since Beta v0.10.0
 */
const AnchorQuestStatusEnum: typeof TGApp.Game.DailyNote.ArchonStatus = {
  FINISHED: "StatusFinished",
  ONGOING: "StatusOngoing",
  NOT_OPEN: "StatusNotOpen",
};

/**
 * 实时便笺枚举
 * @since Beta v0.10.0
 */
const dnEnum = {
  expedition: ExpeditionStatusEnum,
  task: TaskRewardStatusEnum,
  attendance: AttendanceRewardStatusEnum,
  quest: AnchorQuestStatusEnum,
};

export default dnEnum;
