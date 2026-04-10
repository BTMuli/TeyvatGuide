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
 * 获取探索派遣状态描述
 * @since Beta v0.10.0
 * @param status - 探索派遣状态
 * @returns 探索派遣状态描述
 */
function getExpeditionStatusDesc(status: TGApp.Game.DailyNote.ExpeditionStatusEnum): string {
  switch (status) {
    case ExpeditionStatusEnum.ONGOING:
      return "派遣中";
    case ExpeditionStatusEnum.FINISHED:
      return "已完成";
  }
}

/**
 * 任务奖励状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.TaskRewardStatusEnum
 */
const TaskRewardStatusEnum: typeof TGApp.Game.DailyNote.TaskRewardStatus = {
  UNFINISHED: "TaskRewardStatusUnfinished",
  FINISHED: "TaskRewardStatusFinished",
  RECEIVED: "TaskRewardStatusReceived",
};

/**
 * 获取任务奖励状态描述
 * @since Beta v0.10.0
 * @param status - 任务奖励状态
 * @returns 任务奖励状态描述
 */
function getTaskRewardStatusDesc(status: TGApp.Game.DailyNote.TaskRewardStatusEnum): string {
  switch (status) {
    case TaskRewardStatusEnum.UNFINISHED:
      return "未完成";
    case TaskRewardStatusEnum.FINISHED:
      return "已完成";
    case TaskRewardStatusEnum.RECEIVED:
      return "已领取";
  }
}

/**
 * 历练点奖励状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.AttendanceRewardStatusEnum
 */
const AttendanceRewardStatusEnum: typeof TGApp.Game.DailyNote.AttendanceRewardStatus = {
  UNFINISHED: "AttendanceRewardStatusUnfinished",
  TAKEN: "AttendanceRewardStatusTakenAward",
};

/**
 * 获取历练点奖励状态描述
 * @since Beta v0.10.0
 * @param status - 历练点奖励状态
 * @returns 历练点奖励状态描述
 */
function getAttendanceRewardStatusDesc(
  status: TGApp.Game.DailyNote.AttendanceRewardStatusEnum,
): string {
  switch (status) {
    case AttendanceRewardStatusEnum.UNFINISHED:
      return "未完成";
    case AttendanceRewardStatusEnum.TAKEN:
      return "已领取";
  }
}

/**
 * 参量质变仪状态枚举
 * @since Beta v0.10.0
 * @see TGApp.Game.DailyNote.TransformerStatusEnum
 */
const TransformerStatusEnum: typeof TGApp.Game.DailyNote.TransformerStatus = {
  OBTAINED: "Obtained",
  NOT_OBTAINED: "NotObtained",
};

/**
 * 实时便笺枚举
 * @since Beta v0.10.0
 */
const dailyNoteEnum = {
  expedition: {
    status: ExpeditionStatusEnum,
    statusDesc: getExpeditionStatusDesc,
  },
  taskReward: {
    status: TaskRewardStatusEnum,
    statusDesc: getTaskRewardStatusDesc,
  },
  attendanceReward: {
    status: AttendanceRewardStatusEnum,
    statusDesc: getAttendanceRewardStatusDesc,
  },
  transformer: {
    status: TransformerStatusEnum,
  },
};

export default dailyNoteEnum;
