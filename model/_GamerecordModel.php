<?php

class _GamerecordModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    /* return a player's record vs (1) all players, or (2) an opponent if included */
    public function getPlayerRecord( int $identity_id, int $opp_id = null ): ?array
    {
        $response = null;
        $q = $this->run(
            'WITH
                args AS ( SELECT ? AS `identity_id`, ? AS `opp_id` ),
                dta  AS (
                    SELECT r.`id`,
                           r.`identity_id`,
                           r.`timestamp`,
                           ROW_NUMBER() OVER ( PARTITION BY r.`identity_id`, r.`opp_id` ORDER BY r.`timestamp` DESC, r.`id` DESC ) AS `r`,
                           IF( a.`opp_id` IS NULL, r.`allstreak`, r.`oppstreak` ) AS `streak`,
                           IF( a.`opp_id` IS NULL, r.`maxallstreak`, r.`maxoppstreak` ) AS `maxstreak`
                    FROM   `vgame_result` r
                    JOIN   args a ON 1 = 1
                    WHERE  ( r.`identity_id` = a.`identity_id` AND ( a.`opp_id` IS NULL OR r.`opp_id` = a.`opp_id` ) ) OR ( r.`identity_id` = a.`opp_id` AND r.`opp_id` = a.`identity_id` )
                )
            SELECT   *
            FROM     dta
            WHERE    1 = `r`
            ORDER BY `timestamp` DESC, `id` DESC LIMIT 2;',
            [ $identity_id, $opp_id ]
        );
        if ( $c = $q->fetch() )
        {
            $response = [ null, null ];
            do
            {
                $response[ $c->identity_id == $identity_id ? 0 : 1 ] = (object) [ 'streak' => $c->streak, 'maxstreak' => $c->maxstreak ];
            }
            while ( !is_null( $opp_id ) && $c = $q->fetch() );
        }

        //if ( $c = $q->fetch() ) { $response = $c; }
        return $response;
    }

    /* return a game result if one was saved */
    public function getGameRecord( int $gid, int $identity_id ): ?array
    {
        /* null response */
        $a = [ null, null ];
        /* query */
        $q = $this->run(
            'SELECT `identity_id`, `iswin`, `roundcount`, `score`, `minscore`, `maxscore`, `avgscore`, `oppstreak`, `maxoppstreak` FROM `vgame_result` WHERE ? = `game_id` LIMIT 2',
            [ $gid ]
        );
        /* set both player and opponent records to response */
        while ( $row = $q->fetch() )
        {
            $a[ $row->identity_id == $identity_id ? 0 : 1 ] = $row;
        }
        /* return null if no game results were found */
        if ( ( $a[ 0 ] ?? $a[ 1 ] ) == null ) { $a = null; }
        else
        {
            $a = [
                'iswin'      => !!$a[ 0 ]->iswin,
                'roundcount' => $a[ 0 ]->roundcount,
                'players'    => array_map( fn( $o ) => [
                    'sc'  => $o->score,
                    'mns' => $o->minscore,
                    'mxs' => $o->maxscore,
                    'avs' => (float) $o->avgscore,
                    'st'  => $o->oppstreak,
                    'mst' => $o->maxoppstreak
                ], $a )
            ];
        }
        /* return response */
        return $a;
    }

    /* save a ranked game result to game_result model - advance from a previous player record */
    public function setGameRecord( int $game_id, int $identity_id, int $opp_id, bool $iswin, int $roundcount, int $score, int $minscore, int $maxscore, float $avgscore, bool $update = false ): void
    {
        $q = $this->run(
            'INSERT INTO `game_result` ( `game_id`, `identity_id`, `opp_id`, `iswin`, `roundcount`, `score`, `minscore`, `maxscore`, `avgscore` )
            SELECT
                *
            FROM (
                SELECT
                    ? AS `game_id`,
                    ? AS `identity_id`,
                    ? AS `opp_id`,
                    ? AS `iswin`,
                    ? AS `roundcount`,
                    ? AS `score`,
                    ? AS `minscore`,
                    ? AS `maxscore`,
                    ? AS `avgscore`
            ) AS s
            ON DUPLICATE KEY UPDATE
                `timestamp` = CASE WHEN 1 = ? THEN CURRENT_TIMESTAMP ELSE `timestamp` END',
            [ $game_id, $identity_id, $opp_id, $iswin ? 1 : 0, $roundcount, $score, $minscore, $maxscore, $avgscore, $update ? 1 : 0 ]
        );
    }

}
