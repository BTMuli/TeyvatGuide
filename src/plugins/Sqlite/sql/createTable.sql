-- sqlite数据库创建表语句
-- @since Beta v0.11.5

-- @brief 创建养成计划表
create table if not exists CultivationProject
(
    id       text    not null primary key,
    uid      integer not null,
    name     text    not null,
    isChosen boolean default false,
    timezone integer default 8,
    created  text    not null,
    updated  text    not null,
    unique (uid, name)
);

-- @brief 创建养成目标表
create table if not exists CultivationEntry
(
    id           text    not null primary key,
    projectId    text    not null,
    type         text    not null check (type in ('avatar', 'weapon')),
    itemId       integer not null,
    instanceKey  text    not null default '',
    name         text    not null,
    icon         text    not null,
    star         integer not null,
    currentState text    not null,
    targetState  text    not null,
    status       text    not null default 'active' check (status in ('active', 'completed')),
    sortOrder    integer not null default 0,
    calculationMode text not null default 'bag' check (calculationMode in ('bag', 'api')),
    allowCrafting boolean not null default true,
    useDust       boolean not null default false,
    useSolvent    boolean not null default false,
    created      text    not null,
    updated      text    not null,
    unique (projectId, type, itemId, instanceKey)
);

-- @brief 创建养成目标材料表
create table if not exists CultivationItem
(
    entryId    text    not null,
    materialId integer not null,
    required   integer not null default 0,
    primary key (entryId, materialId)
);

-- @brief 创建养成目标接口计算结果表
create table if not exists CultivationApiResult
(
    projectId    text not null,
    avatarEntryId text not null default '',
    weaponEntryId text not null default '',
    result       text not null,
    updated      text not null,
    primary key (projectId, avatarEntryId, weaponEntryId)
);

create index if not exists CultivationProjectUidIndex on CultivationProject (uid);
create index if not exists CultivationEntryProjectIndex on CultivationEntry (projectId);
create index if not exists CultivationApiResultProjectIndex on CultivationApiResult (projectId);

-- @brief 创建背包物品材料表
create table if not exists UserBagMaterial
(
    uid     integer not null,
    id      integer not null,
    count   integer default 0,
    records text,
    updated text,
    primary key (uid, id)
);

-- @brief 创建背包物品武器表
create table if not exists UserBagWeapon
(
    uid     integer not null,
    guid    text    not null,
    id      integer not null,
    info    text,
    updated text,
    primary key (uid, guid)
);

-- @brief 创建背包物品圣遗物表
create table if not exists UserBagRelic
(
    guid      text    not null,
    uid       integer not null,
    id        integer not null,
    sets      integer,
    brief     text,
    mp        text,
    sp        text,
    is_locked boolean default false,
    is_marked boolean default false,
    level     integer default 0,
    updated   text,
    primary key (uid, guid)
);

-- @brief 创建背包角色表
create table if not exists UserBagAvatar
(
    uid     integer not null,
    rid     integer not null,
    equips  text,
    raw     text,
    updated text,
    primary key (uid, rid)
);

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

-- @brief 创建应用数据表
create table if not exists AppData
(
    key     text primary key,
    value   text,
    updated text
);

-- @brief 创建用户数据表
create table if not exists UserAccount
(
    uid     text primary key,
    cookie  text,
    brief   text,
    updated text
);

-- @brief 创建游戏账号数据表
create table if not exists GameAccount
(
    uid        text not null,
    gameBiz    text not null,
    gameUid    text not null,
    isChosen   boolean,
    isOfficial boolean,
    level      integer,
    nickname   text,
    region     text,
    regionName text,
    updated    text,
    primary key (uid, gameBiz, gameUid)
);

-- @brief 创建游戏安装档案表
create table if not exists GameInstallation
(
    id              text    not null primary key,
    executablePath  text    not null unique,
    rootPath        text    not null,
    preferredScheme text,
    audioLanguages  text    not null default '[]',
    isChosen        boolean not null default false,
    lastSeen        text    not null
);

create unique index if not exists GameInstallationChosenIndex
    on GameInstallation (isChosen)
    where isChosen = 1;

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
    skippedFloor     text,
    updated          text,
    primary key (uid, id)
);

-- @brief 创建幻想真境剧诗数据表
create table if not exists RoleCombat
(
    uid           text,
    id            integer,
    startTime     text,
    endTime       text,
    hasData       boolean,
    hasDetailData boolean,
    stat          text,
    detail        text,
    updated       text,
    primary key (uid, id)
);

-- @brief 创建幽境危战数据表
create table if not exists HardChallenge
(
    uid       text,
    id        integer,
    startTime text,
    endTime   text,
    name      text,
    single    text,
    mp        text,
    blings    text,
    updated   text,
    primary key (uid, id)
);

-- @brief 创建原始战绩快照表
create table if not exists UserRecordRaw
(
    uid     integer primary key not null,
    rawData text    not null,
    updated text    not null
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

-- @brief 创建颂愿数据表
create table if not exists GachaBRecords
(
    id          text primary key not null,
    uid         text,
    region      text, -- @deprecated
    scheduleId  text,
    gachaType   text,
    opGachaType text,
    time        text,
    itemId      text,
    name        text,
    type        text,
    rank        text,
    isUp        text, -- @deprecated
    updated     text
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
