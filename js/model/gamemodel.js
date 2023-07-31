/* imports */
import Model from './model.js';

export default class GameModel extends Model
{
    constructor( hash = 'g' )
    {
        super();

        /* set keys for hash urls and local storage */
        this.setHashState( hash );
        /* trim old game states on startup if conditions are met */
        this._trimOldState();

        /* clear current state */
        this.clear();
    }

    /* properties directly related to state that should be rest automatically if state is ever refreshed */
    clear = () =>
    {
        /* set blank properties */
        this._gid              = null;
        this._p1score          = [  ];
        this._p2score          = [  ];
        this._stage            = null;
        this._timestamp        = null;
        this._name             = null;
        this._color            = null;
        this._playerhand       = null;
        this._opphand          = null;
        this._drawresult       = null;
        this._playercrib       = null;
        this._oppcrib          = null;
        this._starter          = null;
        this._playerplay       = null;
        this._oppplay          = null;
        this._allplay          = null;
        this._alldiscard       = null;
        this._canplay          = null;
        this._isgo             = null;
        this._countlevel       = null;
        this._counttotal       = null;
        this._playercount      = null;
        this._oppcount         = null;
        this._playercountorder = null;
        this._oppcountorder    = null;
        this._winner           = null;
        this._iscrib           = null;
        this._require          = {};
        this._isturn           = false;
        this._isupdating       = false;
        this._isLoad           = false;
        this._confirm          = false;
        this._lastStateChange  = null;
        this._lastModelChange  = null;
    }

    /* properties that remember a game state across reloads */
    clearLiveState = () =>
    {
        this.liveActives = null;
        this.liveOrder   = null;
        this.liveCount   = null;
    }

    /* the game id to load */
    get gid() { return this._gid }
    /* assign game id to model - clear all properties if the gid has been changed */
    set gid( gid )
    {
        /* check if we're replacing a previous game id */
        if ( this._gid != gid )
        {
            /* wipe game model */
            this.clear();
            /* reset live state if we're changing from another game */
            if ( this._gid ) { this.clearLiveState() }
            /* reset localstorage connection */
            this.setStoreScope( 'game-' + gid );
        }
        this._gid = gid; 
    }

    get p1score() { return this._p1score }
    set p1score( a )
    {
        /* keep previous isnew flag */
        a.b?.forEach( ( s, i ) => { if ( s[ 2 ] && this._p1score?.b && this._p1score.b[ i ] ) { s[ 2 ] = this._p1score.b[ i ][ 2 ] } } );
        this._p1score = a ?? null;
    }

    get p2score() { return this._p2score }
    set p2score( a )
    {
        /* keep previous isnew flag */
        a.b?.forEach( ( s, i ) => { if ( s[ 2 ] && this._p2score?.b && this._p2score.b[ i ] ) { s[ 2 ] = this._p2score.b[ i ][ 2 ] } } );
        this._p2score = a ?? null;
    }

    get stage() { return this._stage }
    set stage( s )
    {
        /* save previous value to property */
        this._lastStage = this._stage;
        this._stage = s ?? null;
    }
    /* return the model's previous state */
    get lastStage() { return this._lastStage }


    get timestamp() { return this._timestamp }
    set timestamp( n )
    {
        this._timestamp = n;
    }

    get name() { return this._name }
    set name( s )
    {
        this._name = s ?? null;
    }

    get color() { return this._color }
    set color( b )
    {
        this._color = !!b
    }

    get playerhand() { return this._playerhand }
    set playerhand( o )
    {
        this._playerhand = o ?? null;
    }

    get opphand() { return this._opphand }
    set opphand( o )
    {
        this._opphand = o ?? null;
    }

    get drawresult() { return this._drawresult }
    set drawresult( b )
    {
        this._drawresult = b != null ? !!b : null;
    }

    get playercrib() { return this._playercrib }
    set playercrib( o )
    {
        this._playercrib = o ?? null;
    }

    get oppcrib() { return this._oppcrib }
    set oppcrib( o )
    {
        this._oppcrib = o ?? null;
    }

    get cribhand() { return [ ...( this._iscrib ? this._playercrib : this._oppcrib ), ...( this._iscrib ? this._oppcrib : this._playercrib ) ] }

    get starter() { return this._starter }
    set starter( o )
    {
        this._starter = o ?? null;
    }

    get playerplay() { return this._playerplay }
    set playerplay( o )
    {
        this._playerplay = o ?? null;
    }

    get oppplay() { return this._oppplay }
    set oppplay( o )
    {
        this._oppplay = o ?? null;
    }

    get allplay() { return this._allplay }
    set allplay( o )
    {
        this._allplay = o ?? null;
    }

    get alldiscard() { return this._alldiscard }
    set alldiscard( o )
    {
        this._alldiscard = o ?? null;
    }

    get canplay() { return this._canplay }
    set canplay( o )
    {
        this._canplay = !!o;
    }

    get isgo() { return this._isgo }
    set isgo( o )
    {
        this._isgo = !!o;
    }

    get countlevel() { return this._countlevel }
    set countlevel( n )
    {
        this._countlevel = n ?? null;
    }

    get counttotal() { return this._counttotal }
    set counttotal( n )
    {
        this._counttotal = n ?? null;
    }

    get oppmode() { return ( this._stage == 'count1' && ( this._iscrib && this._countlevel == 0 ) || ( !this._iscrib && this._countlevel > 0 ) ) }

    get playercount() { return this._playercount }
    set playercount( o )
    {
        this._playercount = o ?? null;
    }

    get oppcount() { return this._oppcount }
    set oppcount( o )
    {
        this._oppcount = o ?? null;
    }

    get playercountorder() { return this._playercountorder }
    set playercountorder( o )
    {
        this._playercountorder = o ?? null;
    }

    get oppcountorder() { return this._oppcountorder }
    set oppcountorder( o )
    {
        this._oppcountorder = o ?? null;
    }

    get winner() { return this._winner }
    set winner( b )
    {
        this._winner = b != null ? !!b : null;
    }

    get iscrib() { return this._iscrib != null ? this._iscrib : null }
    set iscrib( b )
    {
        this._iscrib = b;
    }

    get require() { return this._require }
    set require( o )
    {
        this._require = o || {};
    }

    /* detect a require object's length */
    get isRequire() { return Object.values( this.require ).filter( v => v ).length }

    get isturn() { return this._isturn }
    set isturn( o )
    {
        this._isturn = !!o;
    }

    get isupdating() { return this._isupdating }
    set isupdating( o )
    {
        this._isupdating = !!o;
    }

    get isLoad() { return this._isLoad }
    set isLoad( o )
    {
        this._isLoad = !!o;
    }

    get confirm() { return this._confirm }
    set confirm( o )
    {
        this._confirm = !!o;
    }

    get lastStateChange() { return this._lastStateChange }
    set lastStateChange( o )
    {
        this._lastStateChange = o ?? null;
    }

    get lastModelChange() { return this._lastModelChange }
    set lastModelChange( o )
    {
        this._lastModelChange = o ?? null;
    }


    get liveOrder() { return this._liveOrder }
    set liveOrder( o )
    {
        this._liveOrder = o?.length ? o : null;
        this._setHash();
    }

    get liveActives() { return this._liveActives }
    set liveActives( o )
    {
        this._liveActives = o?.length ? o : null;
        this._setHash();
    }

    get liveCount() { return this._liveCount }
    set liveCount( o )
    {
        this._liveCount = o?.length ? o : null;
        this._setHash();
    }

    get storeState() { return this.store?.state }
    set storeState( o )
    {
        /* set current timestamp to state for _trimOldState to use when determining age */
        o.cachetimestamp = new Date();
        this.store = { state: o }
    }

    /* delete outdated gamestates */
    _trimOldState = (
        /* maximum age of timestamp in milliseconds (1 week) */
        age   = 604800000,
        /* how often method is allowed to run (once per week) */
        every = 604800000
    ) =>
    {
        /* track time since last clear */
        const everyLast = new Date( GameModel._lsGetItem( '_trimOldState' )?.timestamp || 0 );
        /* run again if enough time has elapsed */
        if ( every < ( new Date() - everyLast ) )
        {
            /* save new timestamp to model */
            GameModel._lsSetItem( '_trimOldState', { timestamp: new Date() } );
            /* step through each key that matches games */
            Object.keys( { ...localStorage } ).filter( k => k.startsWith( 'game-' ) ).forEach( k =>
            {
                /* determine state's age */
                const ageLast = new Date( GameModel._lsGetItem( k )?.state?.cachetimestamp || 0 );
                /* delete localstorage key if gamestate is older than age */
                if ( age < ( new Date() - ageLast ) ) { localStorage.removeItem( k ) }
            } )
        }
    }

    _setHash = (
        o = this.liveOrder,
        a = this.liveActives,
        c = this.liveCount
    ) => this.hash.state = o || a || c ? { o: o, a: a, c: c } : null;

    _importHash = (
        h = this.hash.state
    ) => {
        if ( h?.o ) { this._liveOrder   = h?.o ?? null }
        if ( h?.a ) { this._liveActives = h?.a ?? null }
        if ( h?.c ) { this._liveCount   = h?.c ?? null }
    }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }

}
