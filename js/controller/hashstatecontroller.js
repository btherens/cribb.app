/* imports */
import Controller from './controller.js';

/* pseudo-persistence read/write interface - store page state in client url fragment */
export default class HashStateController extends Controller
{
    constructor( key, model = null, view = null )
    {
        super( model, view );

        this.key = key;
        this.bindOnStateChanged();
    }

    /* convert string to binary data */
    static toBinary( string )
    {
        /* define binary object here */
        const codeUnits = new Uint16Array( string.length );
        /* step through string length */
        for ( let i in string ) { codeUnits[ i ] = string.charCodeAt( i ) }
        /* return a Base64-encoded ASCII string using binary string from Uint16 array */
        return btoa( String.fromCharCode( ...new Uint8Array( codeUnits.buffer ) ) );
    }

    /* get string from binary */
    static fromBinary( data )
    {
        /* decode to ascii */
        const decode = atob( data );
        /* calculate length of string in utf-8 */
        const bytes = new Uint8Array( decode.length );
        /* step through decoded data and determine the final utf-8 character codes */
        for ( let i in decode ) { bytes[ i ] = decode.charCodeAt( i ) }
        /* cast to string */
        return String.fromCharCode( ...new Uint16Array( bytes.buffer ) )
    }

    /* store state data to help persistence across reloads */
    static _stateBuffer = {}

    /* load state object from url fragment into buffer */
    _refreshBuffer = () => { try { HashStateController._stateBuffer = JSON.parse( HashStateController.fromBinary( window.location.hash.substring( 1 ) ) ) } catch( err ) { this.onStateChanged( null ) } }

    /* get state object for this object's key */
    get state()
    {
        /* refresh if a hash is detected but object is empty */
        if ( !Object.keys( HashStateController._stateBuffer ).length && window.location.hash ) { this._refreshBuffer() }
        /* return key object from buffer */
        return HashStateController._stateBuffer[ this.key ];
    }
    set state( obj )
    {
        if ( obj ) { HashStateController._stateBuffer[ this.key ] = obj } else { delete HashStateController._stateBuffer[ this.key ] }
        this.onStateChanged( );
    }

    /* clear hash entirely */
    clearAll()
    {
        /* clear buffer */
        HashStateController._stateBuffer = {};
        /* call update event */
        this.onStateChanged( );
    }

    /* bind state change function through debounce to limit writes to hash state */
    bindOnStateChanged( ) { this.onStateChanged = this._debounce( ( buffer = HashStateController._stateBuffer ) => history.replaceState( '', document.title, !buffer || Object.keys( buffer ).length === 0 ? window.location.pathname : '#' + HashStateController.toBinary( JSON.stringify( buffer ) ) ), 500 ) }
}