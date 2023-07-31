<?php

class AvatarController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Avatar';
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* set a new avatar config to model */
    public function setAvatar( $cmd ): void
    {
        $response = false;
        /* filter inputs */
        $input = filter_var_array( $cmd, [
            /* validate avatar integer array */
            'avatar' => [
                'filter' => FILTER_VALIDATE_INT,
                'flags'  => FILTER_FORCE_ARRAY
            ]
        ] );
        if ( $id = auth::id() )
        {
            try
            {
                /* filter input through avatarmap keys */
                $cfg      = $this->_model->mapArrToObject( $input[ 'avatar' ], $this->_model->getAvatarMap() );
                /* save config to model */
                $this->_model->setAvatarConfig( $id, $cfg );
                $response = [ 'success' => true ];
            }
            catch ( Exception $e ) { http_response_code( 500 ); }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* get an avatar from model */
    public function getAvatar(): void
    {
        $response = false;
        if ( $id = auth::id() )
        {
            try
            {
                /* attempt to load avatar from model */
                $cfg      = $this->_model->getAvatarConfig( $id );
                /* return result or false if we couldnt get an avatar */
                $response = $cfg ? [ 'avatarConfig' => array_values( $cfg ) ] : false;
            }
            catch ( Exception $e ) { http_response_code( 500 ); }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

}
