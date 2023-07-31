<?php

class MsgController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'Msg';
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* track this thread's id */
    private string $_thread;
    /* track start of thread */
    private float $_start;
    /* thread lifespan */
    private int $_timeout = 60;

    /* initiate a msg thread */
    private function _startThread(): void
    {
        /* set tracked properties */
        $this->_thread = uniqid();
        $this->_start  = microtime( true );
        /* set thread to session */
        $_SESSION[ '_msgthread' ] = $this->_thread;
        /* release session lock */
        session_write_close();
        ignore_user_abort( true );
    }

    /* confirm thread is still available  */
    private function _isThread(): bool
    {
        /* detect closed connections */
        if     ( connection_aborted() ) { exit(); }
        /* return thread status */
        return ( ( microtime( true ) - $this->_start < $this->_timeout ) && $_SESSION[ '_msgthread' ] === $this->_thread );
    }

    /* send message to client */
    private function _sendMsg( string $s ): void { echo 'data: ' . $s . chr( 10 ) . chr( 10 ); ob_flush(); flush(); }

    /* open a connection to msg controller from client */
    public function index(): void
    {
        /* set headers */
        header( 'Content-Type: text/event-stream' );
        header( 'Cache-Control: no-cache' );
        /* look up authenticated user id */
        if ( $id = auth::id() )
        {
            /* initiate timestamp variable */
            $timestamp = 0;
            /* open msg thread */
            $this->_startThread();
            /* keep alive for 60 seconds */
            while ( $this->_isThread() )
            {
                /* get last activity date from model */
                $new = $this->_model->getTimestamp( $id );
                /* send message if timestamp is new */
                if ( $timestamp != $new ) { $timestamp = $new; $this->_sendMsg( $timestamp ); }
                /* limit loop speed */
                sleep( 4 );
            }
        }
        /* reject connection */
        else { $this->_sendMsg( '0' ); }
    }

}
