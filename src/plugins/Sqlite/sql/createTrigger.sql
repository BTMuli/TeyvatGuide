-- @file plugins Sqlite sql createTrigger.sql
-- @brief 创建触发器
-- @author BTMuli <bt-muli@outlook.com>
-- @since Alpha v0.2.0

-- @brief 成就表相关
create trigger if not exists insertAchievement
    after insert
    on Achievements
    for each row
begin
    update AchievementSeries
    set totalCount = totalCount + 1,
        updated    = datetime('now', 'localtime')
    where id = new.series;
    update AchievementSeries
    set version = new.version,
        updated = datetime('now', 'localtime')
    where id = new.series
      and new.version > version;
end;

create trigger if not exists updateAchievement
    after update
    on Achievements
    for each row
begin
    update AchievementSeries
    set updated  = datetime('now', 'localtime'),
        finCount = finCount + 1
    where id = new.series
      and old.isCompleted = 0
      and new.isCompleted = 1;
    update AchievementSeries
    set updated  = datetime('now', 'localtime'),
        finCount = finCount - 1
    where id = new.series
      and old.isCompleted = 1
      and new.isCompleted = 0;
end;