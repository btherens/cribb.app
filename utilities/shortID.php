<?php

/*
 * lossless conversion from base 10 numeric value to base 62 alphanumeric string and back again
 * shortID::toShort( 24 ); // dnh
 * shortID::toNumeric( 'dnh' ); // 24
 */
class shortID
{
    /* secret key for scrambling dictionary */
    private static string $_key;
    public static function setKey( string $key ): void { self::$_key = $key; }

    /* minimum number of characters in string */
    private static int $_pad;
    public static function setPadding( int $n = 0 ): void { self::$_pad = $n; }

    /* convert integer to alphanumeric shortid */
    public static function toShort( int $input ): string { return self::_convertToAlphanumeric( (int) $input,  self::_generateDictionary() ); }

    /* convert shortid back to integer */
    public static function toNumeric( string $input ): int { return self::_convertToNumber( $input, self::_generateDictionary() ); }

    /* return ordered alphanumeric characters */
    private static string $_dictionary;
    private static function _generateDictionary(): string
    {
        /* create new secure dictionary */
        if ( !isset( self::$_dictionary ) ) { self::$_dictionary = self::_secure( implode( range( 'a', 'z' ) ) . implode( range( 0, 9 ) ) . implode( range( 'A', 'Z' ) ) ); }
        return self::$_dictionary;
    }

    /* scramble a character dictionary and return result */
    private static function _secure( string $dictionary ): string
    {
        /* only perform sort if key has been defined */
        if ( $key = isset( self::$_key ) ? self::$_key : false )
        {
            /* dictionary length */
            $dlen                 = (int) strlen( $dictionary );
            /* create array of characters */
            $dictionaryArray      = str_split( $dictionary );
            /* re-sort the character dictionary based on cryptographic hash of input key */
            array_multisort( str_split( substr( strlen( hash( 'sha256', $key ) ) < $dlen ? hash( 'sha512', $key ) : hash( 'sha256', $key ), 0, $dlen ) ), SORT_DESC, $dictionaryArray );
            /* convert dictionary back to string */
            $dictionary = implode( $dictionaryArray );
        }
        return $dictionary;
    }

    /* convert input alphanumeric string to number using dictionary */
    private static function _convertToNumber( string $input, string $dictionary ): int
    {
        /* start with 0 output */
        $output  = 0;
        /* dictionary length */
        $dlen    = (int) strlen( $dictionary );
        /* use padding value if set */
        $pad     = isset( self::$_pad ) ? self::$_pad : 0;
        /* input string length */
        $ilen    = strlen( $input ) - 1;
        /* step through input characters */
        for ( $t = $ilen; $t >= 0; --$t )
        {
            $bcp    = bcpow( $dlen, $ilen - $t );
            $output = $output + strpos( $dictionary, substr( $input, $t, 1 ) ) * $bcp;
        }
        if ( --$pad > 0 ) { $output -= pow( $dlen, $pad ); }
        return $output;
    }

    /* convert input numeric value into string using dictionary */
    private static function _convertToAlphanumeric( int $input, string $dictionary ): string
    {
        /* start with empty output */
        $output = '';
        /* dictionary length */
        $dlen   = (int) strlen( $dictionary );
        /* use padding value if set */
        $pad    = isset( self::$_pad ) ? self::$_pad : 0;
        /* pad values */
        if  ( --$pad > 0 ) { $input += pow( $dlen, $pad ); }
        /* step through digits */
        for ( $t = ( 0 != $input ? floor( log( $input, $dlen ) ) : 0 ); $t >= 0; --$t )
        {
            $bcp     = bcpow( $dlen, $t );
            $a       = floor( $input / $bcp ) % $dlen;
            $output .= substr( $dictionary, $a, 1 );
            $input  -= $a * $bcp;
        }
        /* return result */
        return $output;
    }

}
