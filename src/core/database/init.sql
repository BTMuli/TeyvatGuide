/* 
 * @file core database init.sql
 * @description SQLite 初始化
 * @author BTMuli<bt-muli@outlook>
 * @since Alpha v0.1.4
 */

-- /////////////////////////////
-- 创建各种表
-- /////////////////////////////
-- ----------------------------
-- 成就系列表
-- @table AchievementSeries
-- @field {number} id 成就系列ID，主键
-- @field {number} order 成就系列排列顺序
-- @field {string} name 成就系列名称
-- @field {string} version 成就系列版本
-- @field {number} totalCount 成就系列总成就数
-- @field {number} finCount 成就系列已完成成就数
-- @field {string} icon 成就系列图标
-- @field {string} nameCard 成就系列名片名称
-- @field {string} updated 数据更新时间
-- ----------------------------
CREATE TABLE IF NOT EXISTS AchievementSeries
(
    id         INTEGER PRIMARY KEY,
    "order"    INTEGER,
    name       TEXT    DEFAULT NULL,
    version    TEXT    DEFAULT NULL,
    totalCount INTEGER DEFAULT 0,
    finCount   INTEGER DEFAULT 0,
    icon       TEXT    NOT NULL,
    nameCard   TEXT    DEFAULT NULL,
    updated    TEXT    DEFAULT NULL
);
-- ----------------------------
-- 成就数据表
-- @table Achievements
-- @field {number} id 成就ID，主键
-- @field {number} series 成就系列ID，为成就系列表的主键
-- @field {number} order 成就排序
-- @field {string} name 成就名称
-- @field {string} description 成就描述
-- @field {number} reward 成就奖励
-- @field {boolean} isCompleted 成就是否已完成，默认为false
-- @field {string} completedTime 成就完成时间，默认为null
-- @field {number} progress 成就进度，默认为0
-- @field {string} version 成就版本
-- @field {string} updated 数据更新时间
-- ----------------------------
CREATE TABLE IF NOT EXISTS Achievements
(
    id            INTEGER PRIMARY KEY,
    series        INTEGER,
    "order"       INTEGER,
    name          TEXT    DEFAULT NULL,
    description   TEXT    DEFAULT NULL,
    reward        INTEGER DEFAULT 0,
    isCompleted   BOOLEAN DEFAULT 0,
    completedTime TEXT    DEFAULT NULL,
    progress      INTEGER DEFAULT 0,
    version       TEXT    DEFAULT NULL,
    updated       TEXT    DEFAULT NULL
);

-- /////////////////////////////
-- 创建各种触发器
-- /////////////////////////////
-- ----------------------------
-- 成就系列数据插入触发器
-- @trigger SeriesInsert
-- @description 当成就系列数据插入时，更新更新时间
-- ----------------------------
CREATE TRIGGER IF NOT EXISTS SeriesInsert
    AFTER INSERT
    ON AchievementSeries
    FOR EACH ROW
BEGIN
    UPDATE AchievementSeries SET updated = datetime('now') WHERE id = NEW.id;
END;
-- ----------------------------
-- 成就系列数据更新触发器
-- @trigger SeriesUpdate
-- @description 当成就系列数据更新时，更新更新时间
-- ----------------------------
CREATE TRIGGER IF NOT EXISTS SeriesUpdate
    AFTER UPDATE
        OF totalCount, finCount, version
    ON AchievementSeries
    FOR EACH ROW
BEGIN
    UPDATE AchievementSeries SET updated = datetime('now') WHERE id = NEW.id;
END;
-- ----------------------------
-- 成就数据插入触发器
-- @trigger AchievementInsert
-- @description 当成就数据插入时，更新成就系列表中的数据
-- ----------------------------
CREATE TRIGGER IF NOT EXISTS AchievementInsert
    AFTER INSERT
    ON Achievements
    FOR EACH ROW
BEGIN
    -- 更新更新时间
    UPDATE Achievements SET updated = datetime('now') WHERE id = NEW.id;
    -- 更新成就系列总数
    UPDATE AchievementSeries SET totalCount = AchievementSeries.totalCount + 1 WHERE id = NEW.series;
    -- 如果是已完成成就，则更新成就系列完成数
    UPDATE AchievementSeries
    SET finCount = AchievementSeries.finCount + 1
    WHERE NEW.isCompleted = 1 AND id = NEW.series;
    -- 如果成就系列版本低于成就版本，则更新成就系列版本
    UPDATE AchievementSeries SET version = NEW.version WHERE version < NEW.version AND id = NEW.series;
END;
-- ----------------------------
-- 成就数据更新触发器
-- @trigger AchievementUpdate
-- @description 当成就数据更新时，更新成就系列表中的数据
-- ----------------------------
CREATE TRIGGER IF NOT EXISTS AchievementUpdate
    AFTER UPDATE
        OF isCompleted, completedTime, progress
    ON Achievements
    FOR EACH ROW
BEGIN
    -- 更新更新时间
    UPDATE Achievements
    SET updated = datetime('now')
    WHERE id = NEW.id;
    -- 如果是已完成成就，则更新成就系列完成数
    UPDATE AchievementSeries
    SET finCount = AchievementSeries.finCount + 1
    WHERE id = NEW.series
      AND OLD.isCompleted = 0
      AND NEW.isCompleted = 1;
    -- 如果是未完成成就，则更新成就系列完成数
    UPDATE AchievementSeries
    SET finCount = AchievementSeries.finCount - 1
    WHERE id = NEW.series
      AND OLD.isCompleted = 1
      AND NEW.isCompleted = 0;
END;
