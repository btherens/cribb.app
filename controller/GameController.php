<?php

class GameController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Game';
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* return application */
    public function index(): void
    {
        $appload = new ApploaderController( 'index', 'create new game' );
        $appload->index();
    }

    /* return application for a valid GID */
    public function invite( $gid ): void { $this->_gidPageLoader( $gid, 'cribbage challenge!' ); }
    public function game(   $gid ): void { $this->_gidPageLoader( $gid, 'open game' ); }
    public function result( $gid ): void { $this->_gidPageLoader( $gid, 'results' ); }
    public function status( $gid ): void { $this->_gidPageLoader( $gid, 'open game' ); }
    private function _gidPageLoader( $gid, string $title ): void
    {
        /* validate gid value */
        if ( $gid = $this->_filterGid( $gid[ 0 ] ) )
        {
            $appload = new ApploaderController( 'index', $title );
            $appload->index();
        }
        /* reroute to root */
        else
        {
            http_response_code( 404 );
            header( 'Location: /' );
        }
    }

    /* return application with client-side routing to gamelist view */
    public function list( ): void
    {
        $appload = new ApploaderController( 'index', 'open games' );
        $appload->index();
    }

    /* return lobby details */
    public function getLobby( ): void
    {
        $response = false;
        /* filter input */
        $gid = $this->_filterGid( $_GET[ 'gid' ] );
        /* load identity */
        if ( $id = auth::id() )
        {
            $this->_model->setIdentity( $id );
            /* create a game if no gid was passed */
            if ( !$gid ) { $gid = $this->_createGame(); }
            /* filter inputs */
            if ( $gid )
            {
                try
                {
                    /* load lobby */
                    if ( $game = $this->_model->getGame( shortID::toNumeric( $gid ) ) )
                    {
                        /* get gid direct from model */
                        $gid = shortID::toShort( $game->game_id );

                        /* get settings info */
                        $setting = $this->_deserializeLobbySetting( $game->setting, $game->p1_id != $id || $game->p_index != 1 );
                        /* detect opponent */
                        if ( $oppid = $game->p2_id ?? ( $game->p1_id != $this->_model->identity ? $game->p1_id : null ) )
                        {
                            /* get opponent record */
                            $oppdtl = $this->_model->getIdDtl( $oppid );
                            /* load opponent stats if ranked mode is on */
                            if ( $setting[ 'rank' ] ) { $stats = $this->_getPlayerRecord( $this->_model->identity, $oppid ); }
                        }
                        $response = [
                            'gid'    => $gid,
                            'se'     => $setting,
                            /* return view type invite / game / end */
                            'type'   => -1 == $game->round ? 'invite' : ( 0 <= $game->round ? 'game' : 'end' ),
                            /* opponent details */
                            'name'   => isset( $oppdtl ) ? $oppdtl->name : null,
                            'avatar' => isset( $oppdtl ) ? array_values( array_slice( ( (array) $oppdtl ), -16 ) ) : null,
                            'stat'   => isset( $stats  ) ? $stats : null
                        ];
                    }
                }
                catch ( Exception $e ) { http_response_code( 500 ); } 
            }
        }
        $this->_returnResponse( $response );
    }

    /* return list of games for id */
    public function getGames(): void
    {
        $response = false;
        /* only if session has login context */
        if ( $id = auth::id() )
        {
            $this->_model->setIdentity( $id );
            try
            {
                $list = [];
                /* get gamelist object */
                $q = $this->_model->getGameList( 50 );
                /* loop through result set */
                while( $g = $q->fetch( PDO::FETCH_ASSOC ) )
                {
                    array_push( $list, [
                        'gid' => shortID::toShort( $g[ 'game_id' ] ),
                        'p'   => $g[ 'p_index' ],
                        'se'  => $this->_deserializeLobbySetting( $g[ 'setting' ], $g[ 'p_index' ] == 1 ),
                        'r'   => $g[ 'round' ] > -1,
                        'it'  => !!$g[ 'isturn' ] || ( $g[ 'p2_name' ] && -1 == $g[ 'round' ] ),
                        't'   => strtotime( $g[ 'timestamp' ] ),
                        'opp' => $g[ 'p2_id' ] != null ? [
                            'name'   => $g[ 'p2_name' ],
                            /* strip avatar array from end and remove keys for more concise transmission */
                            'avatar' => array_values( array_slice( $g, -16 ) ),
                            'score'  => [ $g[ 'p1_score' ], $g[ 'p2_score' ] ]
                        ] : false
                    ] );
                }
                /* create final return object */
                $response = [ 'l' => $list, 'v' => VERSION ];
            }
            catch ( Exception $e ) { http_response_code( 500 ); }
        }
        $this->_returnResponse( $response );
    }

    /* return list of games for id */
    public function hideGame( $cmd ): void
    {
        $response = [ 'success' => false ];
        try
        {
            if ( $game = $this->_getGame( $this->_filterGid( $cmd[ 'g' ] ) ) )
            {
                /* set ignore flag */
                $this->_model->setGameKey( 'I', 0 );
                /* return new gamelist */
                $this->getGames();
            }
        }
        catch ( Exception $e ) { http_response_code( 500 ); }
    }

    /* get a game's state */
    public function getGameState( $cmd ): void
    {
        /* get game state from model */
        try   { $response = $this->_getGameState( $this->_filterGid( $_GET[ 'g' ] ) ) ?: [ 'success' => false ]; }
        catch ( Exception $e ) { http_response_code( 500 ); }
        $this->_returnResponse( $response );
    }

    /* get a game's state */
    public function getInfo( $cmd ): void
    {
        try
        {
            /* get game state from model */
            if ( $response = $this->_getGameState( $this->_filterGid( $_GET[ 'g' ] ) ) )
            {
                $game = &$this->_model->game;
                if ( 'end' == $response[ 'st' ] )
                {
                    /* has a new game been started */
                    $response[ 'ng' ] = !!$this->_model->getLink()[ 0 ];

                    /* add rank info to response */
                    if ( $response[ 'se' ][ 'rank' ] )
                    {
                        $response[ 'stat' ] = $this->_getGameRecord();
                    }
                }
                else if ( $response[ 'se' ][ 'rank' ] )
                {
                    $response[ 'stat' ] = $this->_getPlayerRecord( $game->p1_id, $game->p2_id );
                }
                /* load avatar into response */
                $id = $this->_model->getIdDtl( $game->p2_id );
                $response[ 'av' ] = array_values( array_slice( ( (array) $id ), -16 ) );
            }
            else { $response = [ 'success' => false ]; }
        }
        catch ( Exception $e ) { http_response_code( 500 ); } 
        $this->_returnResponse( $response );
    }

    /* update a game lobby's settings
     * /setLobbySetting : { gid: string, color: bool, rank: bool }
     */
    public function setLobbySetting( $cmd ): void
    {
        $response = false;
        /* filter inputs */
        $input = filter_var_array( $cmd, [
            /* validate avatar integer array */
            'color' => [
                'filter' => FILTER_VALIDATE_BOOLEAN,
                'flags'  => FILTER_NULL_ON_FAILURE
            ],
            'rank' => [
                'filter' => FILTER_VALIDATE_BOOLEAN,
                'flags'  => FILTER_NULL_ON_FAILURE
            ]
        ] );
        if ( $game = $this->_getGame( $this->_filterGid( $cmd[ 'gid' ] ) ) )
        {
            /* check lobby ownership and open status */
            if ( $game->p1_id == $this->_model->identity && $game->p2_id == null )
            {
                /* check for remaining set quota */
                if ( $this->_model->getKeyCount( 'S' ) <= 50 )
                {
                    try
                    {
                        /* serialize the settings to a single integer */
                        $serialSetting = $this->_serializeLobbySetting( $input[ 'color' ], $input[ 'rank' ] );
                        /* save new settings to model if necessary */
                        if ( $serialSetting != $game->setting ) { $this->_model->setGameKey( 'S', $serialSetting ); }
                        /* return the settings */
                        $response = [ 'color' => $input[ 'color' ], 'rank' => $input[ 'rank' ] ];
                    }
                    catch ( Exception $e ) { http_response_code( 500 ); }
                }
            }
        }
        $this->_returnResponse( $response );
    }

    /* send a move from client to server
     */
    public function submitMove( $cmd ): void
    {
        $response = [ 'success' => false ];
        /* filter inputs */
        $input = filter_var_array( $cmd, [
            /* validate avatar integer array */
            'st' => [
                'filter' => FILTER_UNSAFE_RAW,
                'flags'  => [ FILTER_FLAG_STRIP_LOW, FILTER_FLAG_STRIP_HIGH ]
            ],
            't' => [
                'filter' => FILTER_VALIDATE_INT
            ],
            'v' => [
                'filter' => FILTER_VALIDATE_INT,
                'flags'  => FILTER_FORCE_ARRAY
            ]
        ] );

        try
        {
            /* if game can be opened and stage can be found and stage matches input stage */
            if (
                /* get valid game object from model */
                ( $game = $this->_getGame( $this->_filterGid( $cmd[ 'g' ] ) ) ) &&
                /* get stage from model */
                ( $stage = $this->_findStage( $game ) ) && 
                /* if move command matches stage or if game is being ended */
                ( ( $stage == $input[ 'st' ] ) || ( ( 'end' == $input[ 'st' ] ) && max( $game->p1_score, $game->p2_score ) == 121 ) )
            )
            {
                /* return results of play and latest game state */
                $response = [ 'success' => true, 'o' => $this->_play( $input[ 'st' ], $input[ 't' ], $input[ 'v' ] ), 'st' => $this->_getGameState() ];
            }
        }
        catch ( Exception $e ) { http_response_code( 500 ); } 

        $this->_returnResponse( $response );
    }

    /* accept a game invite */
    public function beginGame( $cmd ): void
    {
        $response = false;
        /* filter inputs */
        /* attempt to open game */
        if ( $game = $this->_getGame( $this->_filterGid( $cmd[ 'gid' ] ) ) )
        {
            /* check for game that has not begun */
            if ( $game->round == -1 )
            {
                try
                {
                    /* attach this user to game if necessary/possible */
                    if ( $game->p1_id != $this->_model->identity && $game->p2_id == null ) { $this->_model->setGameKey( 'L', 0 ); }
                    /* begin game at round 0 */
                    $this->_model->setGameKey( 'R', 0, 0 );
                    /* confirm success */
                    $response = true;
                }
                catch ( Exception $e ) { http_response_code( 500 ); }
            }
        }
        $this->_returnResponse( $response );
    }

    /* create/begin a new game with same players */
    public function createNextGame( $cmd ): void
    {
        $response = false;
        try
        {
            /* get game state from model */
            $response = $this->_getGameState( $this->_filterGid( $cmd[ 'gid' ] ) ) ?: [ 'success' => false ];
            /* confirm the game has ended */
            if ( 'end' == $response[ 'st' ] )
            {
                $g       = $this->_model->game;
                $setting = $this->_deserializeLobbySetting( $g->setting, 1 != $g->p_index );
                /* get a linked game if it has already been created */
                $id      = $this->_model->getLink();
                /* create a new game with opponent and assign to opponent property */
                if ( !$id[ 0 ] && !$id[ 1 ] ) { $id[ 1 ] = $this->_model->createGame( $g->p2_id ); }
                /* check if new game link needs to be saved by this player too */
                if ( !$id[ 0 ] ) { $id[ 0 ] = $id[ 1 ]; $this->_model->setGameKey( 'Z', $id[ 0 ] ); }
                /* open the new game */
                if ( $id[ 0 ] )
                {
                    /* load new game into model */
                    $ng = $this->_model->getGame( $id[ 0 ] );
                    /* serialize the game settings from last game */
                    $ns = $this->_serializeLobbySetting( $setting[ 'color' ], $setting[ 'rank' ] );
                    /* properly set next game's settings if necessary */
                    if ( 1 == $ng->p_index && $ns != $ng->setting ) { $this->_model->setGameKey( 'S', $this->_serializeLobbySetting( $setting[ 'color' ], $setting[ 'rank' ] ) ); }
                    /* begin game at round 0 if we haven't begun yet */
                    if ( -1 == $ng->round  ) { $this->_model->setGameKey( 'R', 0, 0 ); }
                    /* confirm success */
                    $response = [ 'g' => shortID::toShort( $ng->game_id ), 'success' => true ];
                }
            }
        }
        catch ( Exception $e ) { http_response_code( 500 ); } 
        $this->_returnResponse( $response );
    }

    /* return an object to client via json */
    protected function _returnResponse( $response ): void
    {
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* filter/validate a gameid */
    protected function _filterGid( $gid ): ?string { return filter_var( $gid, FILTER_VALIDATE_REGEXP, [ 'options' => [ 'regexp' =>  '/^\w{4,13}$/' ] ] ); }

    /* attempt to open a game from filtered $gid and return object (also set to model->game) */
    protected function _getGame( $gid, $live = false ): ?stdclass { return ( $this->_model->setIdentity( auth::id() ) ? $this->_model->getGame( $gid ? shortID::toNumeric( $gid ) : null, $live ) : null ); }

    /* create a new game / return an existing lobby */
    protected function _createGame(): string 
    {
        /* first check gamelist and return an unopened invite */
        if   ( ( $game = $this->_model->getGameList( 1 )->fetch() ) && is_null( $game->p2_name ) ) { $id = $game->game_id; }
        /* if we didn't find anything create a new game */
        else { $id = $this->_model->createGame( ); }
        /* return game id string */
        return shortID::toShort( $id );
    }

    /* serialize game settings properties into single value and return */
    protected function _serializeLobbySetting( bool $color, bool $rank ): int { return ( $color && $rank ? 3 : ( $color ? 2 : ( $rank ? 1 : 0 ) ) ); }
    /* deserialize a lobby settings store value to object and return */
    protected function _deserializeLobbySetting( int $n, bool $i = false ): array
    {
        /* color */
        $c = $n == 2 || $n == 3;
        /* invert color if true */
        $c = $i ? !$c : $c;
        /* rank */
        $r = $n == 1 || $n == 3;
        /* return color and rank in associative array */
        return [
            'color' => $c,
            'rank'  => $r
        ];
    }

    /* return the game stage */
    protected function _findStage( $g ): string
    {
        /* games begin at invite stage */
        $s = 'invite';
        /* if game has ended */
        if ( -2 == $g->round )
        {
            $s = 'end';
        }
        /* if game has started */
        elseif ( 0 <= $g->round )
        {
            /* if no crib is set */
            if ( is_null( $g->iscrib ) )
            {
                /* look at draw */
                $d = $this->_model->getDraw();
                /* set stage based on whether all players have drawn */
                $s = $d && !is_null( $d[ 0 ] ) && !is_null( $d[ 1 ] ) ? 'draw2' : 'draw1';
            }
            else
            {
                /* get some information about the game state */
                $t  = $this->_model->getStarter();
                $cb = $this->_model->getCrib();
                $p  = $this->_model->getPlay();
                /* if player crib is empty */
                if ( is_null( $cb ) || is_null( $cb[ 0 ] ) || is_null( $cb[ 1 ] ) ) { $s = 'deal1'; }
                /*
                 * the starter card is currently null
                 * the cribs are set
                 */
                else if ( is_null( $t ) && !is_null( $cb ) && !is_null( $cb[ 0 ] ) && !is_null( $cb[ 1 ] ) ) { $s = 'starter1'; }
                /* if play stage has not yet been completed */
                else if ( $this->_model->getGate() < 1 ) { $s = 'play1'; }
                /* if we haven't continued past count stages */
                else                                    { $s = 'count1'; }
            }
        }
        return $s;
    }

    /* create game state object */
    protected function _getGameState( $gid = null ): ?array
    {
        $response = [ 'success' => false ];
        /* proceed if game was found */
        if ( $game = $this->_getGame( $gid ) )
        {
            /* build basic game response */
            $response = array_merge( $response, $this->_getBasicState( $game ) );
            /* determine game stage and set to response */
            $st = $this->_findStage( $game );
            $response[ 'st' ] = $st;
            /* game has started but not ended */
            if ( !in_array( $st, [ 'invite', 'end' ] ) )
            {
                /* run basic server game play */
                $this->_play();
                /* draw cards to determine crib if necessary */
                if ( in_array( $st, [ 'draw1', 'draw2' ] ) ) { $response = array_merge( $response, $this->_getDrawState( $game ) ); }
                else
                {
                    /* get player hands */
                    $response = array_merge( $response, $this->_getDealState( $game, true, 'count1' === $st, 3 == $this->_model->getGate() ) );
                    /* continue to play state */
                    if ( in_array( $st, [ 'play1', 'count1', 'count2', 'count3' ] ) )
                    {
                        $response = array_merge( $response, $this->_getPlayState( $game ) );
                        if ( $st === 'count1' ) { $response = array_merge( $response, $this->_getCountState( $game ) ); }
                    }
                }
                /* add game result win/loss flag if score has been met */
                if ( max( $game->p1_score, $game->p2_score ) == 121 ) { $response = array_merge( $response, [ 'gr' => $game->p1_score > $game->p2_score, 'it' => 2 ] ); }
                /* update model if 'isturn' out of sync */
                $this->_setTurnState( $game->isturn, $response[ 'it' ] );
            }
        }
        return $response;
    }

    /* set a isturn status to model */
    protected function _setTurnState( bool $isturn, int $state ): void
    {
        /* update model if 'isturn' out of sync with state */
        if ( $isturn != !!$state )
        {
            /* set to all turn if both players are claiming their turn */
            if   ( $this->_model->checkAllTurn() ) { $state = 2; }
            /* set isturn state to model */
            $this->_model->setGameKey( 'N', $state );
        }
    }

    /* prepare basic state response */
    protected function _getBasicState( stdclass $g ): array
    {
        return [
            'success' => true,
            'g'       => shortID::toShort( $g->game_id ),
            'name'    => $g->p2_name,
            'se'      => $this->_deserializeLobbySetting( $g->setting, $g->p_index == 1 ),
            'sc'      => [
                'p' => [ 'p' => $g->p1_points, 's' => $g->p1_score, 'b' => $this->_model->getScorebook()[ 0 ] ],
                'o' => [ 'p' => $g->p2_points, 's' => $g->p2_score, 'b' => $this->_model->getScorebook()[ 1 ] ]
            ],
            'ic'      => !is_null( $g->iscrib ) ? !!$g->iscrib : null,
            'it'      => true,
            't'       => strtotime( $g->timestamp )
        ];
    }

    /* get a draw cards state using game and model */
    protected function _getDrawState( stdclass $g ): array
    {
        /* draw object */
        $c = $this->_model->getDraw();
        /* get deck from model */
        $d = $this->_model->getDeck();
        /* determine drawn cards for each player */
        $ph = !is_null( $c ? $c[ 0 ] : null ) ? [ $this->_returnDeckIndexDetail( $c[ 0 ], $d ) ] : null;
        $oh = !is_null( $c ? $c[ 1 ] : null ) ? [ $this->_returnDeckIndexDetail( $c[ 1 ], $d ) ] : null;
        /* draw results (null if not available) */
        $dr = $ph && $oh && $ph[ 0 ][ 'c' ][ 'v' ] != $oh[ 0 ][ 'c' ][ 'v' ] ? ( $ph[ 0 ][ 'c' ][ 'v' ] < $oh[ 0 ][ 'c' ][ 'v' ] ) : null;
        $response = [
            'd' => [
                /* return draw details */
                'ph' => $ph,
                'oh' => $oh,
                /* return draw result to user - true if win, false if lose, null if no win */
                'dr' => $dr
            ],
            /* it is player's turn if draw is still needed or both draws are complete */
            'it' => ( ( is_null( $ph ) && is_null( $oh ) ) || !is_null( $dr ) ) ? 2 : ( is_null( $ph ) ? 1 : 0 )
        ];
        /* return state object to merge with base response */
        return $response;
    }

    /* get state object for Deal stage */
    protected function _getDealState( stdclass $g, bool $phshow, bool $ohshow, bool $chshow ): array
    {
        /* deck */
        $d = $this->_model->getDeck();
        /* get player hands */
        [ $ph, $oh ] = $this->_model->getHands();
        /* get crib */
        $ch = $this->_model->getCrib();
        /* get starter card index */
        $s  = $this->_model->getStarter();
        $response = [
            'd' => [
                /* return draw details */
                'ph' => $phshow ? $this->_returnHandDetail( $ph, $d ) : $ph,
                'oh' => $ohshow ? $this->_returnHandDetail( $oh, $d ) : $oh,
                'ch' => $chshow ? array_map( fn( $h ) => $this->_returnHandDetail( $h, $d ), $ch ) : $ch,
                's'  => !is_null( $s ) ? $this->_returnDeckIndexDetail( $s, $d ) : null
            ],
            /* all players turn if both cribs are null, or just player's turn if player's crib is null */
            'it' => is_null( $ch[ 0 ] ) && is_null( $ch[ 1 ] ) ? 2 : ( is_null( $ch[ 0 ] ) || ( !$g->iscrib && is_null( $s ) ) ? 1 : 0 )
        ];
        /* return state object to merge with base response */
        return $response;
    }

    /* get state object for play stage */
    protected function _getPlayState( stdclass $g ): array
    {
        /* deck */
        $d = $this->_model->getDeck();
        $p = $this->_model->getPlay();
        /* get player hands */
        [ $ph, $oh ] = $this->_model->getHands();
        $pp = $p[ 0 ] ?: [ ];
        $play = $this->_returnPlayDetail( $g, $p, $d );
        /* discard the final collection if we've advanced past play state */
        $response = [
            /*  */
            'it' => $play[ 'it' ],
            'p'  => array_merge(
                $play,
                [
                    /* canplay */
                    'cp' => $this->_canPlay(
                        $this->_getPlayPoints( $play[ 'ap' ] ?: [] ),
                        $this->_returnHandDetail(
                            array_filter( $ph, function ( $a ) use ( $pp ) { return !in_array( $a, $pp ); } ),
                            $d
                        )
                    )
                ]
            )
        ];
        /* return state object to merge with base response */
        return $response;
    }

    protected function _getCountState( stdclass $g ): array
    {
        /* deck */
        $d = $this->_model->getDeck();
        /* get player hands */
        [ $ph, $oh ] = $this->_model->getHands();
        /* get crib */
        $ch = $this->_model->getCrib();
        /* get starter card index */
        $s  = $this->_model->getStarter();

        $count = $this->_returnCountDetail( $g, $d, $ph, $oh, [ ...$ch[ 0 ], ...$ch[ 1 ] ], $s );
        $response = [
            'it' => $count[ 'it' ] ? 1 : 0,
            'c'  => $count
        ];
        return $response;
    }

    /* determine if the player can discard within rules */
    protected function _canPlay( int $count, array $ph ): bool
    {
        /* if any card in hand can count below 31 then return true else false */
        foreach ( $ph as $p ) if ( $count + $this->_getCardPoint( $p[ 'c' ][ 'v' ] ) <= 31 ) { return true; }
        /* return false if no playable card was found */
        return false;
    }

    /* mutate a hand array as needed */
    protected function _indexMap( array $h ): array { return array_map( function ( $c ) { return $c[ 'i' ];        }, $h ); }
    protected function _valueMap( array $h ): array { return array_map( function ( $c ) { return $c[ 'c' ][ 'v' ]; }, $h ); }
    protected function _suitMap(  array $h ): array { return array_map( function ( $c ) { return $c[ 'c' ][ 's' ]; }, $h ); }
    /* return array of points from a value map */
    protected function _pointMap( array $h ): array { return array_map( function ( $c ) { return $this->_getCardPoint( $c ); }, $h ); }
    /* get card points from card value */
    protected function _getCardPoint( int $v ): int { return ( $v < 10 ? $v + 1 : 10 ); }
    /* get current play count from an allplay array */
    protected function _getPlayPoints( array $ap ): int { return array_sum( $this->_pointMap( $this->_valueMap( $ap ) ) ); }
    /* return an index and card value from flat card value */
    protected function _returnCardDetail( $v ): array { return [ 's' => ( ( $v / 4 - floor( $v / 4 ) ) * 4 ), 'v' => floor( $v / 4 ) ]; }
    /* return the details of a card by index and deck (index and array of card values) */
    protected function _returnDeckIndexDetail( $i, $d ): array { return [ 'i' => $i, 'c' => $this->_returnCardDetail( $d[ $i ] ) ]; }
    /* return an array of cards from deck */
    protected function _returnHandDetail( array $a, $d ): array { return array_map( function ( $i ) use ( $d ) { return $this->_returnDeckIndexDetail( $i, $d ); }, $a ); }
    /* combine model score with card combo info */
    protected function _returnScoreObj( $k, $h, &$i ): array { return [ 'i' => $i++, 'k' => $k, 'o' => $this->_model->getScore( $k ), 'a' => $this->_indexMap( $h ) ]; }

    /* array of objects from play */
    protected function _returnPlayDetail( stdclass $g, array $p, array $d ): array
    {
        return [
            'pp' => is_null( $p[ 0 ] ) ? null : $this->_returnHandDetail( $p[ 0 ], $d ),
            'op' => is_null( $p[ 1 ] ) ? null : $this->_returnHandDetail( $p[ 1 ], $d ),
            'ap' => is_null( $p[ 2 ] ) ? null : $this->_returnHandDetail( $p[ 2 ], $d ),
            'ad' => is_null( $p[ 3 ] ) ? null : $this->_returnHandDetail( $p[ 3 ], $d ),
            'it' => ( 4 == count( $p[ 0 ] ?? [] ) && 4 == count( $p[ 1 ] ?? [] ) ) ? 2 : ( $p[ 4 ] ? 1 : 0 ),
            'ig' => $p[ 5 ] && ( count( $p[ 1 ] ?: [] ) < 4 )
        ];
    }

    /* array of objects from play */
    protected function _returnCountDetail( stdclass $g, array $d, array $ph, array $oh, array $ch, int $s ): array
    {
        $count  = $this->_model->getCount();
        $level  = $this->_model->getGate() - 1;
        /* test if it is player's hand or opponent's */
        $ishand = ( $level == 0 && !$g->iscrib ) || ( $level > 0 && $g->iscrib );
        /* scan scores for crib / playerhand / opphand depending on level and crib state */
        $counthand = $this->_returnCountHand( $level, $g->iscrib, $ph, $oh, $ch );

        return [
            'l'   => $level,
            /* scan for count total */
            'ct'  => $this->_findScores( $this->_returnHandDetail( [ ...$counthand, $s ], $d ), 2 == $level ),
            /* the scores each player has counted */
            'phc' => $count[ 0 ],
            'ohc' => $count[ 1 ],
            /* if it is player's turn to count */
            'it'  => $this->_isCountTurn( $ishand, is_null( $count[ 0 ] ), is_null( $count[ 1 ] ) )
        ];
    }

    /* confirm that it is current player's turn */
    protected function _isCountTurn( bool $ishand, bool $isplaycount, bool $isoppcount ): bool
    {
        return ( $ishand && $isplaycount ) || ( !$ishand && !$isoppcount ) || ( !$isplaycount && !$isoppcount );
    }

    /* return the active counting hand given level and iscrib setting */
    protected function _returnCountHand( int $level, bool $iscrib, array &$ph, array &$oh, array &$ch ): array
    {
        /* determine and return the counting hand */
        $return = $level == 2 ? $ch : ( ( ( $level == 0 && !$iscrib ) || ( $level == 1 && $iscrib ) ) ? $ph : $oh );
        /* sort the result (important to use consistent order) */
        sort( $return );
        return $return;
    }

    /* test pair combinations for combo */
    protected function _isComboPair( $a ): bool { return count( $a ) + ( count( $a ) - 3 ) * 2 == count( array_unique( array_merge(...array_map( fn( $a ) => $a[ 'a' ], $ps ) ) ) ); }

    /* flatten an array and return */
    protected function _array_flat( $a ): array
    {
        $return = [];
        array_walk_recursive( $a, function( $r ) use ( &$return ) { $return[] = $r; } );
        return $return;
    }

    /* test arrays for difference - return any differences between from either direction */
    protected function _array_diff( $a ): array
    {
        $return = [];
        /* flatten the array */
        $flat = $this->_array_flat( $a );
        foreach ( array_unique( $flat ) as $v )
        /* test if this value in array is not repeated enough to exist in every array */
        if      ( count( array_filter( $flat, fn( $a0 ) => $a0 === $v ) ) < count( $a ) )
        {
            /* include in return collection */
            $return[] = $v;
        }

        return $return;
    }

    /* test for unordered array equality */
    protected function _array_equal( array $a, array $b ): bool
    {
        return count( array_diff( array_merge( $a, $b ), array_intersect( $a, $b ) ) ) === 0;
    }

    /* analyze a hand for scores and return  */
    protected function _findScores( array $h, bool $cribhand = false ): array
    {
        /* begin with empty result */
        $nobs    = [];
        $fifteen = [];
        $pair    = [];
        $run     = [];
        $flush   = [];

        /* internal identity */
        $z = 1;
        /* consider n cards at a time */
        foreach ( range( 5, 1 ) as $n )
        /* iterate through card combinations and test */
        foreach ( new combination( $h, $n ) as $c )
        {
            /* different ways of regarding the combo */
            $i = $this->_indexMap( $c );
            $s = $this->_suitMap(  $c );
            $v = $this->_valueMap( $c );
            $p = $this->_pointMap( $v );
            /* nobs: if one card is starter, the suits match, and the other card is a jack */
            if (
                $n == 2
                && in_array( $h[ 4 ][ 'i' ], $i )
                && count( array_unique( $s ) ) == 1
                && ( array_filter( $c, fn( $ca ) => $ca[ 'i' ] != $h[ 4 ][ 'i' ] )[ 0 ][ 'c' ][ 'v' ] == 10 )
            )                                                           { $nobs[]    = $this->_returnScoreObj( 'nobs'      , $c, $z ); }
            /* fifteen */
            if ( array_sum( $p ) == 15                                ) { $fifteen[] = $this->_returnScoreObj( 'fifteen'   , $c, $z ); }
            /* pair */
            if ( $n == 2 && $v[ 0 ] == $v[ 1 ]                        ) { $pair[]    = $this->_returnScoreObj( 'pair2'     , $c, $z ); }
            /* if card run matches */
            if ( $n >= 3 && $this->_isRun( $v )                       ) { $run[]     = $this->_returnScoreObj( 'run'   . $n, $c, $z ); }
            /* flush if no flush is recorded so far and card suits match */
            if (
                /* check if we're looking at cards in hand (non crib-hands only), or all 5 */
                ( $n == 4 && !$cribhand && ( count( array_intersect( $i, $this->_indexMap( array_slice( $h, 0, 4 ) ) ) ) == 4 ) || $n == 5 )
                /* cards match and no flush has been recorded yet */
                && !count( $flush ) && $this->_isMatch( $s )
            )
            {
                $flush[] = $this->_returnScoreObj( 'flush' . $n, $c, $z );
            }
        }
        /* pair combos */
        if ( count( $pair ) >= 3 )
        {
            $combopairs = [];
            /* step through all combinations of 3-4 pairs searching for 3 of a kind (3 pairs), 4 of a kind (6 pairs) */
            foreach ( [ 3, 4 ] as $pc )
            foreach ( new combination( $pair, combination::nCr( $pc, 2 ) ) as $ps )
            /* confirm cards represent n of a kind */
            if      ( $pc == count( array_unique( array_merge(...array_map( fn( $a ) => $a[ 'a' ], $ps ) ) ) ) )
            {
                $cardarray = array_values( array_unique( array_merge( ...array_map( fn( $a ) => $a[ 'a' ], $ps ) ) ) );
                $combopair = [
                    'i' => $z++,
                    'o' => [
                        ( $pc > 3 ? 'double ' : '' ) . 'pair royal',
                        array_sum( array_map( fn( $a ) => $a[ 'o' ][ 1 ], $ps ) )
                    ],
                    'a' => $cardarray,
                    /* incompatibles list */
                    'x' => [
                        /* incompatible pairs - pairs not in the combo that intersect with these cards */
                        ...array_filter( $pair, fn( $p ) => !in_array( $p[ 'i' ], $this->_indexMap( $ps ) ) && array_intersect( $cardarray, $p[ 'a' ] ) ),
                        /* combopairs in this size */
                        ...$this->_indexMap( array_filter( $combopairs, fn( $a ) => count( $a[ 'a' ] ) <= $pc ) )
                    ],
                    'd' => $this->_indexMap( $ps )
                ];
                /* add this combo to previous combopairs incompatible list in this size */
                foreach ( $combopairs as &$x ) if ( count( $x[ 'a' ] ) == $pc )
                {
                    $x[ 'x' ][] = $combopair[ 'i' ];
                }
                /* append this combo */
                $combopairs[] = $combopair;
            }
            /* append combo pairs */
            $pair = [ ...$pair, ...$combopairs ];
        }
        /* run combos */
        if ( count( $run ) > 1 )
        {
            $comboruns = [];
            /* get possible run lengths */
            $runrange = array_unique( array_map( fn( $r ) => count( $r[ 'a' ] ), $run ) ); sort( $runrange );
            /* consider runs in sets of 2 - # of runs */
            $runcount = range( 2, count( $run ) );
            /* iterate through available run sizes */
            foreach ( $runrange as $len )
            /* loop through the current run list by array index */
            foreach ( $runcount as $count )
            /* compare runs within this run size */
            foreach ( new combination( array_keys( array_filter( $run, fn( $r ) => count( $r[ 'a' ] ) <= $len ) ), $count ) as $keys )
            {
                /* get keys by reference */
                $rs     = []; foreach ( range( 0, $count - 1 ) as $ki ) { $rs[] =  $run[ $keys[ $ki ] ]; }
                /* get cards that are not in every run */
                $diff   = $this->_array_diff( array_map( fn( $a ) => $a[ 'a' ], $rs ) );
                /* get pairs that match runs */
                $ps     = array_filter(
                    $pair,
                    function ( $p ) use ( $count, $rs )
                    {
                        $intersect = array_map(
                            function ( $r ) use ( $p )
                            {
                                $int = array_intersect( $p[ 'a' ], $r[ 'a' ] );
                                return count( $int ) == 1 ? array_values( $int )[ 0 ] : null;
                            },
                            $rs
                        );
                        return $this->_array_equal( $p[ 'a' ],array_unique( $intersect ) );
                    }
                );

                /* flatten the pair collection to its card indexes */
                $psa    = $this->_array_flat( array_map( fn( $a ) => $a[ 'a' ], $ps ) );
                /* run size counts */
                $acount = array_map( fn( $a ) => count( $a[ 'a' ] ), $rs );

                /* one run is a superset of the other */
                if     ( $count == 2 && count( $diff ) == abs( count( $rs[ 0 ][ 'a' ] ) - count( $rs[ 1 ][ 'a' ] ) ) )
                {
                    if ( !isset( $run[ $keys[ 0 ] ][ 's' ] ) ) { $run[ $keys[ 0 ] ][ 's' ] = []; }
                    /* append to subset collection */
                    $run[ $keys[ 0 ] ][ 's' ] = array_unique( [ ...( $run[ $keys[ 0 ] ][ 's' ] ?? [] ), $run[ $keys[ 1 ] ][ 'i' ] ] );
                }
                /* runs are incompatible with each other */
                elseif ( $count == 2 && count( $diff ) && abs( count( $rs[ 0 ][ 'a' ] ) - count( $rs[ 1 ][ 'a' ] ) ) )
                {
                    if ( !isset( $run[ $keys[ 0 ] ][ 'x' ] ) ) { $run[ $keys[ 0 ] ][ 'x' ] = []; }
                    /* append to subset collection */
                    $run[ $keys[ 0 ] ][ 'x' ] = array_unique( [ ...( $run[ $keys[ 0 ] ][ 'x' ] ?? [] ), $run[ $keys[ 1 ] ][ 'i' ] ] );
                }
                /* if the run lengths match each other in length and there are differences that are accounted for by the pair */
                elseif ( 1 == count( array_unique( $acount ) ) && $len == array_unique( $acount )[ 0 ] && count( $diff ) == $count && $this->_array_equal( $diff, $psa ?? [] ) )
                {
                    $runs = array_unique( $this->_indexMap( [ ...$rs, ...$ps ] ) );

                    /* the cards used in combo */
                    $cardarray = array_values( array_unique( array_merge( ...array_map( fn( $a ) => $a[ 'a' ], array_filter( $run, fn( $a ) => in_array( $a[ 'i' ], $runs ) ) ) ) ) );
                    /* define a new run that combines the runs collected */
                    $comborun = [
                        'i' => $z++,
                        'o' => [
                            /* combo name */
                            ( count( $rs ) == 4 ? '2x2' : count( $psa ) ) . 'x ' . [ ...array_filter( $run, fn( $a ) => in_array( $a[ 'i' ], $runs ) ) ][ 0 ][ 'o' ][ 0 ],
                            /* combo score */
                            array_sum( array_map( fn( $a ) => $a[ 'o' ][ 1 ], array_filter( [ ...$pair, ...$run ], fn( $a ) => in_array( $a[ 'i' ], $runs ) ) ) )
                        ],
                        /* the cards used in combo */
                        'a' => $cardarray,
                        /* incompatible card combos */
                        'x' => [
                            /* runs in this size that are not included in the list */
                            ...$this->_array_diff( [ $this->_indexMap( array_filter( $run, fn( $r ) => count( $r[ 'a' ] ) == $len ) ), $this->_indexMap( $rs ) ] )
                        ] ?: null,
                        /* dependent card combos */
                        'd' => $this->_indexMap( $this->_findValidScores( [...$pair, ...$run ], $runs ) )
                    ];
                    /* this combo is incompatible with higher count runs */
                    foreach ( array_keys( array_filter( $run, fn( $r ) => count( $r[ 'a' ] ) > $len ) ) as $i )
                    {
                        $run[ $i ][ 'x' ] = [ ...( ( array_key_exists( 'x', $run[ $i ] ) ? $run[ $i ][ 'x' ] : null ) ?? [] ), $comborun[ 'i' ] ];
                    }
                    $comboruns[] = $comborun;
                }
            }

            /* append combo runs */
            $run = [ ...$run, ...$comboruns ];
        }
        /* assemble results and return */
        return [ ...$nobs, ...$fifteen, ...$pair, ...$run, ...$flush ];
    }

    /* analyze score array and return a valid score set - include a $m to capture a set's masked scores */
    protected function _findValidScores( array $scores, array $index, array &$m = [] ): array
    {
        /* parse scores collection with index collection */
        $return = $this->_recurseScores( $scores, $index, $m );
        /* get list of indexes being scored - mask is deduped pre-comparison */
        $alli   = [ ...$this->_indexMap( $return ), ...array_unique( $m ) ];
        /* test for scores being used more than once */
        if ( count( array_unique( $alli ) ) !== count( $alli ) ) { throw new Exception( 'error in score resolver: score map has invalid collisions' ); }
        /* return result */
        return $return;
    }

    /* recursive search through scores collection and return array that reflects selection index
     * return most basic scores - combos split up into each part
     * subset + incompatible indexes added to mask argument
     */
    protected function _recurseScores( array $scores, array $index, array &$m = [] ): array
    {
        /* collect what we find in return array */
        $return = [];
        /* loop through scores that are selected by index */
        foreach ( $scores as $score )
        {
            /* add values in this record's subset to the mask collection if we have its index or the entire subset index collection */
            if  ( array_key_exists( 's', $score ) && $score[ 's' ] && ( in_array( $score[ 'i' ], $index ) || !array_diff( $score[ 's' ], $index ) ) ) { $m = [ ...( $m ?? [] ), ...$score[ 's' ] ]; }
            /* if this score is included in index */
            if  ( in_array( $score[ 'i' ], $index ) )
            {
                /* add incompatible scores to the mask */
                if ( array_key_exists( 'x', $score ) && $score[ 'x' ] ) { $m = [ ...( $m ?? [] ), ...$score[ 'x' ] ]; }
                /* merge new return collection */
                $return = [
                    ...$return,
                    ...(
                        array_key_exists( 'd', $score ) && $score[ 'd' ]
                        ? $this->_recurseScores( $scores, $score[ 'd' ], $m )
                        : [ $score ]
                    )
                ];
            }
        }
        /* sort the result */
        sort( $return );
        /* return result */
        return $return;
    }

    /* perform server-side game moves */
    protected function _play( $stage = null, $time = null, $values = null ): void
    {
        /* null response if nothing needs to be said */
        //$o = null;
        $g = $this->_model->game;

        /* continue if game is not over */
        if ( 0 <= $g->round )
        {
            /* get shuffled deck or create a new one and save to model */
            $d = $this->_model->getDeck() ?: ( $this->_model->setDeck( $this->_model->newDeck() ) || $this->_model->getDeck() );
            /* perform stage-specific actions if player has submitted a move */
            if ( $stage )
            {
                /* draw a card */
                if      ( $stage == 'draw1'    ) { $this->_playDraw( $values[ 0 ] ); }
                /* confirm results of draw */
                else if ( $stage == 'draw2'    ) { $this->_confirmDraw(); }
                /* send cards to crib */
                else if ( $stage == 'deal1'    ) { $this->_playDeal( array_slice( $values, 0, 2 ) ); }
                /* draw a starter */
                else if ( $stage == 'starter1' ) { $this->_playStarter( $values[ 0 ] ); }
                /* play a card from hand */
                else if ( $stage == 'play1'    ) { $this->_playPlay( $values[ 0 ] ); }
                else if ( $stage == 'count1'   ) { $this->_playCount( array_slice( $values, 0, 1 )[ 0 ], array_slice( $values, 1, 4 ), array_slice( $values, 5 ) ); }
                /* end game */
                else if ( $stage == 'end'      ) { $this->_playEnd( $values[ 0 ] ); }
            }
        }
    }

    /* execute a draw move */
    protected function _playDraw( int $value ): void
    {
        /* use game object */
        $g = $this->_model->game;
        /* use the round's shuffled deck */
        $d = $this->_model->getDeck();
        /* get current draws */
        $w = $this->_model->getDraw();

        /* continue if we don't already have a draw */
        if ( 0 <= $value && $value <= 51 )
        {
            /* handle draw collisions */
            if ( $value === $w[ 1 ] ) { $value = ( $value + 1 <= 51 ) ? $value + 1 : $value - 1; }
            /* save value to model */
            $this->_model->setGameKey( 'A', $value );
            /* set value to live model too in case we need it */
            $w[ 0 ] = $value;
        }
    }


    protected function _confirmDraw(): void
    {
        /* use game object */
        $g = $this->_model->game;
        /* use the round's shuffled deck */
        $d = $this->_model->getDeck();
        /* get current draws */
        $w = $this->_model->getDraw();
        /* set the next round's crib based on who won the draw */
        $this->_model->setGameKey(
            'R',
            /* 0 if the cards tie, otherwise the crib owner's player index */
            $this->_returnDeckIndexDetail( $w[ 0 ], $d )[ 'c' ][ 'v' ] != $this->_returnDeckIndexDetail( $w[ 1 ], $d )[ 'c' ][ 'v' ] ? $d[ $w[ 0 ] ] < $d[ $w[ 1 ] ] ? $g->p_index : ( $g->p_index === 1 ? 2 : 1 ) : 0,
            $g->round + 1
        );
    }

    /* pass cards to crib */
    protected function _playDeal( array $values ): void
    {
        /* check discard values against the player's hand and return matching results */
        $c = array_intersect( $this->_model->getHands()[ 0 ], $values );
        /*  save values to model if the right amount of arguments were returned */
        if ( count( $c ) == 2 ) { foreach ( $c as $ci ) { $this->_model->setGameKey( 'C', $ci ); } }
    }

    /* set starter index to model if it passes smell test */
    protected function _playStarter( int $value ): void
    {
        /* use game object */
        $g = $this->_model->game;
        if ( 0 <= $value && $value <= 39 )
        {
            /* get card value */
            $c = $this->_returnDeckIndexDetail( $value + 12, $this->_model->getDeck() );
            /* set starter draw to model */
            $this->_model->setGameKey( 'T', $c[ 'i' ] );
            /* heels - set score and point to other player */
            if ( $c[ 'c' ][ 'v' ] == 10 ) { $this->_model->setGameKey( 'P', $this->_model->setScore( 'heels', true ), null, true ); }
        }
    }

    /* set a card down on table in play stage */
    protected function _playPlay( int $value ): void
    {
        /* collect properties */
        $g  = $this->_model->game;
        $d  = $this->_model->getDeck();
        $p  = $this->_model->getPlay();
        $ph = $this->_model->getHands()[ 0 ];
        $pp = is_null( $p[ 0 ] ) ? [ ] : $p[ 0 ];
        $ap = is_null( $p[ 2 ] ) ? [ ] : $this->_returnHandDetail( $p[ 2 ], $d );

        /* track peg value */
        $peg = 0;
        /* if it is player's turn */
        if ( $p[ 4 ] )
        {
            /* if player can play a card */
            if ( $this->_canPlay( $this->_getPlayPoints( $ap ), $this->_returnHandDetail( array_filter( $ph, function ( $a ) use ( $pp ) { return !in_array( $a, $pp ); } ), $d ) ) )
            {
                /* if player did play a card */
                if ( in_array( $value, $this->_model->getHands()[ 0 ] ) && !in_array( $value, $p[ 0 ] ?: [] ) )
                {
                    /* save any scores and return peg count */
                    $peg += $this->_scorePlay(
                        $ap,
                        $this->_returnDeckIndexDetail( $value, $d ),
                        sizeof( $p[ 0 ] ?: [] ) == 3,
                        sizeof( $p[ 1 ] ?: [] ) == 4,
                        $p[ 5 ]
                    );
                }
            }
            /* if player has no cards to play */
            else
            {
                /* advance from this stage if the play is over */
                if ( ( sizeof( $p[ 1 ] ?: [] ) == 4 ) && ( sizeof( $p[ 0 ] ?: [] ) == 4 ) ) { $this->_model->setGameKey( 'Q', 1 ); }
                else
                {
                    /* set go */
                    $this->_model->setGameKey( 'B', -1 );
                    /* opponent go automatically if the opponent is out and we have at least one more */
                    if ( ( sizeof( $p[ 1 ] ?: [] ) == 4 ) && ( sizeof( $p[ 0 ] ?: [] ) < 4 ) )
                    {
                        $this->_model->setGameKey( 'B', -1, null, true );
                        $p[ 5 ] = true;
                    }
                    /* give point for go if other player also said go */
                    if ( $p[ 5 ] )
                    {
                        /* determine if last card was opponent's */
                        $last = end( $p[ 2 ] ) == ( $p[ 1 ] ? end( $p[ 1 ] ) : null );
                        /* set go score to proper player */
                        $this->_model->setGameKey( 'P', $this->_model->setScore( 'go', $last ), null, $last );
                    }
                }
            }
            /* set peg score to model */
            if ( $peg ) { $this->_model->setGameKey( 'P', $peg ); }
        }
    }

    /* set a played card to model
     * $h: the play collection of cards
     * $c: the new card to play
     * $playOut: true if player would be out following this card
     * $oppOut: true if a played card should be followed by opponent go
     * $isGo: true if playing against a go
     */
    protected function _scorePlay( array $h, array $c, bool $playOut, bool $oppOut, bool $isGo ): int
    {
        /* get the play's new count */
        $count = $this->_getPlayPoints( $h ) + $this->_getCardPoint( $c[ 'c' ][ 'v' ] );
        /* track peg value */
        $peg   = 0;
        /* new card value */
        $v     = $c[ 'c' ][ 'v' ];
        /* size of play */
        $size  = count( $h );
        /* value map of play */
        $vmap = $this->_valueMap( $h );
        if ( $count <= 31 )
        {
            /* set card to model */
            $this->_model->setGameKey( 'B', $c[ 'i' ] );

            /* fifteen */
            if ( $count == 15 ) { $peg += $this->_model->setScore( 'fifteen' ); }

            /* pairs */
            $pfound = false;
            foreach ( range( 4, 2 ) as $plength )
            if      ( !$pfound && $size >= ( $plength - 1 ) && $this->_isMatch( [ ...array_slice( $vmap, $size - ( $plength - 1 ) ), $v ] ) )
            {
                $peg += $this->_model->setScore( 'pair' . $plength );
                $pfound = true;
            }

            /* runs */
            $rfound = false;
            foreach ( range( 7, 3 ) as $rlength )
            if      ( !$rfound && $size >= ( $rlength - 1 ) && $this->_isRun( [ ...array_slice( $vmap, $size - ( $rlength - 1 ) ), $v ] ) )
            {
                $peg += $this->_model->setScore( 'run' . $rlength );
                $rfound = true;
            }

            /* thirty-one */
            if      ( $count == 31 )
            {
                /* reset count with two go's if there are still cards to play */
                if ( !( $playOut && $oppOut ) )
                {
                    $this->_model->setGameKey( 'B', -1 );
                    $this->_model->setGameKey( 'B', -1 );
                    /* reset isGo */
                    $isGo = false;
                }
                $peg += $this->_model->setScore( 'thirtyone' );
            }
            /* if this was the last card */
            elseif ( $playOut && $oppOut ) { $peg += $this->_model->setScore( 'last' ); }
            /* take a go from opponent if the opponent is out or has already said go */
            elseif ( $oppOut  || $isGo   ) { $this->_model->setGameKey( 'B', -1, null, true ); }
        }
        return $peg;
    }

    /* test array of values for pair or array of suits for flush */
    protected function _isMatch( array $a ): bool { return count( $a ) > 1 && count( array_unique( $a ) ) == 1; }

    /* true if value array is a run */
    protected function _isRun( array $a ): bool
    {
        $count  = count( $a );
        return ( $count === count( array_unique( $a ), SORT_NUMERIC ) && $count == max( $a ) - min( $a ) + 1 );
    }

    /* set starter index to model if it passes smell test */
    protected function _playCount( int $level, array $order, array $count ): void
    {
        /* add 100 to arrays to give each level a separate space */
        function _setLevel( $a, $l ) { return array_map( fn( $o ) => $o + ( 100 * $l ), $a ); }

        /* use game object */
        $g           = $this->_model->game;
        $d           = $this->_model->getDeck();
        [ $ph, $oh ] = $this->_model->getHands();
        $ch          = $this->_model->getCrib();
        $ch          = [ ...$ch[ 0 ], ...$ch[ 1 ] ];
        $s           = $this->_model->getStarter();
        $counthand   = $this->_returnCountHand( $level, $g->iscrib, $ph, $oh, $ch );
        $savecount   = $this->_model->getCount();
        $allscore    = $this->_findScores( $this->_returnHandDetail( [ ...$counthand, $s ], $d ), 2 == $level );
        /* resolve against validscores and return  */
        $mask        = [];
        $thisscore   = $this->_findValidScores( $allscore, $count, $mask );
        $oppscore    = $this->_findValidScores( $allscore, $savecount[ 1 ][ 'c' ] ?? [] );
        /* determine points (full score of your hand, or difference between your score and opponent's score of their hand) */
        $points      = array_sum( array_map( fn( $a ) => $a[ 'o' ][ 1 ] , $thisscore ) ) - array_sum( array_map( fn( $a ) => $a[ 'o' ][ 1 ] , $oppscore ) );

        /* validations */
        if (
            /* is player's turn */
            $this->_isCountTurn( ( ( $level == 0 && !$g->iscrib ) || ( $level > 0 && $g->iscrib ) ), is_null( $savecount[ 0 ] ), is_null( $savecount[ 1 ] ) ) &&
            /* order object conforms */
            ( count( array_intersect( $order, $counthand ) ) == 4 ) &&
            /* if current player has not counted yet, or if both sides have counted hand and play can continue */
            ( !$savecount[ 0 ] || ( $savecount[ 0 ] && $savecount[ 1 ] ) ) &&
            /* if we aren't answering a savecount, or if our set includes all scores from opponent's count score */
            //( !$savecount[ 1 ] || !array_diff( $savecount[ 1 ][ 'c' ], $this->_indexMap( $thisscore ) ) ) &&
            ( !$savecount[ 1 ] || !array_diff( $savecount[ 1 ][ 'c' ], [ ...$this->_indexMap( $thisscore ), ...$mask ] ) ) &&
            /* level conforms to count stage gate */
            ( $level == $this->_model->getGate() - 1 ) &&
            /* valid points */
            ( $points >= 0 )
        )
        {
            /* set counted info to model if the player's count hasn't been set yet */
            if ( !$savecount[ 0 ] )
            {
                /* save the player's hold order */
                $this->_model->setGameKey( 'O', _setLevel( $order, $level ) );
                /* save the player's scores */
                $this->_model->setGameKey( 'M', _setLevel( $this->_indexMap( $thisscore ), $level ) );
                /* save the player's point total */
                if ( $points ) { $this->_model->setGameKey( 'P', $points ); }
            }
            /* confirm/advance if the opponent has already scored this hand */
            if ( $savecount[ 1 ] )
            {
                /* advance to next hand */
                if ( $level < 2 )
                {
                    $this->_model->setGameKey( 'Q', $level + 2 );
                    /* advance opponent as well if we didn't add any new scores */
                    if ( !$points ) { $this->_model->setGameKey( 'Q', $level + 2, null, true ); }
                }
                else
                {
                    /* advance round */
                    $this->_model->setGameKey(
                        'R',
                        /* switch to other player index */
                        ( $g->iscrib && $g->p_index == 2 ) || ( !$g->iscrib && $g->p_index == 1 ) ? 1 : 2,
                        /* begin next round */
                        $g->round + 1
                    );
                }
            }
        }

    }

    /* confirm the end of play */
    protected function _playEnd( int $value ): void
    {
        /* use game object */
        $g = $this->_model->game;
        /* make sure game can be ended and value from client matches player's final score */
        if ( -2 < $g->round && ( max( $g->p1_score, $g->p2_score ) == 121 ) && $g->p1_score == $value )
        {
            /* only if game is ranked */
            if ( $this->_deserializeLobbySetting( $g->setting, $g->p_index == 1 )[ 'rank' ] )
            {
                $this->_setGameRecord();
            }
            /* end game officially */
            $this->_model->setGameKey( 'R', 0, -2 );
        }
    }

    /* attempt to get a game record for loaded game */
    protected function _getGameRecord(): ?array
    {
        $g = &$this->_model->game;
        $record =  new _GamerecordController( $g->game_id, $g->p1_id, $g->p2_id );
        return $record->getGameRecord();
    }

    /* get the most recent player record info from model */
    protected function _getPlayerRecord( $id, $oppid ): ?array
    {
        $record = new _GamerecordController( 0, $id, $oppid );
        return $record->getPlayerRecord( $id, $oppid );
    }

    /* save the current stats for a (finished) game from gamemodel to gamerecord model */
    protected function _setGameRecord(): void
    {
        $g = $this->_model->game;
        /* get game statistics from model */
        $stat   = $this->_model->getStat();
        /* create new gamerecord object */
        $record = new _GamerecordController( $g->game_id, $g->p1_id, $g->p2_id );
        /* set the game record to model */
        $record->setGameRecord(
            /* if player won */
            $g->p1_score > $g->p2_score,
            /* count of game rounds */
            $stat[ 0 ]->rounds,
            /* both player scores */
            _GamerecordController::score( $g->p1_score, $g->p2_score ),
            /* one set of stats for each player */
            _GamerecordController::stat( $stat[ 0 ]->minscore, $stat[ 0 ]->maxscore, $stat[ 0 ]->avgscore ),
            _GamerecordController::stat( $stat[ 1 ]->minscore, $stat[ 1 ]->maxscore, $stat[ 1 ]->avgscore )
        );
    }

}
