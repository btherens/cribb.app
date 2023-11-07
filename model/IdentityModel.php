<?php

class IdentityModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    public readonly stdClass $identity;
    public readonly stdClass $device;
    public readonly stdClass $session;

    private string $_name;

    /* db loaders */
    protected function _loadIdentity( int $id ): void { $this->identity = $this->run( 'SELECT * FROM `identity` WHERE `id` = ?', [ $id ] )->fetch(); }

    protected function _loadDevice( int $id ): void { $this->device = $this->run( 'SELECT * FROM `device` WHERE `id` = ?', [ $id ] )->fetch(); }

    protected function _loadSession( int $id ): void { $this->session = $this->run( 'SELECT * FROM `session` WHERE `id` = ?', [ $id ] )->fetch(); }

    /* create a new identity and return id */
    public function createIdentity( ): int
    {
        $this->run( 'INSERT INTO `identity` ( `id_ext` ) SELECT uuid_to_bin( uuid() )' );
        $id = intval( $this->lastInsertId() );
        /* load identity we just created into model */
        $this->_loadIdentity( $id );
        return $id;
    }

    /* create a new device token pair and set to client cookie and server model */
    public function createDevice( int $id = null ): ?int
    {
        /* use model by default */
        if ( $id === null ) { $id = $this->identity->id; }
        if ( $id )
        {
            [ $selector, $hash, $expiry ] = $this->_generateDeviceTokens();
            $this->run( 'INSERT INTO `device` ( `identity_id`, `selector`, `validator_hash`, `expiry` ) SELECT ?, ?, ?, FROM_UNIXTIME( ? )', [ $id, $selector, $hash, $expiry ] );
            $output = intval( $this->lastInsertId() );
            $this->_loadDevice( $output );
        }
        return $output;
    }

    /* create a new session record in model */
    public function createSession( int $id = null ): ?int
    {
        if ( $id === null ) { $id = $this->device->id; }
        if ( $id )
        {
            $this->run(
                'INSERT INTO `session` ( `device_id`, `session_id`, `expiry` )
                SELECT
                    *
                FROM (
                    SELECT
                        ? AS `device_id`,
                        ? AS `session_id`,
                        NOW() + INTERVAL 1 DAY AS `expiry`
                ) AS s
                ON DUPLICATE KEY UPDATE
                    `id`         = LAST_INSERT_ID( `id` ),
                    `device_id`  = s.`device_id`,
                    `session_id` = s.`session_id`,
                    `expiry`     = s.`expiry`',
                [ $id, session_id() ]
            );
            $output = intval( $this->lastInsertId() );
            $this->_loadSession( $output );
        }
        return $output;
    }

    /* remove a device from model */
    public function dropDevice( int $id = null ): void
    {
        if ( $id === null ) { $id = $this->device->id; }
        $this->run( 'UPDATE `device` SET `expiry` = now() WHERE `id` = ?', [ $id ] );
        if ( isset( $_COOKIE[ 'devicetoken' ] ) ) { unset( $_COOKIE[ 'devicetoken' ] ); }
    }

    /* remove a session */
    public function dropSession( int $id = null ): void
    {
        if ( $id === null ) { $id = $this->session->id; }
        $this->run( 'UPDATE `session` SET `expiry` = now() WHERE `id` = ?', [ $id ] );
        session_destroy();
    }

    /* challenge a session state - returns success/fail */
    public function challengeSession( $sid ): bool
    {
        $result = false;
        $output = $this->run(
            'SELECT    s.`id`, s.`device_id`, d.`identity_id` FROM `vsession` s
            INNER JOIN `device`   d ON s.`device_id`   = d.`id` AND d.`expiry` > now()
            INNER JOIN `identity` i ON d.`identity_id` = i.`id` AND ( i.`enabled` = 1 OR i.`timestamp` > NOW() - INTERVAL 30 SECOND )
            WHERE      s.`session_id` = ? AND s.`expiry` > now()',
            [ $sid ]
        )->fetch();
        if ( $output )
        {
            /* load session, device, and identity */
            $this->_loadSession( $output->id );
            $this->_loadDevice( $output->device_id );
            $this->_loadIdentity( $output->identity_id );
        }

        return (bool) $output;
    }

    /* challenge a device state - returns success/fail */
    public function challengeDevice( string $token ): bool
    {
        $result   = false;
        $arrToken = $this->_parseTokens( $token );
        if ( $arrToken )
        {
            $device = $this->run(
                'SELECT    d.`id`, d.`identity_id`, d.`validator_hash` FROM `device` d
                INNER JOIN `identity` i ON d.`identity_id` = i.`id` AND ( i.`enabled` = 1 OR i.`timestamp` > NOW() - INTERVAL 30 SECOND )
                WHERE      d.`selector` = ? AND d.`expiry` > now() LIMIT 1',
                [ $arrToken[ 0 ] ]
            )->fetch();
            if ( $device )
            {
                $result = password_verify( $arrToken[ 1 ], $device->validator_hash );
                if ( $result )
                {
                    /* load identity */
                    $this->_loadIdentity( $device->identity_id );
                    $this->_loadDevice( $device->id );
                    /* disabled: drop current device record and recreate after successful challenge */
                    /* drop old device */
                    //$this->dropDevice( $device->id );
                    /* create new device */
                    //$this->createDevice( $device->identity_id );
                    /* create new session */
                    $this->createSession();
                }
            }
        }
        return (bool) $result;
    }

    /* set a credentialId + publickey to identity */
    public function setCredentialKey( string $credId, string $key ): void
    {
        /* internal identifier */
        $id = &$this->identity->id;
        if ( $id )
        {
            /* save credId, key to model:
             * if no key has been set
             * if identity record is < 60 seconds old
             */
            $this->run(
                'INSERT INTO `fidokey` ( `identity_id`, `credId`, `credKey` )
                SELECT       i.`id`, ?, ?
                FROM         `identity` i
                LEFT JOIN    `fidokey`  fk on i.`id` = fk.`identity_id` 
                WHERE        ? = i.`id` AND fk.`id` IS NULL AND i.`timestamp` > NOW() - INTERVAL 60 SECOND',
                [ $credId, $key, $id ]
            );
            /* fully enable identity */
            $this->run(
                'UPDATE `identity` i
                JOIN    `fidokey` fk ON i.`id` = fk.`identity_id` 
                SET     i.`enabled` = 1, i.`timestamp` = CURRENT_TIMESTAMP
                WHERE   fk.`id` = LAST_INSERT_ID()'
            );
        }
    }

    /* return a valid public key and set identity to property */
    public function getCredentialKey( string $credId ): ?string
    {
        $result = false;
        $cred   = $this->run( 'SELECT `identity_id`, `credKey` FROM `fidokey` WHERE `credId` = ?', [ $credId ] )->fetch();
        if ( $cred )
        {
            $this->_loadIdentity( $cred->identity_id );
            $result = $cred->credKey;
        }
        return $result;
    }

    /* generate [ selector, validator ] token pair and return */
    protected function _generateDeviceTokens(): array
    {
        /* generate token pair */
        $select   = bin2hex( random_bytes( 16 ) );
        $validate = bin2hex( random_bytes( 32 ) );
        /* 10 years */
        $expiry   = time() + ( 10 * 365 * 24 * 60 * 60 );
        /* set device cookie */
        setcookie( 'devicetoken', $select . ':' . $validate, $expiry, '/' );
        /* return selector and hashed validator */
        return [ $select, password_hash( $validate, PASSWORD_DEFAULT ), $expiry ];
    }

    /* get token pair from string and return */
    protected function _parseTokens( string $token ): ?array
    {
        /* split token */
        $arr = explode( ':', $token ?: '' );
        /* test result for proper dimensions and return */
        if ( $arr && count( $arr ) == 2 && ctype_xdigit( $arr[ 0 ] ) && ctype_xdigit( $arr[ 1 ] ) ) { return [ $arr[ 0 ], $arr[ 1 ] ]; } else { return null; }
    }

    /* get name */
    public function getName(): ?string
    {
        /* if identity is available but name hasn't been set yet */
        if ( ( $id = $this->identity->id ) && !isset( $this->_name ) )
        {
            /* get name from model */
            $result = $this->run( 'SELECT `string` FROM `vname` WHERE `identity_id` = ?', [ $id ] )->fetchColumn();
            if ( $result ) { $this->_name = $result; } else { $this->_name = ''; }
        }
        return $this->_name;
    }

    /* set name */
    public function setName( string $name ): void
    {
        if ( ( $id = $this->identity->id ) && $this->getName() != $name )
        {
            $this->_name = $name;
            $sql = $this->run( 'INSERT INTO `name` ( `identity_id`, `string` ) SELECT ?, ?', [ $id, $name ] );
        }
    }
}
