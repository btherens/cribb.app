/* imports */
import View from './view.js';

export default class PegscoreView extends View
{
    constructor( row )
    {
        super();

        /* define properties */
        this._row   = row;
        this._class = 'peg';
        this._c1    = 'blue';
        this._c2    = 'red';
    }

    /* display a peg for a given value */
    setPegToValue = ( peg, score ) =>
    {
        /* collect all pegholes for a given score (some are hidden for screen aspect ratio requirements) */
        //const els = this.returnPegholes( score );
        let output;
        /* loop through all pegholes */
        //for ( let el of els )
        for ( let el of this.returnPegholes( score ) )
        {
            /* use original or clone if already set */
            let newpeg = peg.parentNode ? peg.cloneNode() : peg;
            /* place peg in peghole */
            el.appendChild( newpeg );
            /* return a visible peg */
            if ( !output && this.getPosition( newpeg ).rad ) { output = newpeg }
        }
        return output;
    }

    /* create a new peg */
    createPeg = ( color ) => this.create( 'div', { class: this._class + ' ' + ( color ? this._c1 : this._c2 ) } );

    /* quickly clear the score board */
    clearScore = ( color ) => { for ( let el of this._list( color ) ) { el.remove() } }

    /* return any pegs from board in this row */
    _list( color ) { return document.querySelectorAll( '.' + this._class + '.' + ( color ? this._c1 : this._c2 ) ) }

    returnPegholes = ( score, row = this._row ) => [ ...document.querySelectorAll( ( '.peghole.r' + row + '.s' + ( '000' + Math.max( 0, Math.min( 121, parseInt( score ) ) ) ).substr( -3 ) ) ) ];

}
