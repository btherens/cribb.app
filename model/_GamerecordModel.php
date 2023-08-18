<?php

class _GamerecordModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    /* return a player's record (don't include records more recent than max timestamp) */
    public function getPlayerRecord( int $identity_id, int $maxtimestamp = null ): ?stdclass
    {
        $response = null;
        $q = $this->run(
            'WITH    args AS ( SELECT ? as `id`, ? AS `time` )
            SELECT   t.`allstreak` as `streak`, t.`maxallstreak` AS `maxstreak` FROM `vgame_result` t JOIN args a on 1 = 1
            WHERE    a.`id` = t.`identity_id` AND ( ISNULL( a.`time` ) OR a.`time` >= t.`timestamp` )
            ORDER BY t.`timestamp` DESC, t.`id` DESC LIMIT 1',
            [ $identity_id, $maxtimestamp ]
        );
        if ( $c = $q->fetch() ) { $response = $c; }
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
