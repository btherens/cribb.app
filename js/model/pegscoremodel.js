/* imports */
import Model from './model.js';

export default class PegscoreModel extends Model
{
    constructor()
    {
        super();

        /* establish values */
        this.clear();
    }

    clear = () =>
    {
        this._score          = null;
        this._lastScore      = null;
        this._points         = null;
        this._lastPoints     = null;
        this._isChange       = false;
    }

    /* peg color */
    get color() { return this._color }
    set color( b )
    {
        this._color = !!b;
    }

    /* score */
    get score() { return this._score }
    set score( i )
    {
        /* only trigger updates if value changes */
        if ( i !== this._score )
        {
            /* save previous values to last properties */
            this._lastScore  = this._score;
            this._lastPoints = this._points;
            this._isChange   = true;
            /* set new score */
            this._score = i;
        }
    }

    /* points */
    get points() { return this._points }
    set points( i )
    {
        if ( i !== this._points )
        {
            this._lastPoints = this._points;
            /* ensure lastscore matches current score if we're staging points */
            if ( i < 0 ) { this._lastScore = this._score }
            this._isChange   = true;
        }
        this._points = i
    }

    /* last* properties */
    get lastScore() { return this._lastScore }
    set lastScore( i )
    {
        this._lastScore = i
    }
    get lastPoints() { return this._lastPoints }
    set lastPoints( i )
    {
        this._lastPoints = i
    }

    /* track change state - resets to false after being read */
    get isChange() { if ( this._isChange ) { this._isChange = false; return true; } else { return false } }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }

}
