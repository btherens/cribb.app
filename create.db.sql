CREATE DATABASE `cribdb`;
/* create the new user (use unique value for 'password') */
CREATE USER 'cribPhpAccess'@'localhost' identified by 'password';
/* give access to this specific database only */
GRANT ALL PRIVILEGES ON cribdb.* TO 'cribPhpAccess'@'localhost';
/* reload access tables */
FLUSH PRIVILEGES;

/* functions (for mariadb only) */
DROP FUNCTION IF EXISTS `bin_to_uuid`;
DROP FUNCTION IF EXISTS `uuid_to_bin`;

DELIMITER $$

CREATE FUNCTION `bin_to_uuid`($b binary(16) ) RETURNS char(36) CHARSET utf8mb3
    NO SQL
    DETERMINISTIC
BEGIN
    /* result will be formatted as GUID string */
    DECLARE $u CHAR(36) DEFAULT NULL;
    IF $b IS NOT NULL THEN
        SET $u =
            CONCAT(
                HEX(SUBSTRING( $b, 4, 1 ) ), HEX( SUBSTRING( $b, 3, 1 ) ),
                HEX(SUBSTRING( $b, 2, 1 ) ), HEX( SUBSTRING( $b, 1, 1 ) ), '-',
                HEX(SUBSTRING( $b, 6, 1 ) ), HEX( SUBSTRING( $b, 5, 1 ) ), '-',
                HEX(SUBSTRING( $b, 8, 1 ) ), HEX( SUBSTRING( $b, 7, 1 ) ), '-',
                HEX(SUBSTRING( $b, 9, 2 ) ), '-', HEX( SUBSTRING( $b, 11, 6 ) ) );
    END IF;
    RETURN $u;
END$$


CREATE FUNCTION `uuid_to_bin`($u char(36) ) RETURNS binary(16)
    NO SQL
    DETERMINISTIC
BEGIN
    /* return object is 16 bit binary */
    DECLARE $b BINARY(16) DEFAULT NULL;
    /* process guid if value is not null */
    IF $u IS NOT NULL THEN
        /* remove hyphens */
        SET $u = REPLACE( $u, '-', '' );
        /* unhex values with mappings to 16 bit output */
        SET $b =
            CONCAT( UNHEX( SUBSTRING( $u, 7,  2  ) ), UNHEX( SUBSTRING( $u, 5,  2 ) ),
                    UNHEX( SUBSTRING( $u, 3,  2  ) ), UNHEX( SUBSTRING( $u, 1,  2 ) ),
                    UNHEX( SUBSTRING( $u, 11, 2  ) ), UNHEX( SUBSTRING( $u, 9,  2 ) ),
                    UNHEX( SUBSTRING( $u, 15, 2  ) ), UNHEX( SUBSTRING( $u, 13, 2 ) ),
                    UNHEX( SUBSTRING( $u, 17, 16 ) ) );
    END IF;
    RETURN $b;
END$$

DELIMITER ;

/* run this to wipe definition */
DROP TABLE     IF EXISTS `blockwords`;
DROP VIEW      IF EXISTS `vtimestamp`;
DROP VIEW      IF EXISTS `vgame_activity_latest`;
DROP VIEW      IF EXISTS `vgame_activity_count`;
DROP VIEW      IF EXISTS `vgame_activity_sum`;
DROP VIEW      IF EXISTS `vgame_activity_round_latest`;
DROP VIEW      IF EXISTS `vgame_activity_round_count`;
DROP VIEW      IF EXISTS `vgame_activity_round_sum`;
DROP VIEW      IF EXISTS `vgame_activity_new`;
DROP VIEW      IF EXISTS `vgame_activity_stat`;
DROP VIEW      IF EXISTS `vgame_result`;
DROP VIEW      IF EXISTS `vgamelist`;
DROP VIEW      IF EXISTS `vgamedetail`;
DROP VIEW      IF EXISTS `vavatar`;
DROP VIEW      IF EXISTS `vname`;
DROP VIEW      IF EXISTS `vsession`;
DROP VIEW      IF EXISTS `vpushsubscription`;
DROP PROCEDURE IF EXISTS `requestPushQueue`;
DROP FUNCTION  IF EXISTS `setPushTimestamp`;
DROP FUNCTION  IF EXISTS `createGame`;

DROP TABLE IF EXISTS `params`;

DROP TABLE IF EXISTS `game_result`;
DROP TABLE IF EXISTS `game_activity`;
DROP TABLE IF EXISTS `game`;

DROP TABLE IF EXISTS `fidokey`;
DROP TABLE IF EXISTS `pushsubscription`;
DROP TABLE IF EXISTS `session`;
DROP TABLE IF EXISTS `device`;
DROP TABLE IF EXISTS `avatar`;
DROP TABLE IF EXISTS `name`;
DROP TABLE IF EXISTS `identity`;

/* simple params */
CREATE TABLE `params` (
    `key`        varchar(100) NOT NULL,
    `value`      varchar(100) NOT NULL,
    `timestamp`  timestamp    NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT   `paramsUC_key` UNIQUE ( `key` )
);
/* populate params */
INSERT INTO `params` ( `key`, `value` ) VALUES ( 'pushtimestamp', '' );

/* user identities */
CREATE TABLE `identity` (
    `id`        int(11)            NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `id_ext`    binary(16)         NOT NULL,
    `enabled`   tinyint(1)         NOT NULL DEFAULT 0,
    `timestamp` timestamp          NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT  `identityUC_idext` UNIQUE ( `id_ext` )
);

/* passkey storage */
CREATE TABLE `fidokey` (
    `id`          int(11)                NOT NULL AUTO_INCREMENT PRIMARY KEY,
    /* link login factor to an identity */
    `identity_id` int(11)                NOT NULL,
    `credId`      binary(20)             NOT NULL,
    `credKey`     varchar(255)           NOT NULL,
    `timestamp`   timestamp              NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT    `fidokeyFK_identityid` FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    CONSTRAINT    `fidokeyUC_credId`     UNIQUE      ( `credId` ),
    CONSTRAINT    `fidokeyUC_identityid` UNIQUE      ( `identity_id` )
);

/* authenticated devices */
CREATE TABLE `device` (
    `id`             int(11)               NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `identity_id`    int(11)               NOT NULL,
    `selector`       varchar(255)          NOT NULL,
    `validator_hash` varchar(255)          NOT NULL,
    `expiry`         datetime              NOT NULL,
    `timestamp`      timestamp             NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT       `deviceFK_identityid` FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    CONSTRAINT       `deviceUC_selector`   UNIQUE      ( `selector` )
);

/* active sessions */
CREATE TABLE `session` (
    `id`         int(11)       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `session_id` varchar(128)  NOT NULL,
    `device_id`  int(11)       NOT NULL,
    `expiry`     datetime      NOT NULL,
    `timestamp`  timestamp     NOT NULL DEFAULT current_timestamp(),
    UNIQUE KEY   `session_id` ( `session_id` ),
    CONSTRAINT   `sessionFK_deviceid` FOREIGN KEY (`device_id`) REFERENCES `device` (`id`) ON DELETE CASCADE
);

/* store avatar data here */
CREATE TABLE `avatar` (
    `id`                  int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `identity_id`         int(11) NOT NULL,
    `colorBackground`     int(11) NOT NULL,
    `colorSkin`           int(11) NOT NULL,
    `colorHair`           int(11) NOT NULL,
    `colorFacialHair`     int(11) NOT NULL,
    `colorHat`            int(11) NOT NULL,
    `colorGlasses`        int(11) NOT NULL,
    `colorClothing`       int(11) NOT NULL,
    `typeHair`            int(11) NOT NULL,
    `typeFacialHair`      int(11) NOT NULL,
    `typeHat`             int(11) NOT NULL,
    `typeGlasses`         int(11) NOT NULL,
    `typeClothing`        int(11) NOT NULL,
    `typeClothingGraphic` int(11) NOT NULL,
    `typeEyebrows`        int(11) NOT NULL,
    `typeEyes`            int(11) NOT NULL,
    `typeMouth`           int(11) NOT NULL,
    `timestamp`           timestamp NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT            `avatarFK_identityid` FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    INDEX                 ( `timestamp` )
);

/* store name info here */
CREATE TABLE `name` (
    `id`          int(11)     NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `identity_id` int(11)     NOT NULL,
    `string`      varchar(50) NOT NULL,
    `timestamp`   timestamp   NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT    `nameFK_identityid` FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    INDEX         ( `timestamp` )
);

/* push subscriptions */
CREATE TABLE `pushsubscription` (
    `id`        int(11)      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `device_id` int(11)      NOT NULL,
    `endpoint`  varchar(510) NOT NULL,
    `key`       binary(65)   NOT NULL,
    `token`     binary(16)   NOT NULL,
    `timestamp` timestamp    NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT  `pushsubscriptionFK_deviceid` FOREIGN KEY ( `device_id` ) REFERENCES `device` ( `id` ) ON DELETE CASCADE,
    CONSTRAINT  `pushsubscriptionUC_deviceid` UNIQUE ( `device_id` ),
    INDEX       ( `timestamp` )
);

/* game records tracked here */
CREATE TABLE `game` (
    `id`               int(11)   NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `update_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
    `timestamp`        timestamp NOT NULL DEFAULT current_timestamp()
);

/* game records tracked here */
CREATE TABLE `game_activity` (
    `id`          int(11)   NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `game_id`     int(11)   NOT NULL,
    `identity_id` int(11)   NOT NULL,
    `round`       int(11)   NOT NULL DEFAULT 0,
    `type`        char(1)   NOT NULL,
    `value`       int(11)   NOT NULL DEFAULT 0,
    `timestamp`   timestamp NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT    `gameactivityFK_identityid`       FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    CONSTRAINT    `gameactivityFK_gameid`           FOREIGN KEY ( `game_id`     ) REFERENCES `game`     ( `id` ) ON DELETE CASCADE,
    INDEX         ( `type`, `round` )
);

/* running record of games and player info */
CREATE TABLE `game_result` (
    `id`          int(11)      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `game_id`     int(11)      NOT NULL,
    `identity_id` int(11)      NOT NULL,
    `opp_id`      int(11)      NOT NULL,
    `iswin`       tinyint(1)   NOT NULL,
    `roundcount`  int(11)      NOT NULL,
    `score`       int(11)      NOT NULL,
    `minscore`    int(11)      NOT NULL,
    `maxscore`    int(11)      NOT NULL,
    `avgscore`    decimal(5,2) NOT NULL,
    `timestamp`   timestamp    NOT NULL DEFAULT current_timestamp(),
    CONSTRAINT    `gameresultFK_identityid`       FOREIGN KEY ( `identity_id` ) REFERENCES `identity` ( `id` ) ON DELETE CASCADE,
    CONSTRAINT    `gameresultFK_gameid`           FOREIGN KEY ( `game_id`     ) REFERENCES `game`     ( `id` ) ON DELETE CASCADE,
    CONSTRAINT    `gameresultUC_gameididentityid` UNIQUE ( `game_id`, `identity_id` )
);

/* update timestamp of game table on insert to game_activity */
CREATE TRIGGER `game_activityTRG_game_update_timestamp`
AFTER INSERT
ON `game_activity` FOR EACH ROW
    UPDATE `game` AS g
    SET g.`update_timestamp` = current_timestamp()
    WHERE `id` = NEW.`game_id`;

/* returns the current avatar for an identity */
CREATE VIEW `vavatar` AS
    WITH rank AS (
        SELECT a.*, ROW_NUMBER() OVER ( PARTITION BY `identity_id` ORDER BY `timestamp` DESC, `id` DESC  ) AS `r`
        FROM `avatar` a
    )
    SELECT * FROM rank WHERE `r` = 1;

/* returns the current name for an identity */
CREATE VIEW `vname` AS
    WITH rank AS (
        SELECT n.*, ROW_NUMBER() OVER ( PARTITION BY `identity_id` ORDER BY `timestamp` DESC, `id` DESC  ) AS `r`
        FROM `name` n
    )
    SELECT * FROM rank WHERE `r` = 1;

/* latest records of each type */
CREATE VIEW `vgame_activity_latest` AS
    WITH ranked AS (
        SELECT
            ga.*,
            ROW_NUMBER() OVER ( PARTITION BY `game_id`, `identity_id`, `type` ORDER BY `timestamp` DESC, `id` DESC ) AS rn
        FROM `game_activity` ga
    )
    SELECT * FROM ranked WHERE rn = 1;

/* latest records of each type in each round */
CREATE VIEW `vgame_activity_round_latest` AS
    WITH ranked AS (
        SELECT
            ga.*,
            ROW_NUMBER() OVER ( PARTITION BY `game_id`, `identity_id`, `round`, `type` ORDER BY `timestamp` DESC, `id` DESC ) AS rn
        FROM `game_activity` ga
    )
    SELECT * FROM ranked WHERE rn = 1;

/* # of records of each type */
CREATE VIEW `vgame_activity_count` AS
    SELECT
        ga.*,
        COUNT( * ) as `count`
    FROM `game_activity` ga
    GROUP BY `game_id`, `identity_id`, `type`;

CREATE VIEW `vgame_activity_round_count` AS
    SELECT
        ga.*,
        COUNT( * ) as `count`
    FROM `game_activity` ga
    GROUP BY `game_id`, `identity_id`, `round`, `type`;

/* the sum of each type */
CREATE VIEW `vgame_activity_sum` AS
    SELECT
        ga.*,
        SUM( `value` ) as `sum`
    FROM `game_activity` ga
    GROUP BY `game_id`, `identity_id`, `type`;

CREATE VIEW `vgame_activity_round_sum` AS
    SELECT
        ga.*,
        SUM( `value` ) as `sum`
    FROM `game_activity` ga
    GROUP BY `game_id`, `identity_id`, `round`, `type`;

/* return records that are more recent than other player's most recent record */
CREATE VIEW `vgame_activity_new` AS
    WITH lasttime AS (
        SELECT
            `game_id`,
            MAX( `timestamp` ) as `timestamp`
        FROM `game_activity`
        GROUP BY `game_id`
    )
    SELECT
        g.*,
        IF( t.`timestamp` <= g.`timestamp`, 1, 0 ) AS `isnew`
    FROM `game_activity` g
    JOIN lasttime t on g.`game_id` = t.`game_id`;

/* live game statistics */
CREATE VIEW `vgame_activity_stat` AS
    /* link to every game and player */
    WITH link AS (
        SELECT   `game_id`, `identity_id` FROM `game_activity`
        WHERE    'L' = `type`
        GROUP BY `game_id`, `identity_id`
    ),
    /* calculate statistics for each player */
    rng AS (
        SELECT   `game_id`, `identity_id`, MIN( `value` ) AS `minscore`, MAX( `value` ) AS `maxscore`, AVG( `value` ) AS `avgscore` FROM `game_activity`
        WHERE    'P' = `type`
        GROUP BY `game_id`, `identity_id`
    ),
    /* count number of actual rounds in the game */
    count AS (
        SELECT   `game_id`, COUNT( * ) AS `rounds` FROM `game_activity`
        WHERE    'T' = `type`
        GROUP BY `game_id`
    )
    /* assemble */
    SELECT    l.`game_id`, l.`identity_id`, IFNULL( r.`minscore`, 0 ) AS `minscore`, IFNULL( r.`maxscore`, 0 ) AS `maxscore`, IFNULL( r.`avgscore`, 0 ) AS `avgscore`, c.`rounds`
    FROM      link l
    LEFT JOIN rng r   ON r.`game_id` = l.`game_id` AND r.`identity_id` = l.`identity_id`
    JOIN      count c ON c.`game_id` = l.`game_id`;

/* get list of games for an id */
CREATE VIEW `vgamedetail` AS
    /* get a game record for each link (each identity gets its own version of record) */
    WITH gamelink AS (
        SELECT
            gl.`game_id`,
            gl.`identity_id`,
            ROW_NUMBER() OVER ( PARTITION BY `game_id` ORDER BY `timestamp` DESC, `id` DESC  ) AS `r`
        FROM `game_activity` gl
        WHERE gl.`type` = 'L'
    ),
    active as (
        SELECT
            `game_id`,
            `identity_id`,
            `type`,
            `value`,
            ROW_NUMBER() OVER ( PARTITION BY `game_id` ORDER BY `timestamp` DESC, `id` DESC ) AS `r`
        FROM `game_activity`
    ),
    setting AS (
        SELECT `game_id`, `value` FROM `vgame_activity_latest` WHERE `type` = 'S'
    ),
    round AS (
        SELECT `game_id`, `identity_id`, `round`, `value` FROM `vgame_activity_latest` WHERE `type` = 'R'
    ),
    /* the current game scores */
    scores AS (
        SELECT `game_id`, `identity_id`, `type`, `sum` FROM `vgame_activity_sum` WHERE `type` = 'P'
    ),
    /* the last score */
    score AS (
        SELECT `game_id`, `identity_id`, `type`, `value` FROM `vgame_activity_latest` WHERE `type` = 'P' 
    ),
    /* join metadata together for each player */
    pview AS (
        SELECT
            gl.`game_id`,
            gl.`identity_id`,
            gl.`r` AS `p_index`,
            /* score cannot exceed 121 */
            CAST( least( 121, sc.`sum` ) AS int ) AS `score`,
            /* last points limited by max score */
            CAST( s.`value` + least( 0, 121 - sc.`sum` ) AS int ) AS `points`
        FROM gamelink gl
        LEFT JOIN scores sc ON sc.`game_id` = gl.`game_id` AND gl.`identity_id` = sc.`identity_id`
        LEFT JOIN score  s  ON  s.`game_id` = gl.`game_id` AND gl.`identity_id` = s.`identity_id`
    )
    /* present final view */
    SELECT
        g.`id` as `game_id`,
        p1.`identity_id` AS `p1_id`,
        p2.`identity_id` AS `p2_id`,
        n.`string` as `p2_name`,
        COALESCE( p2.`p_index`, p1.`p_index` ) AS `p_index`,
        COALESCE( st.`value`, 0 ) AS `setting`,
        /* the round to present to user */
        COALESCE( r.`round`, -1 ) AS `round`,
        /* return true/false/null if crib is player's/opponent's/null */
        IF( COALESCE( r.`value`, 0 ) > 0, IF( r.`value` = p1.`p_index`, 0, 1 ), NULL ) AS `iscrib`,
        /* turn detection */
        IF(
            /* if last change was not from player and not an N */
            ( a.`identity_id` <> p1.`identity_id` AND NOT ( a.`type` = 'N' AND a.`value` IN ( 0, 1 ) ) )
            /* if last change was from player but it was an N = 1 */
         OR ( a.`identity_id` = p1.`identity_id` AND a.`type` = 'N' AND a.`value` = 1 )
            /* if type is n=2, all players get isturn flag */
         OR ( a.`type` = 'N' AND a.`value` = 2 ),
            1, 0
        ) AS `isturn`,
        /* game has been updated more recently by opponent */
        IF( a.`identity_id` <> p1.`identity_id`, 1, 0 ) AS `isnew`,
        /* show player scores if the game has started */
        IF( p2.`identity_id` IS NOT NULL, COALESCE( p1.`score`, 0 ), NULL ) AS `p1_score`,
        IF( p2.`identity_id` IS NOT NULL, COALESCE( p2.`score`, 0 ), NULL ) AS `p2_score`,
        /* each player's last point score */
        p1.`points` AS `p1_points`,
        p2.`points` AS `p2_points`,
        g.`update_timestamp` as `timestamp`
    FROM      `game`  g
    JOIN      pview   p1 ON p1.`game_id`     = g.`id`
    LEFT JOIN active  a  ON  a.`game_id`     = g.`id`       AND  a.`r` = 1
    LEFT JOIN round   r  ON  r.`game_id`     = p1.`game_id` AND  r.`identity_id`  = p1.`identity_id`
    LEFT JOIN pview   p2 ON p1.`game_id`     = p2.`game_id` AND p1.`identity_id` <> p2.`identity_id`
    LEFT JOIN setting st ON st.`game_id`     = p1.`game_id`
    LEFT JOIN `vname` n  ON p2.`identity_id` = n.`identity_id`;

/* list of games with ignore flag / opponent avatar info */
CREATE VIEW `vgamelist` AS
WITH lasttype AS (
    SELECT
        `game_id`,
        `identity_id`,
        `type`,
        row_number() over ( partition by `game_id`, `identity_id` order by `timestamp` DESC, `id` DESC ) AS `rn`
    FROM `game_activity`
)
SELECT 
    g.*,
    IF( 'I' = t.`type`, 1, 0 ) AS `ignore`,
    a.`colorBackground`,
    a.`colorSkin`,
    a.`colorHair`,
    a.`colorFacialHair`,
    a.`colorHat`,
    a.`colorGlasses`,
    a.`colorClothing`,
    a.`typeHair`,
    a.`typeFacialHair`,
    a.`typeHat`,
    a.`typeGlasses`,
    a.`typeClothing`,
    a.`typeClothingGraphic`,
    a.`typeEyebrows`,
    a.`typeEyes`,
    a.`typeMouth`
FROM `vgamedetail` g
INNER JOIN lasttype t ON t.`game_id` = g.`game_id` AND t.`identity_id` = g.`p1_id` AND 1 = `rn`
LEFT  JOIN `vavatar` a on g.`p2_id` = `a`.`identity_id`;

/* list of game results with simple player metrics (streak, maxstreak) */
CREATE VIEW `vgame_result` AS
    WITH runs AS (
        SELECT
            *,
            COUNT( CASE WHEN `iswin` = 0 THEN 0 END ) OVER ( PARTITION BY `identity_id`           ORDER BY `timestamp` ASC, `id` ASC ) AS `allgroup`,
            COUNT( CASE WHEN `iswin` = 0 THEN 0 END ) OVER ( PARTITION BY `identity_id`, `opp_id` ORDER BY `timestamp` ASC, `id` ASC ) AS `oppgroup`
        FROM `game_result`
    ),
    strk AS (
        SELECT
            *,
            ROW_NUMBER() OVER ( PARTITION BY `identity_id`, `allgroup` ORDER BY `timestamp` ASC, `id` ASC ) - IF( 0 = `allgroup`, 0, 1 ) AS `allstreak`,
            ROW_NUMBER() OVER ( PARTITION BY `identity_id`, `opp_id`, `oppgroup`   ORDER BY `timestamp` ASC, `id` ASC ) - IF( 0 = `oppgroup`,   0, 1 ) AS `oppstreak`
        FROM runs
    )
    SELECT  s.*,
            ( SELECT MAX( `as`.`allstreak` ) FROM strk `as` WHERE `as`.`identity_id` = s.`identity_id` AND `as`.`timestamp` <= s.`timestamp` ) AS `maxallstreak`,
            ( SELECT MAX( `os`.`oppstreak` ) FROM strk `os` WHERE `os`.`identity_id` = s.`identity_id` AND `os`.`opp_id` = s.`opp_id` AND `os`.`timestamp` <= s.`timestamp` ) AS `maxoppstreak`
    FROM    strk s;


/* lookup most recent activity date for an id */
CREATE VIEW `vtimestamp` AS
    WITH agg AS (
        /* collect timestamps together by id */
        SELECT
            /* identity info */
            `i`.`id`        AS `id`,
            /* select the most recent timestamp from each id-joined table */
            /* identity */
            `i`.`timestamp` AS `idt`,
            /* avatar */
            a.`timestamp` AS `adt`,
            /* name */
            `n`.`timestamp` AS `ndt`,
            /* games */
            `g`.`timestamp` AS `gdt`
            FROM `identity` `i`
            /* joins */
            LEFT JOIN `vavatar` `a` ON `a`.`identity_id` = `i`.`id`
            LEFT JOIN `vname`   `n` ON `n`.`identity_id` = `i`.`id`
            LEFT JOIN (
                SELECT     ga.`identity_id`, MAX( g.`update_timestamp` ) AS `timestamp`
                FROM       `game` g
                INNER JOIN `game_activity` ga ON g.`id` = ga.`game_id`
                GROUP BY   ga.`identity_id`
            ) `g` ON `g`.`identity_id` = `i`.`id`
    )
    /* return identity id and the > most recent timestamp from select above */
    SELECT
        agg.`id` AS `id`,
        greatest(
            ifnull( agg.`idt`, 0 ),
            ifnull( agg.`adt`, 0 ),
            ifnull( agg.`ndt`, 0 ),
            ifnull( agg.`gdt`, 0 )
        ) AS `timestamp`
    FROM agg;

/* a view of session that trims all but most recent session for a given device */
CREATE VIEW `vsession` AS
    WITH ranked AS (
        SELECT
            s.*,
            ROW_NUMBER() OVER ( PARTITION BY `device_id` ORDER BY `timestamp` DESC, `id` DESC ) AS rn
        FROM `session` s
    )
    SELECT * FROM ranked WHERE rn = 1;

/* ordered view of push subscriptions */
CREATE VIEW `vpushsubscription` AS
    WITH cte AS (
        SELECT
            p.`id`,
            i.`id` AS `identity_id`,
            p.`device_id`,
            p.`endpoint`,
            p.`key`,
            p.`token`,
            /* prioritize last active session for each identity */
            ROW_NUMBER() OVER ( PARTITION BY i.`id` ORDER BY s.`timestamp` DESC, s.`id` DESC ) AS `r`
        FROM `identity`         i
        JOIN `device`           d ON d.`identity_id` = i.`id`
        JOIN `vsession`         s ON s.`device_id`   = d.`id`
        JOIN `pushsubscription` p ON p.`device_id`   = d.`id`
    )
    SELECT * FROM cte WHERE `r` < 5;

DELIMITER $$

/* create a new game, link calling id, and return gid for lookups */
CREATE FUNCTION `createGame`( identity int(11), opp int(11) ) RETURNS int(11)
BEGIN
    DECLARE gid     int(11);
    DECLARE setting int(11);
    /* create game record */
    INSERT INTO `game` ( `timestamp` ) SELECT CURRENT_TIMESTAMP;
    /* keep track of created id */
    SELECT last_insert_id() INTO gid;
    /* attach identity id to game */
    INSERT INTO `game_activity` ( `game_id`, `identity_id`, `round`, `type` ) SELECT gid, identity, -1, 'L';
    /* attach opponent id to game if available */
    IF opp IS NOT NULL THEN
    INSERT INTO `game_activity` ( `game_id`, `identity_id`, `round`, `type` ) SELECT gid, opp,      -1, 'L';
    END IF;
    /* copy last setting */
    SELECT       `value` INTO setting FROM `game_activity` WHERE identity = `identity_id` AND `type` = 'S' ORDER BY `timestamp` DESC, `id` DESC LIMIT 1;
    IF           setting IS NOT NULL THEN
    INSERT INTO `game_activity` ( `game_id`, `identity_id`, `round`, `type`, `value` ) SELECT gid, identity, -1, 'S', setting;
    END IF;
    /* return game id */
    RETURN gid;
END$$

/* set a new timestamp to pushtimestamp property, returning old timestamp */
CREATE FUNCTION `setPushTimestamp`( newtimestamp timestamp ) RETURNS timestamp
BEGIN
    /* get previous timestamp */
    DECLARE oldtimestamp timestamp;
    SELECT  `timestamp` INTO oldtimestamp FROM `params` WHERE `key` = 'pushtimestamp';
    /* set new timestamp to model */
    UPDATE  `params`    SET  `timestamp` = newtimestamp WHERE `key` = 'pushtimestamp';
    /* return previous timestamp up to a maximum of 10 minutes */
    RETURN oldtimestamp;
END$$

/* request list of push notifications from newtimestamp (default is now) */
CREATE PROCEDURE `requestPushQueue`( newtimestamp timestamp )
BEGIN
    /* date range minimum */
    DECLARE oldtimestamp timestamp;

    /* explicit newtimestamp has window of 10 minutes */
    IF  newtimestamp IS NOT NULL THEN SET oldtimestamp = ( newtimestamp - INTERVAL 10 MINUTE ); END IF;
    /* defaults */
    /* newtimestamp: now */
    SET newtimestamp = IFNULL( newtimestamp, now() );
    /* oldtimestamp: last run from model */
    SET oldtimestamp = IFNULL( oldtimestamp, GREATEST( `setPushTimestamp`( newtimestamp ), newtimestamp - INTERVAL 10 MINUTE ) );

    /* return list of push notifications with subscription info */
    WITH
        badges AS (
            SELECT `p1_id`, SUM( `isturn` ) AS `badge` FROM `vgamedetail` WHERE 0 < `round` GROUP BY `p1_id`
        ),
        updates AS (
            SELECT `game_id`, `p1_id`, `p2_name`, `timestamp`
            FROM   `vgamedetail`
            WHERE  1 = `isnew` AND 1 = `isturn` AND `timestamp` BETWEEN oldtimestamp AND newtimestamp
        )
    SELECT u.*, p.`id`, p.`endpoint`, p.`key`, p.`token`, b.`badge`, 'aesgcm' AS `encoding`
    FROM   updates u
    JOIN   `vpushsubscription` p ON p.`identity_id` = u.`p1_id`
    JOIN   badges b ON b.`p1_id` = u.`p1_id`
    LIMIT  100;
END$$

DELIMITER ;

/* blocked words in user strings */
CREATE TABLE `blockwords` (
    `id`          int(11)      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `word`        varchar(50)  NOT NULL
);

/* supply a word list to block */
-- INSERT INTO `blockwords` ( `word` ) VALUES ( 'badword1' ), ...;
