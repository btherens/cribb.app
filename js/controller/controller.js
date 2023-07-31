export default class Controller
{
    /* save model and view to controller properties */
    constructor( model, view )
    {
        this.model = model;
        this.view  = view;
    }

    /* update form changed/unchanged state */
    onFormChanged( form )
    {
        /* do nothing if form is null */
        if ( !form ) return;
        /* get array of form elements */
        const arrForm  = Array.from( form.elements );
        /* return inputs that contain changes */
        const isChange = arrForm.filter( el => el.tagName === 'INPUT' && !( el.svalue && el.svalue == el.value ) );
        /* disable submit buttons if no changed elements are found */
        arrForm.filter( el => el = el.classList.contains( 'submit' ) ).forEach( el => el.disabled = !isChange.length );
    }

    /* link static methods */
    _promise    = Controller._promise;
    _delay      = Controller._delay;
    _resolveSeq = Controller._resolveSeq;
    _debounce   = Controller._debounce;
    _throttle   = Controller._throttle;

    /* initiate a promise chain - default argument instantly resolves */
    static _promise = ( c = r => r() ) => new Promise( c );
    /* delay a promise chain with timeout */
    static _delay = ( t, v ) => { return new Promise( r => setTimeout( r.bind( null, v ), t ) ) }
    /* resolve an array of promises in sequential order */
    static _resolveSeq = ( tasks ) => tasks.reduce( ( p, x ) => p.then( x ), Promise.resolve() );
    /* wrap a function in a time-delayed limiter. only the most recent call will be executed after timeout completes */
    static _debounce = ( f, t = 500 ) =>
    {
        /* define timer outside function scope to persist between multiple function calls */
        let timer;
        /* return an anonymous function and execute callback with passthrough parameters */
        return ( ...a ) => { clearTimeout( timer ); timer = setTimeout( () => { f.apply( this, a ) }, t ); }
    }
    /* wrap a function in a time-delayed limiter. add callback function to also wait until condition returns true */
    static _throttle = ( f, t = 500, c ) =>
    {
        /* track wait status */
        let wait = false;
        /* the last function call's arguments */
        let q;
        /* function will run after a timeout is reached */
        const tf = () =>
        {
            /* set wait to false if no function call is in queue */
            if ( q == null ) { wait = false }
            /* otherwise run the function with waiting arguments and begin cooldown again */
            else
            {
                /* check callback for permission */
                if ( typeof c != 'function' || c() )
                {
                    /* run function with queued arguments */
                    f( ...q );
                    /* clear queue now that it has completed */
                    q = null;
                }
                /* begin cooldown again */
                setTimeout( tf, t );
            }
        }
        /* return the wrapped function */
        return ( ...a ) =>
        {
            /* queue the arguments if we're currently waiting for cooldown */
            if ( wait ) { q = a }
            /* otherwise begin a new loop */
            else
            {
                /* run function if callback returns true (can be run) otherwise queue as if we were in a wait already */
                if ( typeof c != 'function' || c() ) { f( ...a ) } else { q = a }
                /* set wait flag */
                wait = true;
                /* begin cooldown */
                setTimeout( tf, t );
            }
        }
    }

}
