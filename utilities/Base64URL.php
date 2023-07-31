<?php

/* simple encode / decode */
class Base64URL
{
    /* encode string in trimmed base64url */
    public static function encode( string $string ): string { return rtrim( strtr( base64_encode( $string ), '+/', '-_' ), '=' ); }
    /* decode a base64url-encoded string */
    public static function decode( string $b64url ): string { return base64_decode( strtr( $b64url, '-_', '+/' ), true ); }
}