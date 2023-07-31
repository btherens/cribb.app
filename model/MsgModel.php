<?php

class MsgModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    /* return timestamp of last update */
    public function getTimestamp( $id ): int { return strtotime( $this->run( 'SELECT `timestamp` FROM `vtimestamp` WHERE `id` = ? LIMIT 1', [ $id ] )->fetchColumn() ); }

}
