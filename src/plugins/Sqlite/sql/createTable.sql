-- @file plugins Sqlite sql createTable.sql
-- @brief sqlite数据库创建表语句
-- @author BTMuli <bt-muli@outlook.com>
-- @since Alpha v0.2.3

-- @brief 创建成就数据表
create table if not exists Achievements
(
    id            integer primary key,
    series        integer,
    `order`       integer,
    name          text,
    description   text,
    reward        integer,
    isCompleted   boolean default false,
    completedTime text,
    progress      integer default 0,
    version       text,
    updated       text
);

-- @brief 创建成就系列数据表
create table if not exists AchievementSeries
(
    id         integer primary key,
    `order`    integer,
    name       text,
    version    text,
    totalCount integer default 0,
    finCount   integer default 0,
    nameCard   text,
    updated    text
);

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
    uid                 integer,
    cid                 integer,
    img                 text,
    name                text,
    fetter              integer,
    level               integer,
    element             text,
    star                integer,
    weapon              text,
    reliquary           text,
    constellation       text,
    activeConstellation integer,
    costume             text,
    talent              text,
    updated             text,
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
