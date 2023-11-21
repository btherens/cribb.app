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
        while ( $update = $list->fetch() )
        {
            /* 410 status code callback */
            $callback = fn() => $this->_model->dropSubscription( $update->id );
            /* create a new push message object */
            $message  = $this->_createPushObj( $update );
            /* add request to queue */
            $curl->request( $update->endpoint, 'POST', $message->cipherText(), $message->headers(), null, $callback );
        }
        /* be sure to close cursor to avoid issues */
        $list->closeCursor();
        /* execute pending curl requests */
        $curl->execute();
        /* delete any revoked subscriptions */
        $this->_model->flushDroppedSubscriptions();
    }

    private function _createPushObj( $update, string $basedns = 'cribb.app' /*BASEDNS*/ ): cozyPush
    {
        return new cozyPush(
            /* encrypt this object for client */
            json_encode( $this->_buildTurnUpdatePayload(
                $update->p2_name,
                $update->game_id,
                $update->badge
            ) ),
            $basedns,
            /* properties needed to encrypt payload and build headers */
            $update->endpoint,
            $update->key,
            $update->token,
            $update->encoding
        );
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
