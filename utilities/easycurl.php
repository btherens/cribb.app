<?php

/* curl requests interface */
class easycurl {
    /* batch size is the max number of simultaneous requests */
    private   $batchsize = 5;
    /* the timeout used for curl_multi_select */
    private   $timeout   = 10;
    /* request headers */
    private   $headers   = [];
    /* The request queue */
    private   $requests  = [];
    /* base options that you want to be used with EVERY request */
    protected $options   = [
        CURLOPT_SSL_VERIFYPEER => 0,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_TIMEOUT        => 30
    ];
    /* callback function to be applied to each result */
    private closure $callback;

    /* create request object and accept callback function to be applied to each result */
    function __construct( ?closure $callback = null ) { if ( $callback ) { $this->callback = $callback; } }

    /* create new request and add to the request queue */
    public function request( string $url, string $method = 'GET', $data = null, ?array $headers = null, ?array $options = null, ?closure $callback = null ): void
    {
        $this->requests[] = (object) [ 'url' => $url, 'method' => $method, 'data' => $data, 'headers' => $headers, 'options' => $options, 'callback' => $callback ];
    }

    /* execute the curl */
    public function execute( int $batchsize = null ): mixed
    {
        /* no requests are pending */
        if   ( 0 == count( $this->requests ) ) { return null; }
        /* run a single curl request */
        if   ( 1 == count( $this->requests ) ) { return $this->_singleCurl( array_shift( $this->requests ) ); }
        /* run multiple curl requests */
        else { return $this->_rollingCurl( $batchsize ); }
    }

    private function _createCurl( stdclass $request ): CurlHandle
    {
        /* create curl handle */
        $ch = curl_init();
        /* bind request options */
        curl_setopt_array( $ch, $this->_createOptions( $request ) );
        return $ch;
    }

    /* create curl handle and add to included multihandle */
    private function _mapCurlRequest( CurlMultiHandle &$cmh, &$requests, int $i ): void
    {
        $ch = $this->_createCurl( $requests[ $i ] );
        /* map index record to curlhandle for lookup later */
        curl_setopt( $ch, CURLOPT_PRIVATE, $i );
        /* and this new handle to multihandle */
        curl_multi_add_handle( $cmh, $ch );
    }

    /* process a completed result from curl handle and return true / false upon success */
    private function _processCurl( CurlMultiHandle &$cmh, &$requests ): bool
    {
        $result = curl_multi_info_read( $cmh );
        if ( $result )
        {
            // get the info and content returned on the request
            $ch      = $result[ 'handle' ];
            /* get request from array */
            $request = $requests[ curl_getinfo( $ch, CURLINFO_PRIVATE ) ];
            $result  = [ curl_multi_getcontent( $ch ), curl_getinfo( $ch ), $request ];
            /* process result with attached callback */
            if ( isset( $this->callback ) ) { ( $this->callback )( ...$result ); }
            /* remove the curl handle that just completed */
            curl_multi_remove_handle( $cmh, $ch );
        }
        return (bool)$result;
    }

    /* perform a single curl request */
    private function _singleCurl( stdclass $request ): mixed
    {
        /* create curl request */
        $ch     = $this->_createCurl( $request );
        /* execute curl request */
        $result = [ curl_exec( $ch ), curl_getinfo( $ch ), $request ];
        /* process result with attached callback and return true */
        if   ( isset( $this->callback ) ) { ( $this->callback )( ...$result ); return true; }
        /* return output directly to function */
        else { return $result[ 0 ]; }
    }

    /* execute multiple curl requests */
    private function _rollingCurl( int $batchsize = null ): bool
    {
        /* use default window size if none / 0 was passed */
        if ( !$batchsize ) { $batchsize = $this->batchsize; }
        /* make sure the rolling window isn't greater than the # of urls */
        if ( count( $this->requests ) < $batchsize ) { $batchsize = count( $this->requests ); }
        /* generate CurlMultiHandle */
        $master = curl_multi_init();
        /* initiate first block of requests */
        for ( $i = 0; $i < $batchsize; $i++ ) { $this->_mapCurlRequest( $master, $this->requests, $i ); }
        /* do block will run as long as curl_multi_exec returns running=true */
        do
        {
            /* keep loop open while curl has data to return */
            while ( ( $execrun = curl_multi_exec( $master, $running ) ) == CURLM_CALL_MULTI_PERFORM )
            /* exit loop if something went wrong */
            if    ( $execrun != CURLM_OK ) { break; }
            /* process a request */
            while ( $this->_processCurl( $master, $this->requests ) )
            {
                /* start a new request */
                if ( $i < count( $this->requests ) && isset( $this->requests[ $i ] ) )
                {
                    $this->_mapCurlRequest( $master, $this->requests, $i );
                    $i++;
                }
            }
            /* wait for activity */
            if ( $running ) { curl_multi_select( $master, $this->timeout ); }
        } while ( $running );
        curl_multi_close( $master );
        return true;
    }

    /* set options for a request */
    private function _createOptions( $request ): array
    {
        /* use class properties for all requests */
        $options = $this->options;
        $headers = $this->headers;
        /* overrides for this specific request */
        if ( $request->options ) { $options = array_replace( $options, $request->options ); }
        if ( $request->headers ) { $headers = array_replace( $headers, $request->headers ); }
        /* set request URL */
        $options[ CURLOPT_URL ]            = $request->url;
        /* attach data payload */
        if ( $request->data )
        {
            $options[ CURLOPT_POST ]       = 1;
            $options[ CURLOPT_POSTFIELDS ] = $request->data;
        }
        /* attach headers */
        if ( $headers )
        {
            $options[ CURLOPT_HEADER ]     = 0;
            $options[ CURLOPT_HTTPHEADER ] = array_map(
                fn( $k, $v ) => $k.': '.$v,
                array_keys( $headers ),
                array_values( $headers )
            );
        }
        return $options;
    }
}