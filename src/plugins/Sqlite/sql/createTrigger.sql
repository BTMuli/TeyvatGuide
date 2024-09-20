-- @file plugins/Sqlite/sql/createTrigger.sql
-- @brief 创建触发器
-- @since Beta v0.6.0

-- @brief 重新创建成就表插入触发器
drop trigger if exists insertAchievement;

-- @brief 重新创建成就表更新触发器
drop trigger if exists updateAchievement;
