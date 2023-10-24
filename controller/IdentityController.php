<?php

class IdentityController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Identity';
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* return basic javascript app */
    public function create(): void
    {
        $appload = new ApploaderController( 'index', 'create identity' );
        $appload->index();
    }
    public function update(): void
    {
        $appload = new ApploaderController( 'index', 'update identity' );
        $appload->index();
    }

    /* run a name through server filter and return */
    protected function _filterName( $name ): string
    {
        /* filter out profanity before assigning variable */
        $blockwords = new WordFilter();
        return $blockwords->filter_string( $name );
    }

    /* update an identity profile on the server and return success */
    public function updateIdentity( $cmd ): void
    {
        $response = false;
        /* filter inputs */
        $input = filter_var_array( $cmd, [
            /* name validate with regex pattern */
            'name' => [
                'filter' => FILTER_VALIDATE_REGEXP,
                'options' => [ 'regexp' =>  '/^[ -~]{1,14}$/' ]
            ]
        ] );
        /* filter name */
        $name = $this->_filterName( $input[ 'name' ] );
        if ( $name && $this->_challenge() )
        {
            try
            {
                /* set new name to model */
                $this->_model->setName( $name );
                $response = [ 'name' => $name, 'success' => true ];
            }
            catch ( Exception $e )
            {
                http_response_code( 500 );
                $response = [ 'message' => 'errors encountered while updating identity name!', 'success' => false ];
            }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* update an identity profile on the server and return success */
    public function forgetIdentity( ): void
    {
        $response = false;
        if ( $this->_challenge() )
        {
            try
            {
                /* destroy session and remove tokens */
                $this->_model->dropSession();
                $this->_model->dropDevice();
                $response = [ 'message' => 'identity disconnected', 'success' => true ];
            }
            catch ( Exception $e )
            {
                http_response_code( 500 );
                $response = [ 'message' => 'errors encountered while disconnecting from identity!', 'success' => false ];
            }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* attempt to recover an active session from session_id, fallback to device token */
    protected function _challenge(): bool
    {
        /* get cookie */
        $token = isset( $_COOKIE[ 'devicetoken' ] ) ? $_COOKIE[ 'devicetoken' ] : '';
        /* attempt to load credentials from session, then from device cookie */
        return $this->_model->challengeSession( session_id() ) ?: $this->_model->challengeDevice( $_COOKIE[ 'devicetoken' ] ?? '' );
    }

    /* return an active identity object - return false if not logged in */
    public function getIdentity(): void
    {
        $response = false;
        try
        {
            /* attempt to load credentials and confirm the identity is fully enabled */
            if ( $this->_challenge() && $this->_model->identity->enabled )
            {
                $record   = new _GamerecordController( 0, $this->_model->identity->id, null );
                $response = [ 'name' => $this->_model->getName(), 'stat' => ( $record->getPlayerRecord() ?? [ null ] )[ 0 ] ];
            }
        }
        catch ( Exception $e ) { http_response_code( 500 ); } 

        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* create a new webauthn object */
    protected function _createWebAuthn(): lbuchs\WebAuthn\WebAuthn
    {
        return new lbuchs\WebAuthn\WebAuthn( 'cribb.app', BASEDNS, [ 'none' ] );
    }

    /* create an identity record and return a webauthn attestationoptions object to sign */
    public function createAttestation( $cmd ): void
    {
        /* filter inputs */
        $input = filter_var_array( $cmd, [
            /* name validate with regex pattern */
            'name' => [
                'filter' => FILTER_VALIDATE_REGEXP,
                'options' => [ 'regexp' =>  '/^[ -~]{1,14}$/' ]
            ]
        ] );
        /* filter name */
        $name = $this->_filterName( $input[ 'name' ] );
        if ( $name )
        {
            try
            {
                /* create new identity */
                $this->_model->createIdentity( );
                $this->_model->createDevice( );
                $this->_model->createSession( );

                $this->_model->setName( $name );

                $userid = $this->_model->identity->id_ext;

                $webauthn = $this->_createWebAuthn();
                $response = $webauthn->getCreateArgs( $userid, $name, $name, 60, true, false, false )->publicKey;
                $_SESSION[ 'challenge' ] = $webauthn->getChallenge()->getBinaryString();
            }
            catch ( Exception $e )
            {
                http_response_code( 500 );
                $response = [ 'message' => 'errors encountered while creating identity!', 'success' => false ];
            }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* save a returned webauthn signature to model for authentication later */
    public function attestIdentity( $cmd ): void
    {
        $response = false;
        /* check for valid state: if session can load and session has a challenged but inactive identity */
        if (
            /* only if we have a challenge in this session */
            ( $challenge = $_SESSION[ 'challenge' ] ) &&
            /* only if clientDataJSON can be decoded to object */
            ( $clientDataJSON    = base64_decode( $cmd[ 'clientDataJSON' ]    ) ) &&
            ( $attestationObject = base64_decode( $cmd[ 'attestationObject' ] ) ) &&
            /* attempt to get a session */
            $this->_challenge() &&
            /* only proceed if identity is not yet active */
            $this->_model->identity->enabled === 0
        )
        {
            $webauthn = $this->_createWebAuthn();
            $data = $webauthn->processCreate( $clientDataJSON, $attestationObject, $challenge );
            try
            {
                /* set credentials to model */
                $this->_model->setCredentialKey( $data->credentialId, $data->credentialPublicKey );
                $name = $this->_model->getName();
                $response = [ 'name' => $name, 'success' => true ];
            }
            catch ( Exception $e )
            {
                http_response_code( 500 );
                $response = [ 'message' => 'errors encountered while signing identity!', 'success' => false ];
            }

        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* return an assertion create object to client */
    public function createAssertion( ): void 
    {
        $webauthn = $this->_createWebAuthn();
        try
        {
            $response = $webauthn->getGetArgs( )->publicKey;
            $_SESSION[ 'challenge' ] = $webauthn->getChallenge()->getBinaryString();
        }
        catch ( Exception $e )
        {
            http_response_code( 500 );
            $response = [ 'message' => 'errors encountered while creating assertion!', 'success' => false ];
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

    /* assert user identity using results from client passkey - session and device links are generated upon success */
    public function assertIdentity( $cmd ): void
    {
        $response = false;
        if (
            /* only if we have a challenge in this session */
            ( $challenge         = $_SESSION[ 'challenge' ] ) &&
            /* only if arguments can be decoded */
            ( $rawId             = base64_decode( $cmd[ 'rawId' ] ) ) &&
            ( $clientDataJSON    = base64_decode( $cmd[ 'clientDataJSON' ] ) ) &&
            ( $authenticatorData = base64_decode( $cmd[ 'authenticatorData' ] ) ) &&
            ( $signature         = base64_decode( $cmd[ 'signature' ] ) ) &&
            ( $userHandle        = base64_decode( $cmd[ 'userHandle' ] ) )
        )
        {
            /* key lookup on the credential's rawId */
            if ( $key = $this->_model->getCredentialKey( $rawId ) )
            {
                $webauthn = $this->_createWebAuthn();
                try
                {
                    /* test identity */
                    if ( $webauthn->processGet( $clientDataJSON, $authenticatorData, $signature, $key, $challenge, null ) )
                    {
                        /* register device and session */
                        $this->_model->createDevice( );
                        $this->_model->createSession( );
    
                        /* return response */
                        $response = [ 'name' => $this->_model->getName(), 'success' => true ];
                    }
                }
                catch ( Exception $e )
                {
                    http_response_code( 500 );
                    $response = [ 'message' => 'login failed...', 'success' => false ];
                }
            }
            else 
            {
                $response = [ 'message' => 'passkey unrecognized!', 'success' => false ];
            }
        }
        header( 'Content-type: application/json; charset=utf-8' );
        echo json_encode( $response );
    }

}
