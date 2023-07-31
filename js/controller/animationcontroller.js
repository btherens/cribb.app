/* imports */
import Controller from './controller.js';
import AnimationView from '../view/animationview.js';

/*
 * create the structural dynamics necessary to animate the delivery of elements from A to B,
 * and provide services concerning the vulnerabilities of that expectation
 *
 * const a = new Animation( element );
 * (move element)
 * a.run()
 */
export default class AnimationController extends Controller
{
    constructor( el, o, model = null, view = new AnimationView )
    {
        super( model, view );

        /* default properties - pass override via options o */
        this.delay    = o?.delay ?? 0;
        this.duration = o?.duration ?? 150;
        this.dclass   = o?.dclass ?? 'animate';
        this.rclass   = o?.rclass ?? 'do';
        this.x        = o?.x ?? true;
        this.y        = o?.y ?? true;
        this.s        = o?.s ?? true;

        this._apply( el );
        this._createStart( o?.start ?? el );
    }

    /*
     * animate the delivery of an element from a to b
     * returns a promise resolving after transition completes
     */
    run(
        el = this._el,
        p  = this.pos,
        c  = this.rclass
    )
    {
        /* apply animation */
        this.view.setPosition( ...Object.values( { el: el, ...p } ) );
        /* delay */
        return this._delay( this.delay ).then( () =>
        {
            /* add animation class */
            el.classList.add( c );
            /* return object to end position */
            el.removeAttribute( 'style' );
            /* delay for the duration of the animation */
            return this._delay( this.duration );
        } ).then( () => { el.classList.remove( c ); el.classList.remove( this.dclass ) } );
    }

    /* prepare element for transitions */
    _apply( el )
    {
        this._el = el;
        /* add element to animatable classlist */
        el.classList.add( this.dclass );
        /* make sure animations wont run when setting start position */
        el.classList.remove( this.rclass );
    }

    /* define the start of an animation */
    _createStart( el, pos = this.view.getPosition( el ) )
    {
        /* cache start if we found something */
        if ( pos.rad > 0 )
        {
            /* disable dimensions */
            if ( !this.x ) { delete pos.left }
            if ( !this.y ) { delete pos.top }
            if ( !this.s ) { delete pos.rad }
            this.pos = pos;
        }
    }

}