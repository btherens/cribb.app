import HashStateController from '../controller/hashstatecontroller.js';

export default class Model
{
    constructor( )
    {
        /* set empty _store property */
        this._store = null;
    }

    /* localstorage getter / setter */
    static _lsGetItem = ( key ) => JSON.parse( window.localStorage.getItem( key ) );
    static _lsSetItem = ( key, obj ) => window.localStorage.setItem( key, JSON.stringify( obj ) )

    /* localstorage getter / setter */
    get store()
    {
        /* import from localstorage if necessary */
        if ( this._store == null ) { this._store = JSON.parse( window.localStorage.getItem( this._scope ) ) }
        if ( this._store == null ) { this._store = Model._lsGetItem( this._scope ) }
        /* return storage */
        return this._store;
    }
    /* set/merge object to store with 250ms delay */
    set store( obj ) { setTimeout( () => this.fstore = obj, 250 ) }

    /* set object to store with no delay */
    set fstore( obj )
    {
        Model._lsSetItem( this._scope, { ...this.store, ...obj } );
        this._store = null;
    }

    /* generate a random integer between a range */
    randomInt = ( min, max ) => Math.floor( Math.random() * ( max - min ) ) + min;

    /* set a hashstate connection to this model */
    setHashState( key ) { if ( key ) { this.hash = new HashStateController( key ) } }
    /* set scope used for localstorage */
    setStoreScope( key ) { if ( key ) { this._scope = key; this._store = null; } }

    /* accepts two arrays and returns a single object with keys from array1 and values from array2 */
    createKeyValueObject( keys, values, obj = {} ) { keys?.map( ( val, idx ) => obj[ val ] = ( values ?? {} )[ idx ] ); return obj; }
    /* strip keys from object and return simple array of object values */
    createValueArray( obj ) { return Object.keys( obj ).map( ( key ) => { return obj[ key ] } ) }

    /* deep object comparison */
    static isObjEqual( a, b )
    {
        /* strict equality */
        if ( a === b ) { return true }
        /* different types */
        if ( typeof a != 'object' || typeof b != 'object' || a == null || b == null ) { return false }
        /* get object keys */
        const keysA = Object.keys( a ), keysB = Object.keys( b );
        /* object length mismatch */
        if ( keysA.length != keysB.length ) { return false }
        /* for each key in a */
        for ( let key of keysA )
        {
            /* key does not exist in other object */
            if   ( !keysB.includes( key ) ) { return false }
            /* if one or both are functions - determine difference in string casting result */
            if   ( typeof a[ key ] === 'function' || typeof b[ key ] === 'function' ) { if ( a[ key ].toString() != b[ key ].toString() ) { return false } }
            /* call nested function */
            else { if ( !Model.isObjEqual( a[ key ], b[ key ] ) ) { return false } }
        }
        /* if we made it this far, they are equal */
        return true;
    }

    /* detect array equality - pass order = by default order is insensitive */
    static isArrEqual( a, b, order = false ) { return a?.length === b?.length && a.every( ( v, i ) => order ? v === b[ i ] : b.includes( v ) ) }
    /* test array subsets - true if a is a subset of b */
    static isArrSubset( a, b ) { return !!a?.every( v => b.includes( v ) ) }

    /* interleave two arrays */
    static interleave = ( [ x, ...xs ], ...rest ) => x === undefined ? rest.length === 0 ? [] : Model.interleave( ...rest ) : [ x, ...Model.interleave( ...rest, xs ) ];
    /* interleave an array with a static object x (not array) */
    static sinterleave = ( arr, x ) => arr.flatMap( e => [ e, typeof x.cloneNode == 'function' ? x.cloneNode() : x ] ).slice( 0, -1 );
    /* filter non-unique values out of an array and return */
    static unique = ( arr ) => arr.filter( ( v, i, a ) => a.indexOf( v ) === i );

    /* link static methods */
    isObjEqual  = Model.isObjEqual;
    isArrEqual  = Model.isArrEqual;
    isArrSubset = Model.isArrSubset;
    interleave  = Model.interleave;
    sinterleave = Model.sinterleave;
    unique      = Model.unique;

}