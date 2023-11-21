<?php

class _PushController extends PushController
{

    /* constructor */
    public function __construct() { parent::__construct( null ); }

    /* run push service until timeout in seconds */
    public function runPushService( int $timeout = 60 ): void
    {
        /* begin timer */
        $start = microtime( true );
        /* run push service in 4 second batches */
        do { $this->_execPush(); } while ( sleep( 4 ) || microtime( true ) - $start < $timeout );
    }

    /* query database for pending notifications and send curl requests for each one */
    private function _execPush(): void
    {
        /* create curl object with callback for 410 status code */
        $curl = new cozyCurl( function( $response, $info, $request ) { if ( 410 === $info[ 'http_code' ] ) { ( $request->callback )(); } } );
        /* return list of notifications to send */
        $list = $this->_model->listPush();
        /* loop through pending notifications */
        while ( $notification = $list->fetch() )
        {
            /* create and encrypt a notification payload */
            $message  = cozyPush::encrypt(
                json_encode( $this->_buildTurnUpdatePayload( $notification->p2_name, $notification->game_id, $notification->badge ) ),
                $notification->key,
                $notification->token,
                $notification->encoding
            );
            /* create headers */
            $headers  = cozyPush::buildHeaders( $message->cipherText, $message->salt, $message->localPublicKey, $notification->endpoint, $notification->encoding );
            /* 410 status code callback */
            $callback = fn() => $this->_model->dropSubscription( $notification->id );
            /* add request to queue */
            $curl->request( $notification->endpoint, 'POST', $message->cipherText, $headers, null, $callback );
        }
        /* be sure to close cursor to avoid issues */
        $list->closeCursor();
        /* execute pending curl requests */
        $curl->execute();
        /* delete any revoked subscriptions */
        $this->_model->flushDroppedSubscriptions();
    }

    /* return a turn update notification for frontend */
    private function _buildTurnUpdatePayload( string $name, int $gid, int $badge ): stdclass
    {
        return (object) [
            's' => $name,
            'm' => "it's your turn!",
            'u' => 'g/' . shortID::toShort( $gid ),
            'b' => $badge
        ];
    }

}
