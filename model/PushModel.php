<?php

class PushModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    /* create a new subscription record in model */
    public function setSubscription( int $deviceid, string $endpoint, $publicKey, $authToken ): void
    {
        if ( !$deviceid || !$endpoint || !$publicKey || !$authToken ) { throw new exception( 'setSubscription: invalid inputs!' ); }
        $this->run(
            'INSERT INTO `pushsubscription` ( `device_id`, `endpoint`, `key`, `token` )
            SELECT
                *
            FROM (
                SELECT
                    ? AS `device_id`,
                    ? AS `endpoint`,
                    CAST( ? AS binary(65) ) AS `key`,
                    CAST( ? AS binary(16) ) AS `token`
            ) AS s
            ON DUPLICATE KEY UPDATE
                `endpoint`  = s.`endpoint`,
                `key`       = s.`key`,
                `token`     = s.`token`,
                `timestamp` = current_timestamp()',
            [ $deviceid, $endpoint, $publicKey, $authToken ]
        );
    }

    /* delete a subscription permanently */
    public function dropSubscription( int $id ): void { $this->run( 'DELETE FROM `pushsubscription` WHERE `id` = ?', [ $id ] ); }

    /* return a list of pending notifications */
    public function listPush(): PDOStatement
    {
        return $this->run( 'CALL `requestPushQueue`( NULL )' );
    }

}
