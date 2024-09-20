-- @file plugins/Sqlite/sql/createTable.sql
-- @brief sqlite数据库创建表语句
-- @since Beta v0.6.0

-- @brief 重新创建成就数据表
drop table if exists Achievements;
-- @brief 创建成就数据表
create table if not exists Achievements
(
    id            integer not null,
    uid           integer not null,
    isCompleted   boolean default false,
    completedTime text,
    progress      integer default 0,
    updated       text,
    primary key (id, uid)
);

-- @brief 重新创建成就系列数据表
drop table if exists AchievementSeries;

-- @brief 创建角色数据表
create table if not exists AppCharacters
(
    id       integer primary key,
    name     text,
    title    text,
    birthday text,
    star     integer,
    element  text,
    weapon   text,
    nameCard text,
    updated  text
);

-- @brief 创建应用数据表
create table if not exists AppData
(
    key     text primary key,
    value   text,
    updated text
);

-- @brief 创建游戏账号数据表
create table if not exists GameAccount
(
    gameBiz    text,
    gameUid    text,
    isChosen   boolean,
    isOfficial boolean,
    level      integer,
    nickname   text,
    region     text,
    regionName text,
    updated    text,
    primary key (gameBiz, gameUid)
);

-- @brief 名片数据表
create table if not exists NameCard
(
    name    text,
    desc    text,
    type    text,
    source  text,
    updated text,
    primary key (name, type)
);

-- @brief 创建深渊数据表
create table if not exists SpiralAbyss
(
    uid              text,
    id               integer,
    startTime        text,
    endTime          text,
    totalBattleTimes integer,
    totalWinTimes    integer,
    maxFloor         text,
    totalStar        integer,
    isUnlock         boolean,
    revealRank       text,
    defeatRank       text,
    damageRank       text,
    takeDamageRank   text,
    normalSkillRank  text,
    energySkillRank  text,
    floors           text,
    updated          text,
    primary key (uid, id)
);

-- @brief 创建战绩数据表
create table if not exists UserRecord
(
    uid          integer primary key,
    role         text,
    avatars      text,
    stats        text,
    worldExplore text,
    homes        text,
    updated      text
);

-- @brief 创建角色数据表
create table if not exists UserCharacters
(
    uid            integer,
    cid            integer,
    avatar         text,
    weapon         text,
    relics         text,
    constellations text,
    costumes       text,
    skills         text,
    propSelected   text,
    propBase       text,
    propExtra      text,
    propRecommend  text,
    updated        text,
    primary key (uid, cid)
);

-- @brief 创建祈愿数据表
create table if not exists GachaRecords
(
    id        text primary key not null,
    uid       text,
    gachaType text,
    uigfType  text,
    time      text,
    itemId    text,
    name      text,
    type      text,
    rank      text,
    count     text,
    updated   text
);

-- @brief 创建用户帖子收藏
create table if not exists UFPost
(
    id      text not null, -- 帖子ID
    title   text not null, -- 帖子标题
    content text,          -- 帖子内容
    updated text not null, -- 收藏时间
    primary key (id)
);

-- @brief 创建用户帖子合集
create table if not exists UFCollection
(

    id      integer primary key autoincrement,-- 自增合集ID
    title   text not null,                    -- 合集标题
    desc    text,                             -- 合集描述
    updated text not null                     -- 创建时间
);

-- @brief 创建用户帖子收藏-合集对照表
create table if not exists UFMap
(
    postId       text    not null, -- 帖子ID
    collectionId integer not null, -- 合集ID
    post         text    not null, -- 帖子标题
    collection   text    not null, -- 合集标题
    desc         text,             -- 合集描述
    updated      text    not null, -- 收藏时间
    primary key (postId, collectionId)
);
