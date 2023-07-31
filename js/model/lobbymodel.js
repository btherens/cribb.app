/* imports */
import Model from './model.js';

export default class LobbyModel extends Model
{
    constructor()
    {
        super();

        this._avatar = null;
        this._name = null;
        this._type = 'guest';
        this._gid = '';

        this._liveColor  = false;
        this._liveRank   = false;
        this._storeColor = false;
        this._storeRank  = false;
        this._stat       = null;
    }

    /* host properties */
    get avatar() { return this._avatar }
    set avatar( a )
    {
        this._avatar = a ?? null;
    }

    get name() { return this._name }
    set name( n )
    {
        this._name = n ?? null;
    }

    /* game properties */
    get type() { return this._type }
    set type( t )
    {
        this._type = t;
    }

    get gid() { return this._gid }
    set gid( gid )
    {
        this._gid = gid;
    }

    get storeColor() { return this._storeColor }
    set storeColor( i )
    {
        this._storeColor = i;
        this._liveColor = this._storeColor;
    }

    get storeRank() { return this._storeRank }
    set storeRank( i )
    {
        this._storeRank = i;
        this._liveRank  = this._storeRank;
    }

    get liveColor() { return this._liveColor }
    set liveColor( i )
    {
        this._liveColor = i;
        //this.onModelChanged();
    }

    get liveRank() { return this._liveRank }
    set liveRank( i )
    {
        this._liveRank = i;
        //this.onModelChanged();
    }

    get stat() { return this._stat }
    set stat( o )
    {
        this._stat = o ?? null;
    }

    /* return this invite's url */
    get url() { return window.location.origin + '/i/' + this.gid }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }

}
