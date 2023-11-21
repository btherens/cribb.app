<?php

class GameModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    public readonly int $identity;
    public stdClass $game;

    /* loaders */
    /* load a game into memory */
    private function _loadGame( int $gid ): void
    {
        /* use an identity if available */
        $id = isset( $this->identity ) ? $this->identity : null;
        /* query database for game */
        $g  = $this->run( 'SELECT g.* FROM `vgamedetail` g WHERE g.`game_id` = ? AND ( g.`p1_id` = ? OR g.`p2_id` IS NULL ) LIMIT 1', [ $gid, $id ] )->fetch( PDO::FETCH_OBJ );
        /* assign to property if we got a result */
        if ( $g )
        {
            $this->game = $g;
            unset( $this->_deck );
            unset( $this->_draw );
            unset( $this->_crib );
            unset( $this->_gate );
            unset( $this->_scorebook );
            unset( $this->_play );
            unset( $this->_count );
            unset( $this->_starter );
            unset( $this->_link );
            unset( $this->_stat );
        }
    }

    /* load an identity from server */
    public function getIdDtl( int $id ): ?stdclass
    {
        $response = false;
        $i = $this->run(
            'WITH id AS ( SELECT ? AS `id` )
            SELECT
                n.`string` AS `name`,
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
            FROM id
            JOIN `vname`   n ON id.`id` = n.`identity_id`
            JOIN `vavatar` a ON id.`id` = a.`identity_id`',
            [ $id ]
        )->fetch();
        if ( $i ) { $response = $i; }
        return $response;
    }

    /* set an identity id and return success / fail */
    public function setIdentity( $id ): bool
    {
        /* set identity to model */
        if     ( !isset( $this->identity ) && $id ) { $this->identity = $id; }
        /* or return a previously set identity */
        elseif ( isset( $this->identity )         ) { $id = $this->identity; }
        /* confirm an identity has been set or is already set */
        return !!$id;
    }

    /* get an updated game object from model */
    public function getGame( $gid, bool $live = false ): ?stdClass
    {
        $o = null;
        /* infer gid from model if already loaded */
        if ( !$gid && isset( $this->game ) ) { $gid = $this->game->game_id; unset( $this->game ); }
        if ( $gid )
        {
            /* attempt to load model */
            $this->_loadGame( $gid );
            /* if the game was found and state is allowed */
            if ( isset( $this->game ) && ( !$live || $this->game->p2_id != null ) ) { $o = $this->game; }
        }
        return $o;
    }

    /* create a new game and return the id */
    public function createGame( int $opp_id = null ): int { return $this->run( 'SELECT createGame( ?, ? )', [ $this->identity, $opp_id ] )->fetchColumn(); }

    /* return a gamelist db object with identity info for opponent details */
    public function getGameList( int $limit = null, int $offset = null ): PDOStatement
    {
        $id = $this->identity;
        /* prepare statements */
        $q = 'SELECT *
              FROM `vgamelist`
              WHERE `p1_id` = ? AND `round` > -2 AND `ignore` = 0
              ORDER BY IF( `p2_id` IS NULL, now(), `timestamp` ) DESC';
        $a = [ $id ];
        /* use offset/limit if we can */
        if     ( !is_null( $offset ) && !is_null( $limit ) ) { $q = $q . ' LIMIT ?, ?'; array_push( $a, $offset, $limit ); }
        elseif ( !is_null( $limit ) ) { $q = $q . ' LIMIT ?'; array_push( $a, $limit ); }

        /* return db object */
        return $this->run( $q, $a );
    }

    /* check model limit */
    public function getKeyCount( string $type ): int
    {
        $count = $this->run(
            'SELECT `count` FROM `vgame_activity_round_count` WHERE `identity_id` = ? AND `game_id` = ? AND `round` = ? AND `type` = ?;',
            [ $this->identity, $this->game->game_id, $this->game->round, $type ]
        )->fetchColumn();
        return ( $count ?: 0 );
    }

    /* check if N keys are being set by both players */
    public function checkAllTurn(): bool
    {
        $response = true;
        /* query */
        $q = $this->run(
            'SELECT `identity_id`, `type`, `value` FROM `game_activity`
            WHERE `game_id` = ?
            ORDER BY `timestamp` DESC, `id` DESC LIMIT 2;',
            [ $this->game->game_id ]
        );
        $ids = [];
        while ( $c = $q->fetch() ) if ( 'N' == $c->type && 1 == $c->value ) { $ids[] = $c->identity_id; }
        return 2 == count( array_unique( $ids ) );
    }

    /* deck - object with order of a shuffled deck */
    private array $_deck;
    /* set a fresh shuffled deck to model and return */
    public function newDeck(): array
    {
        $g = &$this->game;
        /* create new deck */
        $deck = range( 0, 51 );
        /* shuffle deck */
        shuffle( $deck );
        /* return deck */
        return $deck;
    }
    /* get this round's shuffled deck */
    public function getDeck(): ?array
    {
        /* query db if we're still null */
        if ( !isset( $this->_deck ) )
        {
            $d = $this->run(
                'WITH cards AS (
                    SELECT * FROM `game_activity`
                    WHERE    `game_id` = ? AND `round` = ? AND `type` = \'D\'
                    ORDER BY `timestamp` DESC, `id` DESC LIMIT 52
                )
                SELECT `value` FROM cards ORDER BY `timestamp` ASC, `id` ASC',
                [ $this->game->game_id, $this->game->round ]
            )->fetchAll( PDO::FETCH_COLUMN );
            /* set deck to property if we got one */
            if ( $d ) { $this->_deck = $d; }
        }
        /* return an existing deck property */
        return isset( $this->_deck ) ? $this->_deck : null;
    }
    /* set a fresh shuffled deck to model and return */
    public function setDeck( array $deck, int $round = null ): void
    {
        /* use current round by default */
        if ( is_null( $round ) ) { $round = $this->game->round; }
        /* create select input array */
        $vstr = 'SELECT ?';
        $vstr .= str_repeat( ' UNION ALL ' . $vstr, max( 0, count( $deck ) - 1 ) );
        /* insert deck order values into table */
        $this->run(
            'INSERT INTO `game_activity` ( `game_id`, `identity_id`, `round`, `type`, `value` )
            WITH dtl AS (
                SELECT
                    ?     AS `game_id`,
                    ?     AS `identity_id`,
                    ?     AS `round`,
                    \'D\' AS `type`
            )
            SELECT
                dtl.*,
                v.*
            FROM ( ' . $vstr . ' ) v
            CROSS JOIN dtl',
            [ ...[
                $this->game->game_id,
                $this->identity,
                $round
            ], ...$deck ]
        );
        $this->_deck = $deck;
    }

    /* the cuts from the current round */
    private array $_draw;

    public function getDraw(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_draw ) && $d = $this->getDeck() )
        {
            /* empty result */
            $a = [ null, null ];
            /* query */
            $q = $this->run(
                'SELECT `identity_id`, `value`
                FROM   `game_activity`
                WHERE  `game_id` = ? AND `round` = ? AND `type` = \'A\'',
                [ $this->game->game_id, $this->game->round ]
            );
            /* cast db results to array */
            while ( $c = $q->fetch() ) { $a[ $c->identity_id == $this->identity ? 0 : 1 ] = $c->value; }
            /* set result to property */
            $this->_draw = $a;
        }
        /* return property */
        return isset( $this->_draw ) ? $this->_draw : null;
    }

    /* the cuts from the current round */
    private array $_crib;
    public function getCrib(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_crib ) && $d = $this->getDeck() )
        {
            /* empty result */
            $a = [ null, null ];
            /* query */
            $q = $this->run(
                'SELECT `identity_id`, `value`
                FROM   `game_activity`
                WHERE  `game_id` = ? AND `round` = ? AND `type` = \'C\'
                ORDER BY `timestamp` DESC, `id` DESC LIMIT 4',
                [ $this->game->game_id, $this->game->round ]
            );
            /* cast db results to array */
            while( $c = $q->fetch() )
            {
                $a[ $c->identity_id == $this->identity ? 0 : 1 ][] = $c->value; 
            }
            /* set result to property */
            $this->_crib = $a;
        }
        /* return property */
        return isset( $this->_crib ) ? $this->_crib : null;
    }

    /* get gate index */
    private int $_gate;
    public function getGate(): int
    {
        /* check for sane state */
        if ( !isset( $this->_gate ) )
        {
            $g = &$this->game;
            /* query */
            $r = $this->run(
                'SELECT `value`
                FROM   `vgame_activity_round_latest`
                WHERE  `game_id` = ? AND `round` = ? AND `identity_id` = ? AND `type` = \'Q\';',
                /* this game, this round, and the proper player depending upon crib */
                [ $g->game_id, $g->round, $g->p1_id ]
            )->fetchColumn();
            /* assign a property if returned */
            if ( $r != false ) { $this->_gate = $r; }
        }
        /* return property */
        return isset( $this->_gate ) ? $this->_gate : 0;
    }

    private array $_link;
    public function getLink(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_link ) )
        {
            $g = &$this->game;
            /* empty result */
            $a = [ null, null ];
            /* query */
            $q = $this->run(
                'SELECT  `identity_id`, `value`
                FROM     `vgame_activity_latest`
                WHERE    `game_id` = ? AND `type` = \'Z\'
                LIMIT    2;',
                /* this game, this round, and the proper player depending upon crib */
                [ $g->game_id ]
            );
            while( $c = $q->fetch() )
            {
                $a[ $c->identity_id == $this->identity ? 0 : 1 ] = $c->value;
            }
            /* assign property */
            $this->_link = $a;
        }
        /* return property */
        return isset( $this->_link ) ? $this->_link : null;
    }

    /* get live statistics from game */
    private array $_stat;
    public function getStat(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_stat ) )
        {
            $g = &$this->game;
            /* empty result */
            $a = [ null, null ];
            /* query */
            $q = $this->run(
                'SELECT * FROM `vgame_activity_stat` WHERE ? = `game_id` LIMIT 2',
                /* this game, this round, and the proper player depending upon crib */
                [ $g->game_id ]
            );
            while( $c = $q->fetch() )
            {
                $a[ $c->identity_id == $this->identity ? 0 : 1 ] = $c;
            }
            /* assign property */
            $this->_stat = $a;
        }
        /* return property */
        return isset( $this->_stat ) ? $this->_stat : null;
    }

    /*
    * values are score types by index:
    */
    private array $_scores = [
        /* index     key             type                points */
        /*  0 */ 'nineteen'  => [ 'nineteen'          ,    0    ],
        /*  1 */ 'heels'     => [ 'heels'             ,    2    ],
        /*  2 */ 'nobs'      => [ 'nobs'              ,    1    ],
        /*  3 */ 'go'        => [ 'go'                ,    1    ],
        /*  4 */ 'last'      => [ 'last card'         ,    1    ],
        /*  5 */ 'thirtyone' => [ 'thirty-one'        ,    2    ],
        /*  6 */ 'fifteen'   => [ 'fifteen'           ,    2    ],
        /*  7 */ 'pair2'     => [ 'pair'              ,    2    ],
        /*  8 */ 'pair3'     => [ 'pair royal'        ,    6    ],
        /*  9 */ 'pair4'     => [ 'double pair royal' ,    12   ],
        /* 10 */ 'run3'      => [ 'three card run'    ,    3    ],
        /* 11 */ 'run4'      => [ 'four card run'     ,    4    ],
        /* 12 */ 'run5'      => [ 'five card run'     ,    5    ],
        /* 13 */ 'run6'      => [ 'run'               ,    6    ],
        /* 14 */ 'run7'      => [ 'run'               ,    7    ],
        /* 15 */ 'flush4'    => [ 'four card flush'   ,    4    ],
        /* 16 */ 'flush5'    => [ 'five card flush'   ,    5    ]
    ];

    private array $_scorebook;
    /* return a collection of the current round's scores, if available */
    public function getScorebook(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_scorebook ) )
        {
            /* empty result */
            $a = [ null, null ];
            /* query */
            $q = $this->run(
                'SELECT `identity_id`, `value`, `isnew`
                FROM   `vgame_activity_new`
                WHERE  `game_id` = ? AND `round` = ? AND `type` = \'E\'
                ORDER BY `timestamp` ASC, `id` ASC',
                [ $this->game->game_id, $this->game->round ]
            );
            /* cast db results to array */
            while( $c = $q->fetch() )
            {
                $a[ $c->identity_id == $this->identity ? 0 : 1 ][] = array_merge( $this->array_index( $this->_scores, $c->value ), [ $c->isnew ? true : false ] );
            }
            /* set result to property */
            $this->_scorebook = $a;
        }
        /* return property */
        return isset( $this->_scorebook ) ? $this->_scorebook : null;
    }

    /* return a score object [ type, points ] */
    public function getScore( string $key ): array { return $this->_scores[ $key ]; }

    /* set a score to model and return points */
    public function setScore( string $key, bool $opp = false ): int
    {
        /* serialize score key to index and set to model */
        $this->setGameKey( 'E', array_search( $key, array_keys( $this->_scores ) ), null, $opp );
        /* return the points gained */
        return $this->_scores[ $key ][ 1 ];
    }

    /* get starter card index */
    private int $_starter;
    public function getStarter(): ?int
    {
        /* check for sane state */
        if ( !isset( $this->_starter ) && $d = $this->getDeck() )
        {
            /* query */
            $r = $this->run(
                'SELECT `value`
                FROM   `vgame_activity_round_latest`
                WHERE  `game_id` = ? AND `round` = ? AND `identity_id` = ? AND `type` = \'T\';',
                /* this game, this round, and the proper player depending upon crib */
                [ $this->game->game_id, $this->game->round, $this->game->iscrib ? $this->game->p2_id : $this->game->p1_id ]
            )->fetchColumn();
            if ( $r !== false ) { $this->_starter = $r; }
        }
        /* return property */
        return isset( $this->_starter ) ? $this->_starter : null;
    }

    /* get the user's card hands for a given round with given deck */
    public function getHands(): ?array
    {
        /* get crib records from model */
        $c = $this->getCrib();
        /* hands are the first twelve cards of a deck */
        $h = [ [ 0, 2, 4, 6, 8, 10 ], [ 1, 3, 5, 7, 9, 11 ] ];
        /* remove any cards in crib from cards in hand */
        foreach ( [ 0, 1 ] as $ci ) { foreach ( [ 0, 1 ] as $hi ) { $h[ $hi ] = array_diff( $h[ $hi ], $c[ $ci ] ?: [] ); } }
        /* ignore key results from loops */
        $h = [ array_values( $h[ 0 ] ), array_values( $h[ 1 ] ) ];
        /* return the cards for each hand, accounting for crib/deal order */
        return $this->game->iscrib ? $h : array_reverse( $h );
    }

    private array $_play;
    /* get this round's play order
     * return array is in this format:
     * [
     *     [ ...player cards thrown ],
     *     [ ...opponent cards thrown ],
     *     [ ...allcards in order ],
     *     [ ...allcards discard ],
     *     true / false if its player's turn
     *     true / false if other player said go
     * ]
     */
    public function getPlay(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_play ) && $d = $this->getDeck() )
        {
            $game = &$this->game;
            /* empty result */
            $a = [ null, null, null, null, false ];
            /* query */
            $q = $this->run(
                'SELECT  `identity_id`, `value` FROM `game_activity`
                WHERE    `game_id` = ? AND `round` = ? AND `type` = \'B\'
                ORDER BY `timestamp` ASC, `id` ASC',
                [ $game->game_id, $game->round ]
            );
            /* go state */
            $go = 0;
            /* is player */
            $ip = null;
            /* iterate through relevant moves from db */
            while( $c = $q->fetch() )
            {
                /* if the record was a play-altering go */
                if ( $c->value === -1 ) { $go++; }
                /* played cards */
                else
                {
                    $a[ $c->identity_id == $this->identity ? 0 : 1 ][] = $c->value; 
                    $a[ 2 ][] = $c->value;
                    /* reset go */
                    $go = 0;
                }
                /* clear if we've had two gos in a row or are outside this stage */
                if ( $go == 2 || ( count( $a[ 0 ] ?: [] ) == 4 && count( $a[ 1 ] ?: [] ) == 4 && $this->getGate() >= 1 ) )
                {
                    /* remove go status */
                    $go = 0;
                    /* discard cards played so far */
                    $a[ 3 ] = $a[ 2 ] ?: []; $a[ 2 ] = null;
                }
                /* players alternate turns */
                $ip = $c->identity_id != $this->identity;
            }
            /* reset status counters if the play round has ended */
            if ( count( $a[ 0 ] ?: [] ) == 4 && count( $a[ 1 ] ?: [] ) == 4 ) { $ip = true; $go = false; }
            /* non-dealer goes first otherwise next player after last */
            $a[ 4 ] = is_null( $ip ) ? !$game->iscrib : $ip;
            /* current go state */
            $a[ 5 ] = (bool) $go;
            /* set result to property */
            $this->_play = $a;
        }
        /* return property */
        return isset( $this->_play ) ? $this->_play : null;
    }

    private array $_count;
    /* get this round's count status
     */
    public function getCount(): ?array
    {
        /* check for sane state */
        if ( !isset( $this->_count ) && $gate = $this->getGate() )
        {
            $game = &$this->game;
            /* empty result */
            $a = [ null, null ];

            /* query */
            $q = $this->run(
                'SELECT  `identity_id`, `type`, `value` FROM `game_activity`
                WHERE    `game_id` = ? AND `round` = ? AND `type` IN ( \'O\', \'M\' )
                AND      `value` BETWEEN ? AND ?
                ORDER BY `timestamp` ASC, `id` ASC',
                [ $game->game_id, $game->round, ( $gate - 1 ) * 100, ( $gate * 100 ) - 1 ]
            );

            /* iterate through relevant moves from db */
            while ( $row = $q->fetch() )
            {
                $a[ $row->identity_id == $this->identity ? 0 : 1 ][ $row->type == 'O' ? 'o' : 'c' ][] = $row->value - ( ( $gate - 1 ) * 100 );
            }
            /* create empty count collection if no score was set in a count */
            foreach ( range( 0, 1 ) as $i ) if ( !is_null( $a[ $i ] ) && !array_key_exists( 'c', $a[ $i ] ) ) { $a[ $i ][ 'c' ] = []; }

            /* set result to property */
            $this->_count = $a;
        }
        /* return property */
        return isset( $this->_count ) ? $this->_count : null;
    }

    /*
     * key types:
     * L: link an identity to a game (create/join a game)
     * S: game settings value - 0-3
     * Z: a link to the next game in series
     * I: ignore this game in lists if I key is most recent record player made

     * basic game moves
     * R: initiate a new round - value defines whose crib it is
     * Q: confirm after some points in play
         * Q1 - continue after play round
         * Q2 - continue after player 1 count
         * Q3 - continue after player 2 count
     * M: id of a findScore
     * N: empty record - used to set isturn flag
         * 0 - set isturn flag for no players
         * 1 - set isturn flag for this player
         * 2 - set isturn flag for all players

     * card moves:
     * type 1: primary   - value is index of 52 card deck
         * D: cards shuffled and set in deck
     * type 2: dependent - value is index of last D
         * A: draw from deck
         * C: card in crib
         * T: starter card
         * B: card in play (-1 is null / pass)
         * O: the counting hand's card order (player1, player2, crib)

     * scoring
     * P: points added to board
     * E: type of score
     */
    public function setGameKey( string $type, int | iterable $value = null, int $round = null, bool $opp = false ): void
    {
        /* don't continue if insert is null */
        if ( is_null( $value ) || ( is_iterable( $value ) && !count( $value ) ) ) return;
        /* defaults */
        $g = &$this->game;
        /* use current round */
        if ( is_null( $round ) ) { $round = $g->round; }
        /* if opp then use opponent id */
        $identity = $opp ? $g->p2_id : $this->identity;

        /* basic query parameters - every row gets these */
        $p = [ $g->game_id, $identity, $round, $type ];
        /* a single value in rows */
        $vstr = 'SELECT ?';
        /* adjust sql string length to match dimensions */
        if ( is_iterable( $value ) )
        {
            /* repeat the value string for each value being added */
            $vstr .= str_repeat( ' UNION ALL ' . $vstr, max( 0, count( $value ) - 1 ) );
            /* append the value string to parameters */
            $p = array_merge( $p, $value );
        }
        /* append a single value to parameters */
        else { $p[] = $value; }

        /* insert a new record into game_activity */
        $this->run(
            'INSERT INTO `game_activity` ( `game_id`, `identity_id`, `round`, `type`, `value` )
            SELECT c.*, v.*
            FROM ( SELECT ? AS a, ? AS b, ? AS c, ? AS d ) c
            CROSS JOIN ( ' . $vstr . ' ) v',
            $p
        );
    }

}
