<?php

class db
{
    /* static mysqli object */
    private static $db;
    /* the calculated time zone offset to use as a session configuration when opening database connections */
    private static $TZoffset;

    /* return the live database connection in use for this session, or create one if we have not yet  */
    public static function init(): pdo
    {
        /* only create new connection if we don't have one yet */
        if ( !self::$db )
        {
            $charset = 'utf8mb4';
            $dsn     = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . $charset;
            $options = [
                /* throw critical exceptions */
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                /* return rows of data as object->property */
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                /* create pdo object and set to property */
                self::$db = new PDO( $dsn, DB_USER, DB_PASS, $options );
                /* set session time-zone */
                self::$db->query( "SET time_zone = '" . self::_getTZoffset() . "';" );
            }
            /* throw the pdo exception */
            catch ( PDOException $e ) { throw new PDOException( $e->getMessage(), (int)$e->getCode() ); }
        }
        /* return pdo object */
        return self::$db;
    }

    /* determine server's timezone in hours offset from UTC and return */
    private static function _getTZoffset(): string
    {
        /* calculate offset if it has not already been determined */
        if ( !self::$TZoffset )
        {
            /* use getOffset() method from DateTime to determine PHP session's time offset from UTC */
            $mins = ( new DateTime() )->getOffset() / 60;
            /* convert offset to formatted time zone offset syntax ( e.g. '-5:00' ) */
            self::$TZoffset = sprintf( '%+d:%02d', floor( $mins / 60 ), abs( $mins ) - ( floor( abs( $mins ) ) ) );
        }
        /* return result */
        return self::$TZoffset;
    }
}
