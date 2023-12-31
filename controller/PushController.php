<?php

class PushController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Push';
        /* only run push service from cli */
        if ( 'runpushservice' == strtolower( $action ?? '' ) && 'cli' !== php_sapi_name() ) { throw new Exception( 'forbidden method' ); }
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* save a push subscription to model */
    public function setSubscription( $cmd ): void
    {
        $response = false;
        if
        (
            /* return a valid deviceid */
            ( $id       = auth::deviceid() ) &&
            /* endpoint url */
            ( $endpoint = filter_var( $cmd[ 'u' ], FILTER_VALIDATE_URL ) ) &&
            /* client's public key and authtoken for content encryption */
            ( $key      = base64_decode( $cmd[ 'k' ] ) ) &&
            ( $token    = base64_decode( $cmd[ 't' ] ) )
        )
        {
            /* save to model */
            $this->_model->setSubscription( $id, $endpoint, $key, $token );
            /* confirm result */
            $response = true;
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* run push service until timeout in seconds */
    public function runPushService( int $timeout = 60 ): void
    {
        /* begin timer */
        $start   = microtime( true );
        /* run push service in 4 second batches */
        do { $this->_execPush(); } while ( sleep( 4 ) || microtime( true ) - $start < $timeout );
    }

    /* query database for pending notifications and send curl requests for each one */
    private function _execPush(): void
    {
        /* create curl object with callback for 410 status code */
        $curl = new easycurl( function( $response, $info, $request ) { if ( 410 === $info[ 'http_code' ] ) { ( $request->callback )(); } } );
        /* return list of notifications to send */
        $list = $this->_model->listPush();
        /* loop through pending notifications */
        while ( $notification = $list->fetch() )
        {
            /* create and encrypt a notification payload */
            $message  = encryption::encrypt(
                json_encode( $this->_buildTurnUpdatePayload( $notification->p2_name, $notification->game_id, $notification->badge ) ),
                $notification->key,
                $notification->token,
                $notification->encoding
            );
            /* create headers */
            $headers  = $this->_buildHeaders( $message->cipherText, $message->salt, $message->localPublicKey, $notification->endpoint, $notification->encoding );
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

    /* build and return headers for a push request */
    private function _buildHeaders( string $content, string $salt, string $localPublicKey, string $endpoint, string $encoding ): array
    {
        /* basic headers */
        $headers = [
            'Content-Type'     => 'application/octet-stream',
            'TTL'              => 2419200,
            'Content-Encoding' => $encoding,
            'Content-Length'   => (string) mb_strlen( $content, '8bit' )
        ];
        /* create jwt using server-side vapid keys */
        $jwt = encryption::buildJWT( $endpoint );
        /* unique encoding headers */
        if ( 'aesgcm' === $encoding )
        {
            $headers[ 'Authorization' ] = 'WebPush '   . $jwt;
            $headers[ 'Crypto-Key' ]    = 'dh='        . Base64URL::encode( $localPublicKey ) . ';'
                                        . 'p256ecdsa=' . encryption::vapidPublic();
            $headers[ 'Encryption' ]    = 'salt='      . Base64URL::encode( $salt );
        }
        elseif ( 'aes128gcm' === $encoding )
        {
            $headers[ 'Authorization' ] = 'vapid t=' . $jwt . ', k=' . encryption::vapidPublic();
        }
        else   { throw new Exception( 'content encoding not supported' ); }
        return $headers;
    }

}
