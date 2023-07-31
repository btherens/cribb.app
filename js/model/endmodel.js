/* imports */
import Model from './model.js';

export default class EndModel extends Model
{
    constructor()
    {
        super();

        this._avatar = null;
        this._name = null;
        this._gid = '';

        this._color = false;
        this._rank  = false;
    }

    /* host properties */
    get avatar() { return this._avatar }
    set avatar( a )
    {
        this._avatar = a;
    }

    get name() { return this._name }
    set name( n )
    {
        this._name = n;
    }

    get gid() { return this._gid }
    set gid( gid )
    {
        this._gid = gid;
    }

    get score() { return this._score }
    set score( o )
    {
        this._score = o ?? null;
    }

    get color() { return this._color }
    set color( i )
    {
        this._color = i;
    }

    get rank() { return this._rank }
    set rank( i )
    {
        this._rank = i;
    }

    get next() { return this._next }
    set next( b )
    {
        this._next = !!b;
    }

    get stat() { return this._stat }
    set stat( o )
    {
        this._stat = o ?? null;
    }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }

}
