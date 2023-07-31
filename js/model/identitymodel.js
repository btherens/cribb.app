/* imports */
import Model from './model.js';

export default class IdentityModel extends Model
{
    constructor( hash = 'id' )
    {
        /* set localstorage scope */
        super( );

        /* set keys for hash urls and local storage */
        this.setHashState( hash );
        this.setStoreScope( hash );

        /* set properties */
        this._liveName  = null;

        /* load localstorage into memory */
        this._storeName = this.store?.name ?? null;
        this._stat      = this.store?.stat ?? null;
    }

    /* name property passthrough to local storage */
    get storeName() { return this._storeName }
    set storeName( s )
    {
        this._storeName = s;
        this.store = { name: this._storeName };
        this.onModelChanged();
    }

    get hashName() { return this.hash.state }
    set hashName( s )
    {
        this.hash.state = s
    }

    get liveName() { return this._liveName }
    set liveName( s )
    {
        /* resolve redundancies */
        if ( this.storeName == s ) { s = null }
        /* update property */
        this._liveName = s;
        /* save live changes to hash */
        this.hashName = s?.trim() ?? null;
        this.onModelChanged();
    }

    get stat() { return this._stat }
    set stat( o )
    {
        this._stat = o ?? null;
        this.store = { stat: this._stat };
    }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }
}
