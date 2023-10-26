<?php

/* web push encryption - message encryption and vapid header generation */
class encryption
{

    /* encrypt a payload with user key and token */
    public static function encrypt( string $payload, string $userPublicKey, string $userAuthToken, string $encoding = 'aesgcm' ): stdclass
    {
        /* create a key for this specific encryption run */
        $localKeyObject = self::_createKeyObject();
        $localPublicKey = hex2bin(
            '04'
            . str_pad( bin2hex( Base64URL::decode( $localKeyObject->x ) ), 64, '0', STR_PAD_LEFT )
            . str_pad( bin2hex( Base64URL::decode( $localKeyObject->y ) ), 64, '0', STR_PAD_LEFT )
        );
        /* get user public key object */
        $userKeyObject        = self::_createKeyObject( self::_unserializePublicKey( $userPublicKey ) );
        /* get shared secret from user public key and local private key */
        $sharedSecret         = self::_createSharedSecret( $localKeyObject, $userKeyObject );
        /* build ikm from keys and secrets */
        $ikm                  = self::_getIKM( $userAuthToken, $userPublicKey, $localPublicKey, $sharedSecret, $encoding );
        /* create context from random key and user's public key  */
        $context              = self::_createContext( $userPublicKey, $localPublicKey, $encoding );
        /* generate random salt */
        $salt                 = random_bytes( 16 );
        /* create encryption key from context and salt */
        $contentEncryptionKey = self::_hkdf( $ikm, $salt, self::_createInfo( $encoding, $context, $encoding ), 16 );
        /* create a nonce (number used once) */
        $nonce                = self::_hkdf( $ikm, $salt, self::_createInfo( 'nonce', $context, $encoding ), 12 );
        /* encrypt the payload and return an object with public key and salt */
        $tag = '';
        return (object) [
            'localPublicKey' => $localPublicKey,
            'salt'           => $salt,
            'cipherText'     =>
                self::_createContentHeader( $salt, $localPublicKey, $encoding )
                . openssl_encrypt(
                    self::_packPayload( $payload, self::$_padlength, $encoding ),
                    'aes-128-gcm',
                    $contentEncryptionKey,
                    OPENSSL_RAW_DATA,
                    $nonce,
                    $tag
                )
                . $tag
        ];
    }

    /* build headers for a push request */
    public static function buildHeaders( string $content, string $salt, string $localPublicKey, string $endpoint, string $encoding ): array
    {
        /* basic headers */
        $headers = [
            'Content-Type'     => 'application/octet-stream',
            'TTL'              => 2419200,
            'Content-Encoding' => $encoding,
            'Content-Length'   => (string) mb_strlen( $content, '8bit' )
        ];
        /* create jwt using server-side vapid keys */
        $jwt = self::buildJWT( $endpoint );
        /* unique encoding headers */
        if ( 'aesgcm' === $encoding )
        {
            $headers[ 'Authorization' ] = 'WebPush '   . $jwt;
            $headers[ 'Crypto-Key' ]    = 'dh='        . Base64URL::encode( $localPublicKey ) . ';'
                                        . 'p256ecdsa=' . self::vapidPublic();
            $headers[ 'Encryption' ]    = 'salt='      . Base64URL::encode( $salt );
        }
        elseif ( 'aes128gcm' === $encoding )
        {
            $headers[ 'Authorization' ] = 'vapid t=' . $jwt . ', k=' . self::vapidPublic();
        }
        else   { throw new Exception( 'content encoding not supported' ); }
        return $headers;
    }

    /* create a new JWT */
    public static function buildJWT( string $endpoint ): string
    {
        /* vapid keys */
        $publickey    = Base64URL::decode( self::vapidPublic() );
        $privatekey   = Base64URL::decode( self::vapidPrivate() );
        /* JWTInfo */
        $info         = [ 'typ' => 'JWT', 'alg' => 'ES256' ];
        $info_encoded = Base64URL::encode( json_encode( $info ) );
        /* JWTData */
        $data         = [
            /* endpoint origin */
            'aud' => 'https://' . parse_url( $endpoint )[ 'host' ],
            /* 12 hours */
            'exp' => time() + 43200,
            /* subscription info */
            'sub' => 'https://' . self::$_vapidHostname
        ];
        $data_encoded = Base64URL::encode( json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK ) );
        /* build signature */
        $pem          = self::_convertPrivateKeyToPEM( self::_createKeyObject( self::_unserializePublicKey( $publickey ), $privatekey ) );
        /* sign first two encoded strings in token */
        if ( openssl_sign( "$info_encoded.$data_encoded", $der, $pem, 'sha256' ) ) { $signature = self::_signatureFromDER( $der ); } else { throw new Exception(); }
        $signature_encoded = Base64URL::encode( $signature );
        /* build and return the token */
        return "$info_encoded.$data_encoded.$signature_encoded";
    }

    /* vapid public key */
    private static string $_vapidPublic;
    public  static function vapidPublic(): string
    {
        /* load from file */
        if ( !isset( self::$_vapidPublic ) ) { self::$_vapidPublic = rtrim( @file_get_contents( 'vapid.public.key' ) ); }
        return self::$_vapidPublic;
    }

    /* vapid private key */
    private   static string $_vapidPrivate;
    protected static function vapidPrivate(): string
    {
        /* load from file */
        if ( !isset( self::$_vapidPrivate ) ) { self::$_vapidPrivate = rtrim( @file_get_contents( 'vapid.private.key' ) ); }
        return self::$_vapidPrivate;
    }

    /* vapid host name */
    private static string $_vapidHostname;
    public  static function setHostname( string $name ): void { self::$_vapidHostname = $name; }

    /* length to pad payload to */
    private static int $_padlength = 255;

    /* pack a payload string for encryption - set normalized payload length for security */
    private static function _packPayload( string $payload, int $length, string $encoding ): string
    {
        /* length of payload */
        $payloadLen = mb_strlen( $payload, '8bit' );
        /* length of padding */
        $padLen     = $length ? $length - $payloadLen : 0;
        /* use distinct padding by content encoding */
        if     ( 'aesgcm'    === $encoding ) { return pack( 'n*', $padLen ).str_pad( $payload, $padLen + $payloadLen, chr( 0 ), STR_PAD_LEFT ); }
        elseif ( 'aes128gcm' === $encoding ) { return str_pad( $payload.chr( 2 ), $padLen + $payloadLen, chr( 0 ), STR_PAD_RIGHT ); }
        else   { throw new Exception( 'content encoding not supported' ); }
    }

    /* return a header for a given content encoding */
    public static function _createContentHeader( string $salt, string $localPublicKey, string $encoding ): string
    {
        $header = '';
        if ( 'aes128gcm' === $encoding ) { $header = $salt . pack( 'N*', 4096 ) . pack( 'C*', mb_strlen( $localPublicKey, '8bit' ) ) . $localPublicKey; }
        return $header;
    }

    /* return x / y coordinates of binary key data */
    private static function _unserializePublicKey( string $data ): array
    {
        /* unpack data and determine length */
        $data       = mb_substr( bin2hex( $data ), 2, null, '8bit' );
        $dataLength = mb_strlen( $data, '8bit' );
        /* [ x, y ] */
        return [
            hex2bin( mb_substr( $data,    0, $dataLength / 2, '8bit' ) ),
            hex2bin( mb_substr( $data, $dataLength / 2, null, '8bit' ) ),
        ];
    }

    /* return JSON Web Key object from an unserialized public key or generate a new key */
    private static function _createKeyObject( ?array $unserializedKey = null, ?string $privateKey = null ): stdclass
    {
        /* set coordinates from key if one was given */
        if ( $unserializedKey )
        {
            [ $x, $y ] = $unserializedKey;
            if ( $privateKey ) { $d = $privateKey; }
        }
        else
        {
            $details = openssl_pkey_get_details( openssl_pkey_new( [ 'curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC ] ) );
            $x       = str_pad( $details[ 'ec' ][ 'x' ], 32, chr( 0 ), STR_PAD_LEFT );
            $y       = str_pad( $details[ 'ec' ][ 'y' ], 32, chr( 0 ), STR_PAD_LEFT );
            $d       = str_pad( $details[ 'ec' ][ 'd' ], 32, chr( 0 ), STR_PAD_LEFT );
        }
        /* return key object with urlsafe encoded strings */
        return (object) [
            'kty' => 'EC',
            'crv' => 'P-256',
            /* coordinates */
            'x'   => Base64URL::encode( $x ),
            'y'   => Base64URL::encode( $y ),
            /* private key */
            'd'   => isset( $d ) ? Base64URL::encode( $d ) : null
        ];
    }

    private static function _getKey( $x, $y, $length = 32 ): string
    {
        return "\04" . str_pad( Base64URL::decode( $x ), $length, "\0", STR_PAD_LEFT ) . str_pad( Base64URL::decode( $y ), $length, "\0", STR_PAD_LEFT );
    }

    /* convert json web key to public key pem */
    private static function _convertPublicKeyToPEM( stdclass $jwk ): string
    {
        $pem = '-----BEGIN PUBLIC KEY-----' . PHP_EOL
            . chunk_split( base64_encode(
                /* p256 public key sequence */
                pack( 'H*', '3059301306072a8648ce3d020106082a8648ce3d030107034200' )
                . self::_getKey( $jwk->x, $jwk->y )
            ), 64, PHP_EOL )
            . '-----END PUBLIC KEY-----' . PHP_EOL;
        return $pem;
    }

    /* convert json web key to private key pem */
    public static function _convertPrivateKeyToPEM( stdclass $jwk ): string
    {
        $pem = '-----BEGIN EC PRIVATE KEY-----' . PHP_EOL
            . chunk_split( base64_encode(
                pack(
                    'H*',
                    '3077' . '020101' . '0420'
                    . unpack( 'H*', str_pad( Base64URL::decode( $jwk->d ), 32, "\0", STR_PAD_LEFT ) )[ 1 ]
                    . 'a00a' . '0608' . '2a8648ce3d030107' . 'a144' . '0342' . '00'
                ) . self::_getKey( $jwk->x, $jwk->y )
            ), 64, PHP_EOL )
            . '-----END EC PRIVATE KEY-----' . PHP_EOL;
        return $pem;
    }

    /* return shared secret from a public_key and private_key */
    private static function _createSharedSecret( stdclass $private_key, stdclass $public_key ): string
    {
        /* create PEM for each key */
        $publicPem  = self::_convertPublicKeyToPEM( $public_key );
        $privatePem = self::_convertPrivateKeyToPEM( $private_key );
        /* return derived secret */
        return str_pad( openssl_pkey_derive( $publicPem, $privatePem, 256 ), 32, chr( 0 ), STR_PAD_LEFT );
    }

    /* return input key material */
    private static function _getIKM(
        string $userAuthToken,
        string $userPublicKey,
        string $localPublicKey,
        string $sharedSecret,
        string $encoding
    ): string
    {
        if     ( 'aesgcm'    === $encoding ) { $info = 'Content-Encoding: auth' . chr( 0 ); }
        elseif ( 'aes128gcm' === $encoding ) { $info = 'WebPush: info' . chr( 0 ) . $userPublicKey . $localPublicKey; }
        else   { throw new Exception( 'content encoding not supported' ); }
        return self::_hkdf( $sharedSecret, $userAuthToken, $info, 32 );
    }

    /* hash-based key derivation function
     * accepts input keying material (IKM) and returns strong output keying material (OKM)
     * ikm    - input key material
     * salt   - salt the result
     * info   - string from _createInfo()
     * length - key length
    */
    private static function _hkdf( string $ikm, string $salt, string $info, int $length ): string
    {
        return mb_substr( hash_hmac( 'sha256', $info . chr( 1 ), hash_hmac( 'sha256', $ikm, $salt, true ), true ), 0, $length, '8bit' );
    }

    /* return an encryption context */
    private static function _createContext(
        string $clientPublicKey,
        string $serverPublicKey,
        string $encoding
    ): ?string
    {
        if     ( 'aes128gcm' === $encoding ) { $context = null; }
        else   { $context = chr( 0 ) . chr( 0 ) . 'A' . $clientPublicKey . chr( 0 ) . 'A' . $serverPublicKey; }
        return $context;
    }

    private static function _createInfo( string $type, ?string $context, string $encoding ): string
    {
        if     ( 'aesgcm'    === $encoding ) { $info = $type . chr( 0 ) . 'P-256' . $context; }
        elseif ( 'aes128gcm' === $encoding ) { $info = $type . chr( 0 ); }
        else   { new Exception( 'content encoding not supported' ); }
        return ( 'Content-Encoding: ' . $info );
    }

    /* return signature from binary signature data */
    private static function _signatureFromDER( string $der ): ?string
    {
        $R   = false;
        $S   = false;
        $hex = unpack( 'H*', $der )[ 1 ];
        if ( '30' === mb_substr( $hex, 0, 2, '8bit' ) )
        {
            /* sequence types */
            if   ( '81' === mb_substr( $hex, 2, 2, '8bit' ) ) { $hex = mb_substr( $hex, 6, null, '8bit' ); }
            else { $hex = mb_substr( $hex, 4, null, '8bit' ); }
            if   ( '02' === mb_substr( $hex, 0, 2, '8bit' ) )
            {
                $Rl  = (int) hexdec( mb_substr( $hex, 2, 2, '8bit' ) );
                $R   = str_pad( self::_retrievePosInt( mb_substr( $hex, 4, $Rl * 2, '8bit' ) ), 64, '0', STR_PAD_LEFT );
                $hex = mb_substr( $hex, 4 + $Rl * 2, null, '8bit' );
                if ( '02' === mb_substr( $hex, 0, 2, '8bit' ) )
                {
                    $Sl = (int) hexdec( mb_substr( $hex, 2, 2, '8bit' ) );
                    $S  = str_pad( self::_retrievePosInt( mb_substr( $hex, 4, $Sl * 2, '8bit' ) ), 64, '0', STR_PAD_LEFT );
                }
            }
        }
        /* return signature upon success */
        if ( $R !== false && $S !== false ) { return pack( 'H*', $R . $S ); }
    }

    /* remove hex padding */
    private static function _retrievePosInt( string $data ) : string
    {
        while ( '00' === mb_substr( $data, 0, 2, '8bit' ) && '7f' < mb_substr( $data, 2, 2, '8bit' ) ) { $data = mb_substr( $data, 2, null, '8bit' ); }
        return $data;
    }
}