<?php

class PushController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Push';
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

}
