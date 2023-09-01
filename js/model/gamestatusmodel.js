/* imports */
import Model from './model.js';

export default class GamestatusModel extends Model
{
    constructor()
    {
        super();

        this.clear();
    }

    /* initiate/reset model properties */
    clear()
    {
        this._gid    = '';
        this._avatar = null;
        this._name   = null;
        this._stage  = null;
        this._score  = null;
        this._stat   = null;
        this._color  = false;
        this._rank   = false;
        this._next   = false;
    }

    get gid() { return this._gid }
    set gid( gid )
    {
        this._gid = gid;
    }

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

    get stage() { return this._stage }
    set stage( s )
    {
        this._stage = s ?? null;
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
