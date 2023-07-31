<?php

/* iterate over all possible combinations of collection for given size
 * foreach( new combination( 'abc', 2 ) as $substring ) { echo( $substring ); }
 * 'ab'
 * foreach( new combination( [ 'one', 'two', 'three' ], 2 ) as $array ) { echo( $array ); }
 * [ 'one', 'two' ]
 */
class combination implements Iterator
{
    /* input value / array of values */
    protected        $s   = null;
    /* numbered index for input array */
    protected ?array $c   = null;
    /* input length */
    protected int    $n   = 0;
    /* the length of combinations to consider */
    protected int    $k   = 0;
    /* current position in iterator */
    protected int    $pos = 0;
 
    public function __construct( $s, $k )
    {
        /* input is array */
        if   ( is_array( $s ) ) { $this->s = array_values( $s ); $this->n = count( $this->s ); }
        /* input is string */
        else { $this->s = (string) $s; $this->n = strlen( $this->s ); }
        /* set combinations length (minimum length is length of input) */
        $this->k = $this->n >= $k ? $k : 0;
        /* start iterator at beginning */
        $this->rewind();
    }

    /* iterator position/array key */
    public function key(): int { return $this->pos; }

    /* return a combination */
    public function current(): mixed
    {
        /* if combination length is 0 then return null */
        if ( !$this->k ) return null;
        /* step through combination length and set member of input via index */
        $r = [];
        for ( $i = 0; $i < $this->k; $i++ ) { $r[] = $this->s[ $this->c[ $i ] ]; };
        /* return a result that matches input */
        return is_array( $this->s ) ? $r : implode( '', $r );
    }

    /* move to next iteration */
    public function next(): void { if ( $this->_next() ) $this->pos++; else $this->pos = -1; }

    /* reset iterator to 0 */
    public function rewind(): void
    {
        $this->c   = range( 0, $this->k );
        /* set an invalid position if the length of combinations is 0 */
        $this->pos = $this->k ? 0 : -1;
    }

    /* confirm our position in iterator will return data */
    public function valid(): bool { return $this->pos >= 0; }

    /* advance to next in collection */
    protected function _next(): bool
    {
        /* begin with last index */
        $i = $this->k - 1;
        /* step backwards through length until we reach our current place in numbered index */
        while ( $i >= 0 && $this->c[ $i ] == $this->n - $this->k + $i ) $i--;
        /* return false if our index is out */
        if    ( $i < 0 ) return false;
        /* advance input array index */
        $this->c[ $i ]++;
        /* advance numbered index while i is less than the combination length */
        while ( $i++ < $this->k - 1 ) $this->c[ $i ] = $this->c[ $i - 1 ] + 1;
        return true;
    }

    /* return binomial coefficient - the count of combinations */
    public static function nCr( int $n, int $k ): int
    {
        /* 0 */
        if  ( ( $k > $n ) || ( $k < 0   ) ) return 0;
        /* single */
        if  ( ( $k == 0 ) || ( $k == $n ) ) return 1;
        /* multiple */
        $value = 1;
        for ( $i = 0; $i < $k; $i++ ) $value *= ( $n - $i ) / ( $k - $i );
        return $value;
    }

    /* return a combination object's bionomial coefficient */
    public function _nCr( int $n = null, int $k = null ): int
    {
        /* use object properties by default */
        if ( is_null( $n ) ) $n = $this->n;
        if ( is_null( $k ) ) $k = $this->k;
        return self::nCr( $n, $k );
    }

}