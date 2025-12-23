/**
 * 静态 JSON 数据对应的枚举类型
 * @since Beta v0.9.1
 */

/**
 * 日历数据项类型枚举
 * @since Beta v0.9.1
 */
const CalendarItemTypeEnum: typeof TGApp.App.Calendar.ItemType = {
  role: "character",
  weapon: "weapon",
};

/** 静态 JSON 数据对应的枚举集合 */
const staticDataEnum = {
  calendarItem: CalendarItemTypeEnum,
};

export default staticDataEnum;
