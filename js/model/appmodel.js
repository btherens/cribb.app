/* imports */
import Model from './model.js';

export default class AppModel extends Model
{
    constructor()
    {
        super();

        this._startTime = performance.now();

        /* initiate app-scoped hash state interface */
        this.setHashState( 'a' );
        this.setStoreScope( 'a' );
        this.notifyList = [];

        /* load properties from localstorage */
        this._cookiewarning      = this.store?.cw  ?? false;
        this._installappreminder = this.store?.iar ?? false;
        this._appversion         = this.store?.av  ?? null;
        this._updatecounter      = this.store?.rc  ?? 0;

        /* properties that do not persist */
        this._isPnSubscribe      = false;
    }

    get cookiewarning() { return this._cookiewarning }
    set cookiewarning( b )
    {
        this._cookiewarning = !!b;
        this.store = { cw: this._cookiewarning };
    }

    get installappreminder() { return this._installappreminder }
    set installappreminder( b )
    {
        this._installappreminder = !!b;
        this.store = { iar: this._installappreminder };
    }

    /* track if push sub functions have been triggered yet */
    get isPnSubscribe() { return this._isPnSubscribe }
    set isPnSubscribe( b )
    {
        this._isPnSubscribe = !!b;
    }

    get appversion() { return this._appversion }
    set appversion( s )
    {
        /* trigger notification if app has been updated */
        if ( this._appversion && this._appversion != s ) { this.appendNotify( [ 'app update complete', `/about/changelog` ] ) }
        /* update in-memory and localstorege property */
        this._appversion = s;
        this.store = { av: this._appversion };
    }

    /* persistent count of attempted app updates */
    get updatecounter() { return this._updatecounter }
    set updatecounter( o )
    {
        this._updatecounter = o;
        this.fstore = { rc: this._updatecounter };
    }

    /* the timestamp of when app was last loaded */
    get startTime() { return this._startTime }
    /* the time app has been running */
    get runTime()   { return ( performance.now() - this._startTime ) }

    appendNotify = ( obj ) =>
    {
        this.notifyList.push( obj );
        this.onNotifyListChanged();
    }

    bindNotifyListChanged( callback ) { this.onNotifyListChanged = callback }
}
