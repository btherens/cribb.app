<?php

class Model
{
    /* connection to the database */
    private pdo $_db;

    /* constructor - initiate db static class */
    public function __construct() { $this->_db = db::init(); }
    /* passthrough pdo methods ( use $this->pdomethod ) */
    public function __call( $method, $args ) { return call_user_func_array( [ $this->_db, $method ], $args ); }

    /* simple interface to run prepared statements with or without parameters
     * e.g. $data = $this->run( 'SELECT * FROM users WHERE id = ?', [ $id ] )->fetch();
     */
    protected function run( $sql, $args = [] ): PDOStatement
    {
        /* execute pdo statment with or without arguments */
        if   ( $args ) { $stmt = $this->prepare( $sql ); $stmt->execute( $args ); } else { $stmt = $this->query( $sql ); }
        /* return statement from db object */
        return $stmt;
    }

    /* validate and map an ordered array of values to an object */
    public function mapArrToObject( array $a, array $m, array $o = [], int $i = 0 ): array
    {
        /* step through map keys and assign values to output object if the range is valid */
        foreach ( $m as $k => $v )
        {
            /* test value against min/max (if provided) */
            if (
                ( is_null( $v[ 0 ] ) || $v[ 0 ] <= $a[ $i ] ) &&
                ( is_null( $v[ 1 ] ) || $a[ $i ] <= $v[ 1 ] )
            )
            {
                $o[ $k ] = (int) $a[ $i ];
            }
            else
            {
                throw new Exception( "failed to map key $k" );
            }
            $i++;
        }
        /* return array */
        return $o;
    }

    /* return the index of an associative array */
    public function array_index( array $a, int $i ): mixed { return $a[ array_keys( $a )[ $i ] ]; }

}
