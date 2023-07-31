<?php

/* The Auth class to serve as authentication throughout the system */
class auth
{
    /* track class state */
    private static $_set = false;

    /* an authenticated identity id (or NULL if in an unauthorized state) */
    private static $_id = null;

    /* an active identity's device id */
    private static $_deviceid = null;

    /* TRUE if an identity is authenticated, FALSE otherwise */
    private static $_authenticated = false;

    /* attempts to load session info from db */
    private static function _init()
    {
        /* only initialize once */
        if ( !self::$_set )
        {
            /* get logged in info from identitymodel if available */
            $identity = new IdentityModel( );
            if ( $identity->challengeSession( session_id() ) ?: $identity->challengeDevice( $_COOKIE[ 'devicetoken' ] ?? '' ) )
            {
                self::$_id            = $identity->identity->id;
                self::$_deviceid      = $identity->device->id;
                self::$_authenticated = (bool) $identity->identity->enabled ?? false;
            }
            self::$_set = true;
        }
    }

    /* return logged in user id */
    public static function id(): ?int
    {
        self::_init();
        return self::$_id;
    }

    public static function deviceid(): ?int
    {
        self::_init();
        return self::$_deviceid;
    }

    /* return is authenticated true / false */
    public static function auth(): bool
    {
        self::_init();
        return self::$_authenticated;
    }

    /* reset authentication to allow class to refresh */
    public static function unset()
    {
        self::$_authenticated = false;
        self::$_set = false;
    }

}
