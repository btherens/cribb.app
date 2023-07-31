/* imports */
import Controller from './controller.js';
import GameModel from '../model/gamemodel.js';
import GameView from '../view/gameview.js';

import sfetch from '../sfetch.js';
import DragController from './dragcontroller.js';
import PegscoreController from './pegscorecontroller.js';
import ButtonController from './buttoncontroller.js';

export default class GameController extends Controller
{
    constructor( model = new GameModel, view = new GameView )
    {
        super( model, view );

        /* static startup events in dragcontroller */
        DragController.init();
        /* connect score handlers */
        this._p1score = new PegscoreController( 2 );
        this._p2score = new PegscoreController( 1 );

        /* card selection event */
        DragController.onActiveChange = () => this.onStateChanged();
        DragController.onDomChange    = this.onCardsMove;

        this.view.bindClickButton( this.handleClickButton );
        this.view.bindGameFocus(   this.handleGameFocus );

        this._bindThrottleFetchGameState();

        /* import live values from hash */
        this.model._importHash();
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        stage      = this.model.stage,
        name       = this.model.name,
        color      = this.model.color,
        iscrib     = this.model.iscrib,
        p1score    = this.model.p1score,
        p2score    = this.model.p2score,
        require    = this.model.require
    ) => {
        console.log( 'onModelChanged' );
        /* block updates */
        this._startUpdate();

        /* scores */
        this._p1score.setColor( color );
        this._p2score.setColor( !color );
        /* only redraw player score if we need it to avoid unintended animations */
        if ( stage != 'count1' || this._p1score.points == null || 0 <= this._p1score.points ) { this._p1score.setScore( p1score.s, p1score.p ) }
        this._p2score.setScore( p2score.s, p2score.p );

        /* render blank game view */
        this.view.displayGameView();
        /* set basic properties */
        this.view.header = name;
        this.view.color  = color;
        /* set cribtype unless we're dealing (crib will be set with deal) */
        if ( !( stage == 'deal1' && require?.deal ) ) { this._onCribTypeChanged( iscrib ) }
        /* bind card container */
        DragController.bindContainer( this.view.playerhand );
        /* allow full reorder on player hand */
        this.view.playerhand.isdragreorder = true;

        /* test for state transitions */
        if ( require.last )
        {
            return this._promise().then( () =>
            {
                /* remove elevated transition flag */
                if ( require?.last ) { delete require.last }
                /* run last stage's animation as a transition */
                return [ 'starter1' ].includes( stage ) ? this._onDealModelChanged(    { discard: true } )
                     : [ 'play1'    ].includes( stage ) ? this._onStarterModelChanged( { draw:    true } )
                     : [ 'count1'   ].includes( stage ) ? this._onPlayModelChanged(    { discard: true } )
                     : null;
            } )
            .then( () => this._delay( 100 ) )
            .then( this.onModelChanged );
        }

        /* return a stage-specific modelchange promise */
        return this._promise().then( () =>
              [ 'draw1', 'draw2' ].includes( stage ) ? this._onDrawModelChanged( )
            : [ 'deal1'          ].includes( stage ) ? this._onDealModelChanged( )
            : [ 'starter1'       ].includes( stage ) ? this._onStarterModelChanged( )
            : [ 'play1'          ].includes( stage ) ? this._onPlayModelChanged( )
            : [ 'count1'         ].includes( stage ) ? this._onCountModelChanged( )
            : null
        )
        /* confirm model has loaded */
        .then( () => this.model.isLoad = true )
        /* run post-model methods */
        .then( () => this.onStateChanged() || DragController.trimActives() )
        /* show score text if possible */
        .then( () => stage == 'play1' && this._showScoretext() )
        /* save timestamp */
        .then( () => this.model.lastModelChange = performance.now() )
    }

    /* run updates after live state has changed
     * button state is updated
     * moves are submitted based on positions vs model
     */
    onStateChanged = (
        stage  = this.model.stage,
        isLoad = this.model.isLoad,
        winner = this.model.winner
    ) =>
    {
        console.log( 'onStateChanged' );

        /* reset requirements */
        this.model.require = null;
        /* reset drag properties */
        DragController.dragQuota = 0;
        /* handle different game states */
          [ 'draw1', 'draw2' ].includes( stage ) ? this._onDrawStateChanged()
        : [ 'deal1'          ].includes( stage ) ? this._onDealStateChanged()
        : [ 'starter1'       ].includes( stage ) ? this._onStarterStateChanged()
        : [ 'play1'          ].includes( stage ) ? this._onPlayStateChanged()
        : [ 'count1'         ].includes( stage ) ? this._onCountStateChanged()
        : null;
        /* game has ended */
        if ( winner != null ) { this._onEndStateChanged() }
        /* disable game button if model requires updates */
        if ( this.model.isRequire ) { this.view.button.disabled = true }

        /* ensure drag is on */
        DragController.isOn = true;
        /* save persistent state */
        if ( isLoad ) { this._saveState() }
        /* end the update */
        this._endUpdate();
        /* save timestamp */
        this.model.lastStateChange = performance.now();
    }

    _onDrawModelChanged = (
        require    = this.model.require,
        ph         = this.model.playerhand,
        oh         = this.model.opphand,
        actives    = this.model.liveActives
    ) => this._promise().then( () =>
    {
        /* stack cards if we're doing a transition */
        this.view.neutralstack = require.spread;

        /* display player draw card */
        if ( ph ) { this.view.playerhand.appendChild( DragController.bind( this.view.createCard( ph[ 0 ].i, ph[ 0 ].c.s, ph[ 0 ].c.v ) ) ) }
        /* only prepare crib drag target if we still need to draw card */
        else
        {
            DragController.bindContainer( this.view.neutral );
            /* set player hand to dragtarget */
            DragController.dragTarget = this.view.playerhand;
        }

        /* set card to opponent hand if we're not animating the draw */
        if ( oh && !require.draw ) { this.view.opphand.appendChild( this.view.createCard( oh[ 0 ].i, oh[ 0 ].c.s, oh[ 0 ].c.v ) ) }

        /* display deck in center */
        this.view.display( this.view.neutral, [ ...Array( 52 - ( ph ? 1 : 0 ) - ( oh ? 1 : 0 ) + ( require.draw ? 1 : 0 ) ).keys() ].map( i =>
        {
            /* create a domelement of the card */
            const c = this.view.createCard( i );
            /* attach dragcontroller to card if we still need to draw */
            if ( !ph )
            {
                DragController.bind( c );
                /* maintain active selection */
                if ( actives?.includes( i ) ) { c.classList.add( DragController.classActive ) }
            }
            /* return card */
            return c;
        } ) );
    } )
    /* unstack the deck if necessary */
    .then( () => require.spread && this._animateShowNeutralStack() )
    /* animate other player's draw */
    .then( () => oh && require.draw && this._animateDrawToTarget( 51 - oh[ 0 ].i, this.view.opphand, oh[ 0 ].c.s, oh[ 0 ].c.v ) );

    _onDrawStateChanged = (
        els     = DragController.actives,
        ph      = this.model.playerhand,
        oh      = this.model.opphand,
        result  = this.model.drawresult,
        vn      = this.view.neutral,
        vp      = this.view.playerhand,
        vo      = this.view.opphand
    ) => {
        /* update requirements */
        this.model.require = {
            /* spread the deck */
            spread:   ( !ph && ( !vn.children.length || vp.children.length ) && !this.model.liveActives?.length ) || [ ...vn.children ].filter( el => el._game.suit != null ).length,
            /* draw the opponent's card */
            draw:     oh && vn.children.length && vo.children.length !== 1
        };

        /* if we have a cut card */
        if ( vp.children.length === 1 )
        {
            /* turn off card deck if we have already drawn */
            DragController.unbind( vn );
            /* get player's cut card */
            let c = vp.children[ 0 ];
            /* set card value if we can */
            if ( ph && c._game.value == null ) { this.view.setCard( c, ph[ 0 ].i, ph[ 0 ].c.s, ph[ 0 ].c.v ) }
        }
        else
        {
            /* allow one card pickup at once */
            DragController.dragQuota = 1;
        }

        /* active state - waiting for other player or your turn */
        if ( !ph || !oh )
        {
            /* update button state */
            this.view.button.disabled = !( vp.children.length === 0 && els?.length === 1 );
            this.view.prompt = ph ? 'await your turn' : 'cut the deck';
        }
        /* we have a winner / loser */
        else
        {
            /* enable button */
            this.view.button.disabled = false;
            /*  */
            this.view.prompt = result == null ? 'draw again' : ( result ? 'you win the draw!' : 'you lose the draw' );
        }
    }

    _onDealModelChanged = (
        require    = this.model.require,
        ph         = this.model.playerhand,
        oh         = this.model.opphand,
        pc         = this.model.playercrib,
        oc         = this.model.oppcrib,
        iscrib     = this.model.iscrib,
        order      = this.model.liveOrder,
        /* create hands */
        [ pdomh, odomh, cdomh ] = this._createHands( ph, oh, [ ...( pc ?? [ null, null ] ), ...( oc ?? [ null, null ] ) ] ),
        /* split the crib cards apart to handle separately during this stage */
        [ pcdomh, ocdomh      ] = [ cdomh.slice( 0, 2 ).filter( o => o ), cdomh.slice( 2, 4 ).filter( o => o ) ]
    ) => this._promise().then( () =>
    {
        /* only prepare crib drag target if we still need to discard */
        if ( !( ( pc?.length ?? 0 ) == 2 ) )
        {
            /* move a card that wasn't in hand to the crib - every() runs once then stops after falsy return value */
            pdomh?.filter( el => !( !order || order.includes( el._game.index ) ) ).every( el => pcdomh.push( pdomh.splice( el, 1 )[ 0 ] ) && false );

            /*  */
            DragController.bindContainer( this.view.crib );
            /* set crib to dragtarget */
            DragController.dragTarget = this.view.crib;
        }
    } )
    .then( () =>
    {
        if ( require.discard )
        {
            /* include any opponent crib cards in player hands in case we're doing any transition or animations */
            odomh = [ ...odomh, ...ocdomh ];
            /* always render the player crib */
            this.view.display( this.view.crib, [ ...pcdomh ] );
        }
        else
        {
            this.view.display( this.view.crib, [ ...ocdomh, ...pcdomh ] );
        }
    } )
    .then( () =>
    {
        if ( require.deal )
        {
            const card = this.view.createCard( 0 );
            /* display deck in position where cards were last */
            require.neutral ? this.view.display( this.view.neutral, card ) : this.view.display( this.view.starter, card );
            return this._delay( 150 )
                /* drag "deck" to starter position for deal if necessary - update cribtype at this point for last transition */
                .then( () => DragController.forceDrag( card, this.view.starter, null, 0, this._onCribTypeChanged ) )
                .then( () => this._delay( 250 ) )
        }
    } )
    .then( () =>
    {
        if ( require.deal )
        {
            /* hide card origins */
            [ ...pdomh, ...odomh, ].forEach( c => c.style.opacity = '0' );
            /* display deck in starter card position */
            this.view.display( this.view.starter, [ this.view.createCard( 0 ), ...pdomh, ...odomh ] );
        }
        /* simply display the cards */
        else
        {
            this.view.display( this.view.starter, this.view.createCard( 0 ) );
            this.view.display( this.view.playerhand, pdomh );
            this.view.display( this.view.opphand, odomh );
        }
    } )
    .then( () => require.deal && this._animateDealCardsToHands(
        /* non-dealer gets first card */
        iscrib ? odomh : pdomh,
        iscrib ? this.view.opphand : this.view.playerhand,
        /* dealer gets second card */
        iscrib ? pdomh : odomh,
        iscrib ? this.view.playerhand : this.view.opphand
    ) )
    .then( () => require.discard && this._delay( 125 )
        .then( () => DragController.forceDrag( ocdomh, this.view.crib, this.view.crib.children ? this.view.crib.children[ 0 ] : null, 250 ) )
        .then( () => this._delay( 150 ) )
    );

    _onDealStateChanged = (
        els     = DragController.actives,
        oc      = this.model.oppcrib,
        iscrib  = this.model.iscrib,
        vn      = this.view.neutral,
        vp      = this.view.playerhand,
        vo      = this.view.opphand,
        vc      = this.view.crib,
        vs      = this.view.starter
    ) => {
        /* update requirements */
        this.model.require = ( vn.children.length || vs.children.length ) && {
            /* animate the deal if we have cards in different places */
            deal:    !!vn.children.length || !vp.children.length || !vo.children.length,
            /* determine if cards should be dragged from neutral collection */
            neutral: !!vn.children.length,
            /* animate the opponent's crib moves if a opponent crib collection exists and either deal also needs to happen or if opponent currently has more than 4 cards */
            discard: oc && ( !!vn.children.length || !vp.children.length || !vo.children.length || 4 < vo.children.length )
        };

        /* allow card hold count based on size of hand */
        DragController.dragQuota = Math.max( 0, vp.children.length - 4 );

        /* enable interaction if we still need to move two cards to crib */
        if ( vp.children.length > 4 )
        {
            const bt = this.view.button;
            /* cribbage slots remaining */
            const cr         = 4 - ( vo.children.length - 4 ) - vc.children.length;
            /* enable button if we have a selection in the playerhand and it is at or below cr */
            bt.disabled      = !( els?.length && els[ 0 ].parentNode == vp && ( ( els.length ?? 0 ) <= cr ) );
            const num        = bt.disabled ? cr : els.length;
            this.view.prompt = 'give ' + ( num ).toString() + ' card' + ( num > 1 ? 's' : '' ) + ' to ' + ( iscrib ? 'your' : 'their' ) + ' crib';
        }
        else
        {
            /* disconnect crib collection from drag functions */
            DragController.unbind( vc );
            this.view.button.disabled = true;
            this.view.prompt          = 'await your turn';
        }
    }

    _onStarterModelChanged = (
        require    = this.model.require,
        ph         = this.model.playerhand,
        oh         = this.model.opphand,
        ch         = this.model.cribhand,
        s          = this.model.starter,
        iscrib     = this.model.iscrib,
        actives    = this.model.liveActives,
        /* create hands */
        [ pdomh, odomh, cdomh, sdomh ] = this._createHands( ph, oh, ch, s )
    ) => this._promise().then( () =>
    {
        /* prepare for transition */
        /* stack cards before transition */
        this.view.neutralstack = require.transition;
        /* show the crib for transitions */
        this.view.showCrib     = require.transition;

        /* display hands */
        this.view.display( this.view.playerhand, pdomh );
        this.view.display( this.view.opphand, odomh );
        this.view.display( this.view.crib, cdomh );

        /* conditions for active starter state */
        if ( !iscrib && !s )
        {
            /* disable the player hand */
            DragController.unbind( this.view.playerhand );
            DragController.bindContainer( this.view.neutral );
            DragController.bindContainer( this.view.starter );
            /* set crib to dragtarget */
            DragController.dragTarget = this.view.starter;
        }
    } )
    .then( () =>
    {
        /* transition - move starter card to neutral stack */
        if ( require.transition )
        {
            const s = this.view.createCard( 0 );
            /* display deck in starter card position */
            this.view.display( this.view.starter, s );

            return this._delay( 150 ).then( () =>
            {
                DragController.forceDrag( s, this.view.neutral, null );
                this.view.showCrib = false;
            } ).then( () => this._delay( 250 ) )
        }
    } )
    .then( () =>
    {
        /* render the deck if a draw is still needed, or if we're animating either the card spread or the draw */
        if ( !s || require.transition || require.draw )
        {
            /* display deck in center */
            this.view.display( this.view.neutral, [ ...Array( 40 ).keys() ].map( i =>
            {
                /* create a domelement of the card */
                const c = this.view.createCard( i );
                /* attach dragcontroller to card if we still need to draw */
                if ( !iscrib )
                {
                    DragController.bind( c );
                    /* maintain active selection */
                    if ( actives?.includes( i ) ) { c.classList.add( DragController.classActive ) }
                }
                /* return card */
                return c;
            } ) );
        }
    } )
    /* unfold the card deck if we're doing the transitions */
    .then( () => require.transition && this._animateShowNeutralStack() )
    .then( () => {
        /* render the starter draw */
        if   ( s && require.draw && iscrib ) { return this._animateDrawToTarget( s.i - 12, this.view.starter, s.c.s, s.c.v ) }
        /* or display starter in final position */
        else { this.view.display( this.view.starter, [ sdomh ] ) }
    } )
    /* hide the neutral stack if necessary */
    .then( () => s ? this._animateHideNeutralStack() : null );

    _onStarterStateChanged = (
        els     = DragController.actives,
        s       = this.model.starter,
        iscrib  = this.model.iscrib,
        vn      = this.view.neutral,
        vs      = this.view.starter
    ) => {
        /* update requirements */
        this.model.require = ( vn.children.length || vs.children.length ) && {
            /* if we need to animate from previous state */
            last:       this.view.opphand.children.length == 6,
            transition: !s && !vn.children.length && !this.model.liveActives?.length,
            /* animate the starter draw if we have it and aren't showing it */
            draw:       s ? ( this.view.neutral.children.length && this.view.starter.children.length !== 1 ) : this.view.starter.children.length == 1
        };

        /* get starter card from view */
        let c = vs.children.length ? vs.children[ 0 ] : null;
        /* if we have a starter card */
        if ( s && c )
        {
            /* turn off card deck if we have already drawn */
            DragController.unbind( vn );
            /* set card value if we can */
            if ( s && c._game.value == null ) { this.view.setCard( c, s.i, s.c.s, s.c.v ) }
        }
        DragController.unbind( this.view.crib );

        /* state if we are still waiting for a starter draw */
        if ( !s )
        {
            /* update button state */
            this.view.button.disabled = iscrib || els?.length != 1;
            this.view.prompt = iscrib ? 'await your turn' : 'draw the starter';
            /* allow one card pickup if its your draw */
            DragController.dragQuota = iscrib ? 0 : 1;
        }
        /* we have a starter */
        else
        {
            /* enable button */
            this.view.button.disabled = false;
            /* prompt user with inline colored span */
            this.view.prompt = 'starter card: ';
            this.view.button.appendChild( this.view.createCardSpan( s.c.s, s.c.v ) );
        }
    }

    _onPlayModelChanged = (
        require    = this.model.require,
        ph         = this.model.playerhand,
        oh         = this.model.opphand,
        ch         = this.model.cribhand,
        s          = this.model.starter,
        pp         = this.model.playerplay,
        op         = this.model.oppplay,
        ap         = this.model.allplay,
        ad         = this.model.alldiscard,
        it         = this.model.isturn,
        ig         = this.model.isgo,
        winner     = this.model.winner,
        confirm    = this.model.confirm,
        /* create hands */
        [ pdomh, odomh, cdomh, sdomh, apdomh, addomh ] = this._createHands( ph, oh, ch, s, pp, op, ap, ad )
    ) => this._promise().then( () =>
    {
        /* display count in contextual info if we're not transitioning away */
        !require.discard && apdomh && !addomh && pdomh.length && odomh.length && this.view.updatePlayCount( ap ? ap.map( c => this._getCardPoint( c.c.v ) ).reduce( ( s, a ) => s + a, 0 ) : 0 );
        /* display neutraltext immediately if transition is off */
        if ( winner == null ) { this._displayFloatTextNeutral( [ this.view.playcount, ' / 31' ], require.transition ) }
    } )
    /* display / animate last play */
    .then( () => this._displayPlayHands( pdomh, odomh, cdomh, sdomh, apdomh, addomh, oh, require.play, !ap?.length && ad?.length && ( !confirm || require?.discard ) ) )
    .then( () =>
    {
        /* is play at a confirm screen after both players go */
        const holdgo = ( pdomh.length || odomh.length ) && !ap && ad && !confirm && 4 > ( pdomh?.length ?? 0 ) && 4 > ( odomh?.length ?? 0 ) && 31 > this._getPlayScore( ad );
        /* if go float text for one player or holding after both go */
        if ( ig || holdgo )
        {
            /* set opponent go text if it is player's turn or if both are go */
            if ( it  || holdgo ) { this.view.displayFloatTextOpp( 'go', !require.gotxt ) }
            /* player go text if it is opponent's turn after a go or both are go */
            if ( !it || holdgo ) { this.view.displayFloatTextPlayer( 'go', !require.gotxt ) }
            /* if gotext was still needed */
            if ( require.gotxt )
            {
                /* fade-in go text */
                return this._delay( 20 )
                    .then( () =>
                    {
                        if ( it  ) { this.view.showFloatTextOpp    = true }
                        if ( !it ) { this.view.showFloatTextPlayer = true }
                    } )
                    /* hold display until fade-in completes */
                    .then( () => this._delay( 400 ) );
            }
        }
    } ).then( () =>
    {
        /* if we're animating a discard */
        if ( require.discard && !apdomh && addomh )
        {
            /* hide the neutraltext if we're discarding and going to the next round */
            if ( !pdomh.length && !odomh.length ) { this.view.showFloatTextNeutral = false }
            return this._animateHideNeutralStack()
            .then( () => this._delay( 220 ) )
            .then( () =>
            {
                /* reset collection */
                this.view.neutral.textContent = '';
                this.view.neutralstack = false;
                this.view.showNeutral  = true;
            } );
        }
    } );

    _onPlayStateChanged = (
        els     = DragController.actives,
        vn      = this.view.neutral,
        vs      = this.view.starter,
        vo      = this.view.opphand,
        fto     = this.view.showFloatTextOpp,
        ftp     = this.view.showFloatTextPlayer,
        pp      = this.model.playerplay,
        op      = this.model.oppplay,
        ap      = this.model.allplay,
        ad      = this.model.alldiscard,
        it      = this.model.isturn,
        cp      = this.model.canplay,
        ig      = this.model.isgo,
        confirm = this.model.confirm
    ) => {
        /* update requirements */
        this.model.require = ( vo.children.length || vn.children.length ) && {
            /* if we need to animate from previous state */
            last:       vo.children.length && !vs.children.length,
            transition: vo.children.length && vn.children.length > 8,
            /* if we need to animate a play */
            play:       vo.children.length && ( vo.children.length != 4 - ( op?.length ?? 0 ) ) && vn.children.length != ( ap?.length ?? 0 ),
            /* if we need to animate a discard */
            discard:    vn.children.length && !ap?.length && confirm,
            /* if go text needs to be animated */
            gotxt:      vn?.children.length && ig && ig != ( fto || ftp )
        };
        const iscomplete = !ap && ad && !confirm;
        const el         = els.length ? els[ 0 ] : null;
        /* freeze last play if we hit 31 */
        const score      = this._getPlayScore( iscomplete ? ad : ap );
        const newscore   = iscomplete ? score : ( score +( el && it ? this._getCardPoint( el._game.value ) : 0 ) );
        /* is the new count within game rules */
        const isvalid    = 31 >= newscore;

        /* update play count */
        this.view.updatePlayCount( newscore, score != newscore, isvalid );

        /* if it is our turn */
        if ( it && !iscomplete )
        {
            DragController.bindContainer( this.view.neutral );
            DragController.dragTarget = this.view.neutral;
        }
        /* unbind if not player's turn */
        else
        {
            DragController.unbind( this.view.neutral );
            DragController.dragTarget = null;
        }
        /* remove go text if necessary */
        if ( !ig && !( iscomplete && 31 > score ) && this.view.showFloatTextOpp && 'go' == this.view.floattextopp?.textContent )
        {
            this.view.showFloatTextOpp = false;
            this._delay( 450 ).then( this.view.clearFloatTextOpp );
        }
        DragController.dragQuota = 1;

        /* present continue if we need to confirm a completed run */
        if ( vn.children.length && !ap?.length && !confirm )
        {
            this.view.prompt = 'continue';
            this.view.button.disabled = el;
        }
        else
        {
            this.view.prompt = it ? ( el ? [ 'play ', this.view.createCardSpan( el._game.suit, el._game.value ) ] : ( cp ? 'play a card' : ( pp.length == 4 && op.length == 4 ? 'continue' : 'go' ) ) ) : 'await your turn';
            this.view.button.disabled = !( it && score != newscore && newscore <= 31 || it && !cp && el == null );
        }
    }

    _onCountModelChanged = (
        require          = this.model.require,
        ph               = this.model.playerhand,
        oh               = this.model.opphand,
        ch               = this.model.cribhand,
        s                = this.model.starter,
        iscrib           = this.model.iscrib,
        actives          = this.model.liveActives,
        playercountorder = this.model.playercountorder,
        oppcountorder    = this.model.oppcountorder,
        level            = this.model.countlevel,
        it               = this.model.isturn,
        /* determine if we're in opponent hand view */
        oppmode          = this.model.oppmode,
        /* create hands */
        [ pdomh, odomh, cdomh, sdomh ] = this._createHands( ph, oh, ch, s, undefined, undefined, undefined, undefined, oppmode )
    ) => this._promise().then( () =>
    {
        /* shift neutraltext floattext to allow for more text */
        this.view.pinNeutraltext  = true;
        /* alter container bindings if we're looking at the opponent hand */
        if ( oppmode )
        {
            DragController.bindContainer( this.view.opphand );
            DragController.unbind( this.view.playerhand );
            this.view.opphand.isdragreorder = true;
        }
        /* set oppmode to inverse if we're meant to transition between */
        this.view.showFullOppHand = require.oppmode ? !oppmode : oppmode;

        /* update floatscore properties */
        //this._updateFloatScore();

        /* bind inactive drag to the starter if it is player's turn */
        if ( it ) { DragController.bindInactive( sdomh ) }
        /* keep starter active */
        if ( actives?.includes( sdomh._game.index ) ) { sdomh.classList.add( DragController.classActive ) }
        /* always render starter in position */
        this.view.display( this.view.starter, [ sdomh ] );
    } )
    .then( () =>
    {
        /* test for crib view */
        if ( level == 2 )
        {
            /* transition from hands to crib */
            if ( require.level )
            {
                /* display hands as they were */
                this.view.display( this.view.playerhand, pdomh );
                this.view.display( this.view.opphand, odomh );
                this.view.display( this.view.crib, cdomh );
                /* drag both player and opponent's hands to the starter / deck */
                return DragController.forceDrag( this.model.interleave( pdomh, odomh ), this.view.starter, null, 150, null, el => el.style.opacity = 0 )
                /* overwrite starter collection to clear the dragged cards */
                .then( () => this.view.display( this.view.starter, [ sdomh ] ) )
                /* wait */
                .then( () => this._delay( 400 ) )
                .then( () => DragController.forceDrag( cdomh, iscrib ? this.view.playerhand : this.view.opphand, null, 150 ) )
            }
            else
            {
                this.view.display( iscrib ? this.view.playerhand : this.view.opphand, cdomh );
            }
        }
        else
        {
            this.view.display( this.view.crib, cdomh );
            /* deal cards */
            if ( require.deal )
            {
                /* stack the neutral collection so that all cards come from center */
                this.view.neutralstack = true;
                /* hide card origins */
                [ ...pdomh, ...odomh, ].forEach( c => c.style.opacity = '0' );
                /* display deck in starter card position */
                this.view.display( this.view.neutral, [ ...pdomh, ...odomh ] );

                /* animate deal to cards */
                return this._delay( 20 ).then( () => this._animateDealCardsToHands(
                    /* non-dealer gets first card */
                    iscrib ? odomh : pdomh,
                    iscrib ? this.view.opphand : this.view.playerhand,
                    /* dealer gets second card */
                    iscrib ? pdomh : odomh,
                    iscrib ? this.view.playerhand : this.view.opphand
                ) );
            }
            else
            {
                this.view.display( this.view.playerhand, pdomh );
                this.view.display( this.view.opphand, odomh );
            }
        }
    } )
    /* switch the oppmode now after delay */
    .then( () => require.oppmode && this._delay( 100 ).then( () => this.view.showFullOppHand = oppmode ) );

    _onCountStateChanged = (
        els              = Array.from( DragController.actives ),
        vph              = this.view.playerhand,
        voh              = this.view.opphand,
        vch              = this.view.crib,
        vn               = this.view.neutral,
        vs               = this.view.starter,
        p1score          = this.model.p1score,
        p2score          = this.model.p2score,
        ct               = this.model.counttotal,
        playercount      = this.model.playercount,
        oppcount         = this.model.oppcount,
        playercountorder = this.model.playercountorder,
        oppcountorder    = this.model.oppcountorder,
        sl               = this.view.scorelist,
        iscrib           = this.model.iscrib,
        level            = this.model.countlevel,
        it               = this.model.isturn,
        /* determine if we're in opponent hand view */
        oppmode          = this.model.oppmode,
        voppmode         = this.view.showFullOppHand
    ) => {
        /* declare update requirements */
        this.model.require = ( vn.children.length || vs.children.length ) && {
            /* if we need to animate from previous state */
            last:    0 < vn.children.length,
            /* deal the hands if we haven't yet */
            deal:    level == 0 && vph.children.length < 4,
            /* transition between modes */
            oppmode: !!oppmode != !!voppmode,
            /* test for crib draw */
            level:   level == 2 && vch.children.length == 4
        };

        /* allow 5 card pickup */
        DragController.dragQuota = 5;

        /* nullify live count if it's not our turn */
        if ( !it || playercountorder ) { this.model.liveCount = null }

        /* hold opponent's current count if available */
        if ( oppcount && !this.model.liveCount ) { this.model.liveCount = this.mergeLiveCount( null, oppcount ) }
        /* running scores */
        /* scores held in state */
        let holdscore = ct.filter( s => ( this.model.liveCount ?? this.mergeLiveCount( null, playercount ) ?? [] ).includes( s.i ) );
        let oppscore  = ct.filter( s => [ ...( oppcount ?? [] ) ].includes( s.i ) );

        /* return the point sum of a scores object */
        const _sumScores = ( score ) => score.map( o => o.o[ 1 ] ).reduce( ( p, c ) => p + c, 0 );
        /* sum of points in hold (minus sum of points in opponent's count) */
        const playerholdtotal = _sumScores( holdscore ) - _sumScores( oppscore );
        /* set pegs if it is our turn and not the end of game */
        if ( it && null == this.model.winner )
        {
            if ( playerholdtotal ) { this._p1score.setScore( null, -playerholdtotal ) } else { this._p1score.setScore( p1score.s, p1score.p ) };
        }

        /* new scores held in hand */
        let selectscore  = it && !playercountorder ? this.findActiveScore() : [];

        /* combine simple scores for visual display */
        const _combineScores = ( score, name ) =>
        {
            /* shallow clone object */
            score = [ ...score ];
            name.forEach( n =>
            {
                /* output variable */
                let cmb;
                let thisscore;
                /* step through array by index */
                for ( let i = 0; i < score.length; i++ )
                /* only collect scores with name */
                if  ( score[ i ].o[ 0 ] == n )
                {
                    /* remove from array */
                    thisscore = score.splice( i, 1 )[ 0 ];
                    /* adjust counter to account for array change */
                    i--;
                    /* initiate an object if necessary */
                    if ( !cmb ) { cmb = {} }
                    /* add record to the combo */
                    if ( !cmb.d ) { cmb.d = [] }
                    cmb.d.push( thisscore.i );
                    /* collect properties */
                    cmb.i = thisscore.i;
                    /* 1x, 2x, 3x, nx */
                    cmb.y = ( cmb?.y ?? 0 ) + 1;
                    /* define new score name and point value */
                    cmb.o = [
                        n,
                        ( cmb.o ? cmb.o[ 1 ] : 0 ) + thisscore.o[ 1 ]
                    ];
                }
                /* return the score if no combo was found */
                if ( 1 == cmb?.y ) { score.push( thisscore ) }
                /* append the combo result to output array */
                else if ( cmb    ) { score.push( cmb ) }
            } );
            /* return result as new array */
            return score;
        }
        /* true if list includes i, or if list includes all members of d */
        const _isInCount = ( i, d, list ) => list?.includes( i ) || ( d?.length && !d.filter( i => !list?.includes( i ) ).length );

        /* create dom elements for all scores in state - scores being replaced by selectscore will receive strikethrough style */
        let holdspan   = _combineScores( holdscore, [ 'pair', 'fifteen' ] ).map( e =>
        {
            /* determine if selection should be deactivated / toggled */
            const sets          = ( e.a ? [ e ] : ( e.s ?? e.d )?.map( n => ct.filter( o => o.i == n )[ 0 ] ) );
            const isactivearray = sets?.map( o => this.model.isArrEqual( o.a, els.map( e => e._game.index ) ) );
            const isactive      = isactivearray.findIndex( o => o );
            /* determine whose score takes precedence if score is mixed */
            const isPlayerPrecedence = oppmode;

            let prestr = e?.y > 1 ? e.y + 'x ' : '';
            let spanarray   = [ prestr + e.o[ 0 ] + ' ' ];

            let scorestr, scoretype;
            /* if we're selecting one of many */
            if ( 1 < sets.length && -1 < isactive )
            {
                /* apply n/total stylings in points and combo count */
                prestr   = isactive + 1 + '/' + prestr;
                scorestr = sets[ isactive ].o[ 1 ] + '/' + e.o[ 1 ];
            }
            /* if we aren't resolving scores between players */
            else if ( !oppcountorder )
            {
                scoretype = 1;
                scorestr = e.o[ 1 ];
            }
            else
            {
                /* detect partial scores in both oppcount and playercount */
                const setScores = [ oppcount, playercount ].map( count =>
                    ( e.a && e.d ? ct.filter( o => this.returnScoreMask( ct, [ e.i ] ).filter( i => count?.includes( i ) ).includes( o.i ) ) : sets.filter( o => count?.includes( o.i ) ) )
                        .map( o => o.o[ 1 ] ).reduce( ( a, b ) => a + b, 0 )
                );
                /* if score has some opponent points */
                if ( oppmode )
                {
                    scoretype = setScores[ 0 ] == e.o[ 1 ] ? 2 : 1;
                    /* detect partial score */
                    if ( setScores[ 0 ] && setScores[ 0 ] != e.o[ 1 ] && -1 == isactive )
                    {
                        spanarray.push( this.view.createScoreSpan( `(${setScores[ 0 ]}) `, 2 ) ); 
                        scorestr = e.o[ 1 ] - setScores[ 0 ];
                    }
                    else
                    {
                        scorestr = e.o[ 1 ];
                    }
                }
                else
                {
                    scoretype = setScores[ 1 ] == e.o[ 1 ] ? 1 : 2;
                    /* detect partial score */
                    if ( setScores[ 1 ] && setScores[ 1 ] != e.o[ 1 ] && -1 == isactive )
                    {
                        spanarray.push( this.view.createScoreSpan( `(${setScores[ 1 ]}) `, scoretype == 1 ? 2 : 1 ) ); 
                        scorestr = e.o[ 1 ] - setScores[ 1 ];
                    }
                    else
                    {
                        scorestr = e.o[ 1 ];
                    }
                }
            }
            /* set main score to array */
            spanarray.push( this.view.createScoreSpan( `(${scorestr})`, 0 ) );

            /* build and return this scorespan */
            return this.view.createScoreSpan(
                /* score string */
                spanarray,
                /* score color */
                ( -1 < isactive ) ? 0 : scoretype,
                /* invalidate a record (cross score out if select object is going to invalidate this score) */
                this.returnScoreMask( ct, selectscore.map( s => s.i ) ).includes( e.i ),
                /* select this score again by clicking if it is player's turn */
                () => {
                    /* don't select if we have no dragquota (if game has ended) */
                    if ( !DragController.dragQuota ) return;
                    DragController.disableActives();
                    /* toggle next in set if not at the end already */
                    if ( isactive < sets.length - 1 )
                    {
                        DragController.toggleElements(
                            Array.from( DragController.canDrags ).filter(
                                el => sets[ isactive + 1 ].a.includes( el._game.index )
                            ),
                            true
                        );
                    }
                    else
                    {
                        DragController.onActiveChange();
                    }
                }
            )
        } );
        /* create dom elements for scores in held cards */
        let selectspan = selectscore.length
            ? selectscore?.map( e => this.view.createScoreSpan( e.o[ 0 ] + ` (${e.o[ 1 ]})`, 3, false ) )
            : !holdscore.length && ( it || playercountorder?.length ) ? [ this.view.create( 'span', {}, playercountorder?.length || oppcountorder?.length ? 'no score' : 'count scoring cards' ) ] : [];

        /* display float text if necessary */
        if ( it || ( playercount || oppcount ) )
        {
            /* clear existing floattext*/
            this.view.neutraltext.textContent = '';
            /* render newline separated score text */
            this._displayFloatTextNeutral( this.model.sinterleave( [ ...holdspan, ...selectspan ], this.view.create( 'br' ) ), false );
        }

        /* set prompt */
        this.view.prompt = !it ? 'await your turn' : (
            els.length ? this.model.sinterleave( els.map( e => this.view.createCardSpan( e._game.suit, e._game.value ) ), ' + ' ) : (
                playerholdtotal ? 'finish score: ' + playerholdtotal : (
                    oppmode || ( playercountorder && oppcountorder ) ? 'continue' : 'pass' ) ) 
        );
        /* disable button if
         * it is not player's turn
         * if we're highlighting cards that don't represent a new score
         */
        this.view.button.disabled = !it || ( els.length ? ( !selectscore.length ) : false );
    }

    _onEndStateChanged = (
        p1score = this.model.p1score,
        p2score = this.model.p2score
    ) => {
        /* declare update requirements */
        this.model.require = {
            display: false
        };
        /* unbind any cards that aren't in hands */
        [ this.view.neutral, this.view.starter.children[ 0 ], this.view.crib ].filter( el => el ).forEach( el => DragController.unbind( el ) );
        DragController.dragTarget = null;
        DragController.dragQuota  = 0;

        /* set prompt */
        this.view.prompt = ( p1score?.s ?? 0 ) > ( p2score?.s ?? 0 )
            ? 'declare win!'
            : 'accept ' + ( 90 > ( p1score?.s ?? 0 ) ? '🦨' : 'loss' );
        this.view.button.disabled = false;
    }

    /* display scores over player hands */
    _showScoretext = (
        p1score    = this.model.p1score.b,
        p2score    = this.model.p2score.b,
        showPlayer = this.view.showFloatTextPlayer,
        showOpp    = this.view.showFloatTextOpp
    ) => this._promise().then( () =>
    {
        /* detect new scores */
        const p1newscore = p1score?.filter( a => a[ 2 ] );
        const p2newscore = p2score?.filter( a => a[ 2 ] );

        /* animate the presentation of a score (either player)
         * s: single score object taken from array
         * df: displayfloat method. use different methods to display in different spaces
         * sf: showFloat method, used to hide/show
         * cf: clearFloat, completely remove float from dom
         */
        const animatescore = ( s, df, sf, cf ) => this._promise()
            .then( () => s[ 2 ] = false )
            .then( () => df( s[ 0 ] + ' +' + s[ 1 ] + '', false ) )
            .then( () => this._delay( 20 ) )
            .then( () => sf( true ) )
            .then( () => this._delay( 3000 ) )
            .then( () => sf( false ) )
            .then( () => this._delay( 450 ) )
            .then( () => cf() );

        /* return promise that presents any unseen scores to player */
        return this._promise()
        .then( () => !showOpp    && p2newscore?.length && this._resolveSeq( p2newscore.map( s => () => animatescore( s, this.view.displayFloatTextOpp, b => this.view.showFloatTextOpp = b, this.view.clearFloatTextOpp ) ) ) )
        .then( () => !showPlayer && p1newscore?.length && this._resolveSeq( p1newscore.map( s => () => animatescore( s, this.view.displayFloatTextPlayer, b => this.view.showFloatTextPlayer = b, this.view.clearFloatTextPlayer ) ) ) );
    } );

    _onCribTypeChanged = ( iscrib = this.model.iscrib ) => this.view.cribtype = iscrib == null ? 0 : ( iscrib ? 1 : 2 );

    /* return the current score of a play sequence */
    _getPlayScore = ( ap = this.model.allplay ) => ap ? ap.map( c => this._getCardPoint( c.c.v ) ).reduce( ( s, a ) => s + a, 0 ) : 0;

    /* return point value from card value */
    _getCardPoint = ( v ) => v < 9 ? v + 1 : 10;

    /* return an array of view elements for model types */
    _createHands = (
        ph,
        oh,
        ch,
        s,
        pp,
        op,
        ap,
        ad,
        oppmode,
        level            = this.model.countlevel,
        playercountorder = this.model.playercountorder,
        oppcountorder    = this.model.oppcountorder,
        order            = this.model.liveOrder,
        actives          = this.model.liveActives
    ) => [
        /* create the playerhand */
        this._createHand(
            this._orderHand( ph, !oppmode && ph && ( order || oppcountorder || playercountorder ) ).filter( c => !pp?.map( c => c.i ).includes( c.i ) ),
            !oppmode,
            false,
            !oppmode ? actives : null
        ),
        /* other player's hand */
        this._createHand(
            this._orderHand( oh, oppmode && oh && ( order || oppcountorder || playercountorder ) ).filter( i => !op?.map( c => c.i ).includes( i?.i ?? i ) ),
            oppmode,
            true,
            oppmode ? actives : null
        ),
        /* the crib cards */
        this._createHand(
            this._orderHand( ch, ch && ( order || oppcountorder || playercountorder ) ),
            level == 2,
            null,
            level == 2 ? actives : null
        ),
        /* starter */
        s ? this.view.createCard( s.i, s.c.s, s.c.v ) : null,
        /* the play collection */
        ap?.map( o => this.view.createCard( o.i, o.c.s, o.c.v, !ph.map( c => c.i ).includes( o.i ) ) ),
        /* play discards */
        ad?.map( o => this.view.createCard( o.i, o.c.s, o.c.v, !ph.map( c => c.i ).includes( o.i ) ) )
    ];

    /* create a hand and return */
    _createHand = (
        hand,
        drag,
        offset  = null,
        actives = this.model.liveActives
    ) => hand?.map( o =>
    {
        /* passthrough nulls */
        if ( o == null ) { return }
        /* create a domelement of the card */
        const c = this.view.createCard( o?.i ?? o, o?.c?.s, o?.c?.v, offset != null ? !!offset : null );
        /* enable drag on element */
        if ( drag ) { DragController.bind( c ) }
        /* maintain active selection */
        if ( actives != null && actives.includes( o?.i ?? o ) ) { c.classList.add( DragController.classActive ) }
        /* return card */
        return c;
    } );

    /* alter hand order based on persistent state
     * > 0: sort a after b
     * < 0: sort b after a
     * = 0: keep order
     */
    _orderHand = ( h, o ) => !o ? h : [ ...h ].sort( ( a, b ) => ( o.indexOf( a?.i ) ?? Infinity ) - ( o.indexOf( b?.i ) ?? Infinity ) );

    /* return a promise that animates a draw from neutral hand to target and assigns card value */
    _animateDrawToTarget = ( i, t, s, v ) => this._delay( 100 ).then( () =>
    {
        const n = this.view.neutral;
        /* pick card out of draw pile */
        const c = n.children[ Math.min( i, n.children.length - 1 ) ];
        /* begin animating the move assynchronously */
        DragController.forceDrag( c, t );
        /* set value to the card so that it displays */
        this.view.setCard( c, 0, s, v );
    /* resolve promise chain when animation delay has concluded */
    } ).then( () => this._delay( 200 ) );

    /* deal two collections to two hands */
    _animateDealCardsToHands = ( c1, h1, c2, h2 ) => this._promise().then( () =>
    {
        /* animation duration */
        const d  = 100;
        /* delay between animations */
        const dl = 25;
        /* drag cards from deck to hands */
        DragController.forceDrag( c1, h1, null, 2 * ( d + dl ) );
        setTimeout( () => DragController.forceDrag( c2, h2, null, 2 * ( d + dl ) ), d + dl );

        /* delay by length of transition */
        return this._delay( ( d + dl ) * Math.max( c1.length, c2.length ) * 2 + 2 * ( d + dl ) );
    } );

    /* hide the neutral stack */
    _animateHideNeutralStack = ( fade = true ) => this._promise().then( () =>
    {
        /* ensure animations are used */
        this.view.neutralanimate = true;
        return this._delay( 20 );
    } ).then( () =>
    {
        /* stack up neutral collection */
        this.view.neutralstack = true;
        /* show the crib */
        this.view.showCrib     = true;
        return this._delay( 400 ).then( () =>
        {
            /* fade out neutral card if enabled */
            this.view.showNeutral = !fade;
            /* disable animations */
            this.view.neutralanimate = false;
        } );
    } );

    /* unfold a neutral stack  */
    _animateShowNeutralStack = () => this._promise().then( () =>
    {
        /* show / fade-in the neutral stack */
        this.view.showNeutral = true;
        /* enable animations */
        this.view.neutralanimate = true;
        return this._delay( 20 );
    } ).then( () =>
    {
        /* unstack neutral collection */
        this.view.neutralstack = false;
        /* hide the crib */
        this.view.showCrib     = false;
        return this._delay( 400 ).then( () =>
        {
            /* disable animations */
            this.view.neutralanimate = false;
        } );
    } );

    /* display (and maybe animate) a play table */
    _displayPlayHands = (
        pdomh,
        odomh,
        cdomh,
        sdomh,
        apdomh,
        addomh,
        oh,
        play,
        discard
    ) => this._promise()
    .then( () =>
    {
        /* display */
        this.view.display( this.view.playerhand, pdomh );
        this.view.display( this.view.crib, cdomh );
        this.view.display( this.view.starter, [ sdomh ] );
    } )
    .then( () =>
    {
        let output = null;
        /* consider either a play or discard when considering a discard animation */
        let adomh = [ ...( ( discard ? addomh : apdomh ) ?? [] ) ];
        /* test for play animation */
        if ( play && adomh.length && oh.includes( adomh[ adomh.length - 1 ]._game.index ) )
        {
            /* move last card to opponent's collection */
            const c = adomh.pop();
            odomh   = [ ...odomh, c ];
            /* output an animation promise */
            output  = this._delay( 150 ).then( () => DragController.forceDrag( c, this.view.neutral, null ) ).then( () => this._delay( 250 ) );
        }
        /* display opponent hand and play collection */
        this.view.display( this.view.opphand, odomh );
        this.view.display( this.view.neutral, adomh );

        return output;
    } );

    /* display neutraltext widget (with optional transition) */
    _displayFloatTextNeutral = (
        text,
        transition
    ) => this._promise()
    /* display float text */
    .then( () => this.view.displayFloatTextNeutral( text, !transition ) )
    /* animate a transition in if enabled */
    .then( () => transition && this._delay( 20 ).then( () => this.view.showFloatTextNeutral = true ).then( () => this._delay( 400 ) ) );

    onCardsMove = els => { this.checkMove() }

    /* attempt to make a move based on new card position - pass f = true to run even if updating */
    checkMove = ( stage = this.model.stage, f = !this.model.isupdating ) =>
    {
        /* don't run if the view hasn't been displayed yet */
        if ( !f || !this.view.neutral ) { return }
        /* handle different game stages */
        [ 'draw1', 'draw2'   ].includes( stage ) ? this._checkDrawMove()
        : [ 'deal1'          ].includes( stage ) ? this._checkDealMove()
        : [ 'starter1'       ].includes( stage ) ? this._checkStarterMove()
        : [ 'play1'          ].includes( stage ) ? this._checkPlayMove()
        /* update state if we didn't reach a movecheck */
        : null;
    }

    /* return a score from a count object if it is not already in live collection */
    findActiveScore = (
        els       = DragController.actives,
        scorelist = this.model.counttotal,
        used      = [ ...( this.model.liveCount ?? [] ), ...( this.model.playercount ?? this.model.oppcount ?? [] ) ],
        /* dependent score mask - a list of scores that are de facto included in used */
        mask      = this.returnScoreMask( scorelist, used )
    ) => scorelist
    .filter( o => ![ ...( used ?? [] ), ...mask ]?.includes( o.i ) )
    .filter( o => this.model.isArrEqual( o.a, Array.from( els ).map( e => e._game.index ) ) );

    /* return a list of ct indexes that are effectively being used (including indexes that are dependents of used indexes) */
    returnScoreMask = ( scorelist, used ) => this.model.unique( [].concat( ...scorelist
        .filter( s => used?.includes( s.i ) )
        .filter( s => s.d || s.s || s.x )
        .map( s => [ ...( s.d ?? [] ), ...( s.s ?? [] ), ...( s.x ?? [] ), ...this.returnScoreMask( scorelist, s.d ) ] )
    ) );

    mergeLiveCount = (
        /* new score index to add */
        i         = null,
        /* add an existing score index to livecount to create new count */
        count     = [ ...( this.model.liveCount ?? [] ), i ],
        /* the full scorelist being referenced in count object */
        scorelist = this.model.counttotal
    ) =>
    {
        /* recursive unpack */
        const unpack = o => scorelist.filter( s => s.i == o ).map( s => ( s.d?.length ? s.d.map( unpack ) : s.i ) );
        /* filter nulls and duplicates from count and unpack result */
        count = this.model.unique( count?.filter( i => i != null ) ?? [] ).map( unpack ).flat( 10 );

        /* step through scorelist in reverse order and optimize the selection, preferring combos over separate scores */
        scorelist.slice().reverse().forEach( s =>
        {
            /* add this score if
             * not yet in count collection
             * the count has all required dependents or subset
             * the count does not intersect with incompatible scores
             */
            if ( !count.includes( s.i ) && ( this.model.isArrSubset( s.d, count ) || this.model.isArrSubset( s.s, count ) ) && !count.filter( x => s.x?.includes( x ) ).length )
            {
                count.push( s.i )
            }
            /* remove any scores superceded by this one if this score is in new count */
            if ( count.includes( s.i ) )
            {
                count = count.filter( i => !this.returnScoreMask( scorelist, [ s.i ] ).includes( i ) )
            }
        } );
        /* assign new count to model */
        return count;
    }

    _checkCountMove = (
        els       = DragController.actives,
        oppmode   = this.model.oppmode,
        level     = this.model.countlevel,
        iscrib    = this.model.iscrib,
        hand      = level == 2 ? this.model.cribhand : oppmode ? this.model.opphand : this.model.playerhand,
        vhand     = oppmode ? this.view.opphand  : this.view.playerhand,
        count     = this.model.liveCount ?? [ ],
        order     = this.model.liveOrder ?? hand.map( o => o.i ),
        hasscore  = !!this.model.playercountorder,
        end       = !!this.model.oppcountorder,
        statetime = performance.now() - this.model.lastStateChange
    ) =>
    {
        /* if we're selecting new scores */
        if ( els.length && !hasscore )
        {
            const actvscore = this.findActiveScore();
            if ( actvscore.length )
            {
                this.model.liveCount = this.mergeLiveCount( actvscore[ 0 ]?.i );
                if ( actvscore.length <= 1 ) { this._delay( 350 ).then( () => this._dropFocus() ) } else { this.onStateChanged() }
            }
        }
        /* if it has been > 250 ms since last stateupdate and we are holding a count or are at the end of a count or have confirmed we want to pass to opponent without a count */
        else if ( 450 < statetime && ( !!count.length || end || window.confirm( 'pass to your opponent with no points?' ) ) )
        {
            /* clear state and hide the floattext */
            this.model.liveCount = null;
            /* transition to next round */
            this.submitMove(
                [ level, ...order, ...count ],
                /* pass a promise chain to be completed while move is happening on server */
                this._promise()
                    /* hide the float text bubble if we're transitioning away */
                    .then( () => end && !( level == 0 && iscrib ) && ( this.view.showFloatTextNeutral = false ) )
                    .then( () => this._delay( 250 ) )
                    /* animate the drag of cards to the starter/deck if necessary */
                    .then( () =>
                    {
                        if ( end && level == 2 )
                        {
                            return this._promise()
                                .then( () => { if ( this.view.showFullOppHand ) { this.view.showFullOppHand = false; return this._delay( 250 ) } } )
                                .then( () => DragController.forceDrag( vhand.children, this.view.starter, null, 150 ) )
                                .then( () => this._delay( 250 ) )
                        }
                    } )
            );
        }
        else { this.onStateChanged() }
    }

    _checkPlayMove = (
        ph = this.model.playerhand,
        pp = this.model.playerplay,
        vn = this.view.neutral
    ) => {
        if ( vn.children.length )
        {
            /* look at the last card in neutral collection */
            let c = Array.from( vn.children ).slice( -1 )[ 0 ];
            /* check if the card is from player's hand, it hasn't been played yet, and it isn't already being used in a move */
            if ( !c._game?.isMove && ph.filter( c => !pp?.map( c => c.i ).includes( c.i ) ).filter( o => o.i === c._game.index ).length )
            {
                /* calculate new score */
                const newscore = this._getPlayScore() + this._getCardPoint( c._game.value );
                /* check for invalid moves */
                if ( 31 >= newscore )
                {
                    /* set flag to prevent repeat processing */
                    c._game.isMove = true;
                    /* set play count to newscore with newscore highlighting */
                    this.view.updatePlayCount( newscore, true, true );
                    /* submit move to server if it looks good */
                    this.submitMove( [ c._game.index ] );
                }
                /* return card to hand if it didn't meet constraints */
                else { DragController.forceDrag( c, this.view.playerhand ).then( () => this.onStateChanged() ) }
            }
        }
    }

    _checkStarterMove = (
        s = this.model.starter
    ) => {
        if ( this.view.starter.children.length && this.view.neutral.children.length )
        {
            /* get starter card from view */
            let c = this.view.starter.children[ 0 ];
            /* submit the move if we haven't already */
            if ( !c._game?.isMove )
            {
                c._game.isMove = true;
                /* submit move to server and animate the neutral stack hide while the server responds */
                this.submitMove( [ c._game.index ], this._animateHideNeutralStack().then( () => this._delay( 100 ) ) );
            }
        }
    }

    _checkDealMove = (
        vc = this.view.crib,
        ph = this.model.playerhand
    ) =>
    {
        /* check for moves if the model still has room */
        if ( ph.length > 4 )
        {
            /* get playerhand cards from view crib */
            let c = [ ...vc.children ].filter( c => ph.map( c => c.i ).includes( c._game.index ) && !c._game?.isMove );
            if ( c.length == 2 )
            {
                /* update the cards we're using */
                c.forEach( c =>
                {
                    /* mark this card as moved to ensure moves aren't repeated */
                    c._game.isMove = true;
                    /* remove value from cards in ui */
                    this.view.setCard( c, c._game.index, null, null );

                } );
                /* send indexes to server */
                this.submitMove( c.map( c => c._game.index ) );
            }
            else { this.onStateChanged() }
        }
    }

    _checkDrawMove = (
        ph = this.model.playerhand
    ) => {
        /* check for a draw card to submit to server */
        if ( !ph && this.view.playerhand.children.length === 1 )
        {
            /* get player's draw card from view */
            let c = this.view.playerhand.children[ 0 ];
            /* submit the move if we haven't already */
            if ( !c._game?.isMove )
            {
                c._game.isMove = true;
                this.submitMove( [ c._game.index ] );
            }
        }
    }

    /* bindings */
    bindRoute( handler ) { this.handleRoute = handler }
    bindSetGidDetail( handler ) { this.setGidDetail = handler }
    bindDropGameView( handler ) { this.dropGameView = handler }

    handleClickButton = (
        ev,
        c      = DragController.actives,
        stage  = this.model.stage,
        cp     = this.model.canplay,
        it     = this.model.isturn,
        winner = this.model.winner,
        score  = this.model.p1score
    ) => {
        /* disable button after press */
        this.view.button.disabled = true;

        /* confirm win/loss and end game */
        if ( winner != null )
        {
            this.submitMove( [ score?.s ?? 0 ], 0, 'end' );
        }
        else if ( [ 'draw1', 'deal1', 'starter1' ].includes( stage ) )
        {
            DragController.forceDrag( c, DragController.dragTarget );
        }
        else if ( [ 'play1' ].includes( stage ) ) { this._handleClickPlay() }
        else if ( [ 'draw2' ].includes( stage ) )
        {
            /* confirm end of round on server */
            this.submitMove(
                [ 0 ],
                /* animate the return of cards to the deck */
                this._delay( 150 )
                    .then( () => DragController.forceDrag(
                        [
                            this.view.playerhand.children[ 0 ],
                            this.view.opphand.children[ 0 ]
                        ],
                        this.view.neutral,
                        this.view.neutral.children[ 21 ]
                    ) )
                    .then( () => this._delay( 250 ) )
                    .then( () => this._animateHideNeutralStack( false ) )
                    .then( () => this._delay( 100 ) )
            );
        }
        else if ( [ 'count1' ].includes( stage ) ) { this._checkCountMove() }
    }

    _handleClickPlay = (
        c       = DragController.actives,
        cp      = this.model.canplay,
        ap      = this.model.allplay,
        ad      = this.model.alldiscard,
        confirm = this.model.confirm
    ) => {
        if ( !ap?.length && ad?.length && !confirm )
        {
            this.model.confirm = true;
            this.onStateChanged();
            this.onModelChanged();
        }
        if ( cp ) { DragController.forceDrag( c, DragController.dragTarget ) } else { this.submitMove( [ 0 ], 0 ); }
    }

    /* handle game interaction and context - dismiss menu, drop cards */
    handleGameFocus = ev =>
    {
        /* look for a button target */
        const isclick = [ ev.target.tagName, ev.target.parentNode.tagName, ev.target.parentNode.parentNode.tagName ].includes( 'BUTTON' );
        /* capture app focus at container */
        this.view.captureClassFocus( ev, 'show', ev.currentTarget.parentElement.parentElement, !isclick );
        /* drop actives if we didn't click anything */
        if ( !ev.target.classList.contains( 'candrag' ) && !isclick ) { this._dropFocus() }
    }

    _dropFocus = () => DragController.disableActives() || this.onStateChanged();

    /* refresh game */
    fetchGameState = ( gid = this.model.gid, cache = false ) =>
    {
        /* clear state if the gid is new */
        if ( gid != this.model.gid )
        {
            this.clear();
            /* set game id to model */
            this.model.gid = gid;
        }
        /* return promise that fulfills after new game state is loaded (model updates occur on separate chain) */
        return this._promise()
            /* pass gameloader through cache system if enabled */
            .then( () => cache && this._fetchCacheState() )
            /* request game state from server */
            .then( () => sfetch.json( sfetch.request( '/game/getGameState', { g: gid } ) ) )
            .then( o =>
            {
                /* check for successful response, and test for either new view or model update */
                if ( o.success && this._isModelUpdate( o ) )
                {
                    console.log( 'fetch: load game' );
                    /* update the local model */
                    this._updateModel( o );
                    /* and then trigger model change event to reset display */
                    this.onModelChanged();
                }
                /* return game state */
                return o;
            }
        )
    }

    /* attempt to load most recently saved gamestate */
    _fetchCacheState = () => this._promise().then( () =>
    {
        /* load cached game state */
        const cachestate = this.model.storeState;
        /* if a cache exists */
        if ( cachestate )
        {
            console.log( 'cache: load game' );
            /* update model from cache (skipcache to not save the cached data again) */
            this._updateModel( cachestate, true );
            /* and then trigger model change event to reset display */
            return this.onModelChanged();
        }
    } );

    /* initiate an update event with common flag settings */
    _startUpdate = () =>
    {
        /* set property to prevent interruptions */
        this.model.isupdating     = true;
        /* deactivate drag while game is updating */
        DragController.isOn       = false;
        /* remove dragTarget - it will be reset later */
        DragController.dragTarget = null;
    }

    /* end an update event to allow interactivity */
    _endUpdate = () => this.model.isupdating = false;

    /* save some live state info to persist across site reloads */
    _saveState = (
        stage    = this.model.stage,
        /* save state from opponent's hand if its active */
        oppmode  = this.model.oppmode,
        /* save state using crib hand */
        cribmode = this.model.countlevel == 2,
        /* cards from view */
        vcards   = oppmode ? this.view.opphand : this.view.playerhand,
        /* cards from model */
        mcards   = cribmode ? this.model.cribhand : oppmode ? this.model.opphand : this.model.playerhand,
        /* exclude playerplay from state object if necessary */
        mexclude = this.model.playerplay?.length != 4 ? this.model.playerplay : [],
        /* actives collection if the dragQuota permits it */
        actives  = ( DragController.dragQuota ?? 1 ) > 0 ? DragController.actives : null,
        /* all draggable cards */
        candrags = DragController.canDrags
    ) =>
    {
        /* calculate a model's natural order */
        const mOrder = mcards?.filter( c => !mexclude?.map( c => c.i ).includes( c.i ) ).map( c => c.i ) ?? [];
        /* calculate current state order */
        const sOrder = Array.from( vcards.children ?? [] ).filter( el => el?._game?.index != null ).map( el => el._game.index );

        /* only save the visual order if:
         * cards exist in state
         * the state is a subset of full model order
         * the state is not equal to natural order
         */
        this.model.liveOrder = vcards.children?.length && this.model.isArrSubset( sOrder, mOrder ) && !this.model.isArrEqual( sOrder, mOrder, true ) ? sOrder : null;

        /* only save the actives object if:
         * we have any interaction enabled elements in view
         */
        this.model.liveActives = candrags?.length ? Array.from( actives ?? [] ).map( el => el._game.index ) : null;

        /* clear count if it's not necessary */
        if ( stage != 'count1' ) { this.model.liveCount = null }
    }

    /* bind a throttled wrapper of fetchGameState - will wait to run until timeout and non-drag conditions are met */
    _bindThrottleFetchGameState = ( ) => this._throttleFetchGameState = this._throttle(
        /* call the function */
        this.fetchGameState,
        /* function can be called at most every n milliseconds */
        3000,
        /* wait until drag operations and controller updating methods are not running */
        () => !DragController.isActive && !this.model.isupdating
    );

    /* detect model changes from server state object */
    _isModelUpdate = ( s, gid = this.model.gid, timestamp = this.model.timestamp ) => !( s.g == gid && s.t == timestamp );

    /* update the local state with a state object from server
     * waits to resolve
     */
    _updateModel = ( s, skipcache = false ) =>
    {
        /* save game object unless skipcache is set */
        if ( !skipcache ) { this.model.storeState = s }
        /* track the start of blocking update operations */
        this._startUpdate();

        this.model.name       = s.name;
        this.model.color      = s.se.color;
        this.model.winner     = s?.gr;

        /* reset confirm */
        this.model.confirm    = false;

        /* scores */
        this.model.p1score    = s.sc.p ?? { b: [] };
        this.model.p2score    = s.sc.o ?? { b: [] };

        /* basic game state */
        this.model.iscrib     = s.ic;
        this.model.isturn     = s.it;
        this.model.timestamp  = s.t;
        this.model.stage      = s.st;

        /* optional properties */
        /* draw */
        this.model.drawresult       = s?.d?.dr;
        /* deal */
        this.model.playerhand       = s?.d?.ph;
        this.model.opphand          = s?.d?.oh;
        this.model.playercrib       = s?.d?.ch ? s?.d?.ch[ 0 ] : null;
        this.model.oppcrib          = s?.d?.ch ? s?.d?.ch[ 1 ] : null;
        /* starter */
        this.model.starter          = s?.d?.s;
        /* play  */
        this.model.playerplay       = s?.p?.pp;
        this.model.oppplay          = s?.p?.op;
        this.model.allplay          = s?.p?.ap;
        this.model.alldiscard       = s?.p?.ad;
        this.model.canplay          = s?.p?.cp;
        this.model.isgo             = s?.p?.ig;
        /* count details */
        this.model.countlevel       = s?.c?.l;
        this.model.counttotal       = s?.c?.ct;
        this.model.playercount      = s?.c?.phc?.c;
        this.model.oppcount         = s?.c?.ohc?.c;
        this.model.playercountorder = s?.c?.phc?.o;
        this.model.oppcountorder    = s?.c?.ohc?.o;

        /* trigger statechange event */
        this.onStateChanged();
    }

    /* send move to server */
    submitMove = (
        /* array of values to submit - meaning varies by stage */
        v         = [ 0 ],
        /* a promise that resolves before local state can be updated */
        prom      = this._delay( 150 ),
        /* the game state we're submitting values on */
        stage     = this.model.stage,
        /* the game gid to submit move for */
        gid       = this.model.gid,
        /* the game timestamp we're submitting a turn for - if this is out of date move may be cancelled */
        timestamp = this.model.timestamp
    ) => {
        /* set update flags */
        this._startUpdate();
        /* send move to server and receive response */
        return sfetch.json( sfetch.request( '/game/submitMove', { g: gid, st: stage, t: timestamp, v: v }, 'post' ) )
        .then( j =>
        {
            /* check for successful response */
            if   ( j.success )
            {
                /* redirect to result page if necessary */
                if ( j?.st?.st == 'end' )
                {
                    this.dropGameView();
                    this.handleRoute( '/r/' + gid, true );
                    return false;
                }
                /* drop any active cards in model, the situation has changed */
                this.model.liveActives = null;
                /* update local model after prom resolves (or immediately, if promise is null / already resolved) */
                return this._promise().then( () => prom ).then( () => this._updateModel( j.st ) );
            }
            /* redraw screen if we didn't get what we expected */
            else { return this.onModelChanged() }
        } )
        /* run pending animations */
        .then( () =>
        {
            if (
                this.model.isRequire
                || this.model.p1score.b?.filter( i => i[ 2 ] ).length
                || this.model.p2score.b?.filter( i => i[ 2 ] ).length
            )
            { this.onModelChanged() }
        } )
        .then( () => this.setGidDetail( this.model.gid, null, null, this.model.p1score.s, this.model.p2score.s, this.model.timestamp ) )
    }

    /* return a blank game view */
    createGameView( )
    {
        /* create view */
        const view = this.view.createGameView(
            ButtonController.create(
                'table',
                { id: 'action-btn', disabled: 'disabled', tabindex: 0, onclick: this.handleClickButton }
            )
        );
        /* set gameview to draggable area */
        DragController.screen = view;
        /* return new view */
        return view;
    }

    /* reset the model and view */
    clear()
    {
        /* clear scoreboard */
        this._p1score.clear();
        this._p2score.clear();
        /* clear game board */
        this.view.displayGameView();
        /* clear model */
        this.model.clear();
    }

    /* call dependent sync functions */
    sync( gid = null, t = null )
    {
        /* only sync if gid was not specified */
        if (
            /* sync the loaded gid if no gid was specified */
            ( gid == null && this.model.gid && document.body.contains( this.view.view ) ) ||
            /* or if a matching gid was passed with null or more recent timestamp */
            ( gid && this.model.gid == gid && ( !t || ( t > this.model.timestamp ) ) )
        )
        {
            this._throttleFetchGameState( )
        }
    }

}
