/* imports */
import Controller from './controller.js';
import PegscoreModel from '../model/pegscoremodel.js';
import PegscoreView from '../view/pegscoreview.js';

import AnimationController from '../controller/animationcontroller.js';

export default class PegscoreController extends Controller
{
    constructor( row, model = new PegscoreModel(), view = new PegscoreView( row ) )
    {
        super( model, view );

        this.model.bindOnModelChanged( this.onModelChanged );
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        score          = this.model.score,
        points         = this.model.points,
        lastScore      = this.model.lastScore,
        lastPoints     = this.model.lastPoints,
        color          = this.model.color,
        isChange       = this.model.isChange
    ) => {
        /* do not make any changes if model has not changed */
        if ( !isChange ) { return }
        /* clear currently rendered pegs */
        this.view.clearScore( color );
        /* exit now if score is null (no pegs) */
        if ( score == null ) { return }
        /* score has changed from a previous score */
        if ( ( lastScore != null && lastScore != score ) || ( points < 0 && lastPoints != points ) )
        {
            /* temporarily set pegs in last position */
            const lastpegs = this._setPegsToValues( lastScore ?? score, lastPoints );
            /* animate the peg change */
            this._animatePegToValue(
                /* animate the point peg if it exists, or create a new peg */
                lastpegs[ 1 ] ?? this.view.createPeg( color ),
                /* move peg to new score, or to the new score - points value if points are negative (we're staging to peg) */
                score - Math.min( points, 0 ),
                /* start from the point peg if it existed, or start from the score peg if not */
                lastpegs[ 1 ] ?? lastpegs[ 0 ]
            )
            /* set final peg values */
            .then( () => this.view.clearScore( color ) || this._setPegsToValues( score, points ) );
        }
        else
        {
            this._setPegsToValues( score, points )
        }
    }

    /* set a score to model */
    setScore = ( score, points ) =>
    {
        /* don't run if not defined yet */
        if ( this.model.color == null ) { return }
        if ( score  != null ) { this.model.score  = score  }
        if ( points != null ) { this.model.points = points }
        this.onModelChanged();
    }

    /* set a color to model */
    setColor = ( color ) => this.model.color = color;

    /* clear the model and view */
    clear = ( color = this.model.color ) =>
    {
        this.model.clear();
        this.view.clearScore( color );
    }

    /* set 1-2 pegs to view and return references to visible pegs */
    _setPegsToValues = ( score, points, color = this.model.color ) => [
        /* set score */
        this.view.setPegToValue( this.view.createPeg( color ), score ),
        /* set last peg */
        points ? this.view.setPegToValue( this.view.createPeg( color ), score - points ) : null
    ]

    /* animate the movement of a peg to final position (promise) */
    _animatePegToValue = ( el, score, start = null ) =>
    {
        return this._delay( 20 )
        .then( () =>
        {
            const a = new AnimationController( el, { duration: 600, start: start /*, s: false */ } );
            return this._delay( 400 ).then( () => a );
        } )
        .then( a =>
        {
            /* search for a peg that appears visually for animation */
            this.view.returnPegholes( score ).filter( el => this.view.getPosition( el ).rad )[ 0 ].appendChild( el );
            /* detect a difference in radius between start and final location */
            const shift = a.pos.rad - this.view.getPosition( el ).rad;
            if ( shift != 0 )
            {
                /* offset positions with difference in radius */
                a.pos.left = a.pos.left + shift;
                a.pos.top  = a.pos.top  + shift;
            }
            delete a.pos.rad;
            /* run animation */
            return a.run().then( () => this._delay( 300 ) );
        } )

    }

    get score()  { return this.model.score  }
    get points() { return this.model.points }

}
