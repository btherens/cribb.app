<?php

class _GamerecordController extends Controller
{

    /* constructor */
    public function __construct( int $gid, int $identity_id, int $opp_id )
    {
        $model = '_Gamerecord';
        parent::__construct( $model, [ $gid, $identity_id, $opp_id ] );
        $this->_setModel( $model );
    }

    /* set of player statistics in a game */
    public static function stat( int $min, int $max, float $avg ): array { return [ $min, $max, $avg ]; }
    /* both player's scores */
    public static function score( int $score1, int $score2 ): array { return [ $score1, $score2 ]; }

    /* return a game result if one was saved */
    public function getGameRecord( int $gid = null, int $identity_id = null ): ?array
    {
        /* default parameters from object creation */
        if ( is_null( $gid ) ) { $gid = $this->_action[ 0 ]; }
        if ( is_null( $identity_id ) ) { $identity_id = $this->_action[ 1 ]; }
        /* load record from model and return */
        return $this->_model->getGameRecord( $gid, $identity_id );
    }

    /* save a ranked game result to game_result model */
    public function setGameRecord( bool $iswin, int $roundcount, array $score, array $statPlayer, array $statOpp ): void
    {
        /* get properties from constructor */
        [ $gid, $identity_id, $opp_id ] = $this->_action;
        /* set player record */
        $this->_model->setGameRecord( $gid, $identity_id, $opp_id, $iswin, $roundcount, $score[ 0 ], $statPlayer[ 0 ],  $statPlayer[ 1 ], $statPlayer[ 2 ], true );
        /* set opponent record (but don't overwrite) */
        $this->_model->setGameRecord( $gid, $opp_id, $identity_id, !$iswin, $roundcount, $score[ 1 ], $statOpp[ 0 ],  $statOpp[ 1 ], $statOpp[ 2 ], false );
    }

    /* get a player's record */
    public function getPlayerRecord( int $identity_id = null ): ?stdclass
    {
        if ( is_null( $identity_id ) ) { $identity_id = $this->_action[ 1 ]; }
        /* load latest player record */
        return $this->_model->getPlayerRecord( $identity_id );
    }

}
