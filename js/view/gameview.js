/* imports */
import View from './view.js';

export default class GameView extends View
{
    constructor()
    {
        super();
    }

    bindClickButton( handler ) { this.handleClickButton = handler }
    bindGameFocus(   handler ) { this.handleGameFocus   = handler }

    /* create new view definition */
    createGameView( button )
    {
        /* establish required elements */
        this._header    = this.create( 'span'  , { class: 'pd-header mono' } );
        this._button    = button;
        /* a span that holds "n / 31" text during play stage */
        this.playcount   = this.create( 'span' );
        /* a span that holds running list of scores during count stage */
        this.scorelist   = this.create( 'span' );

        /* define gameview */
        this.view = this.create( 'div', { class: 'game-container', onpointerdown: this.handleGameFocus }, this._header );
        /* return view */
        return this.view;
    }

    /* refresh (blank) gameview */
    displayGameView()
    {
        /* create live dom elements */
        this.opphand    = this.create( 'ul', { id: 'opphand', class: 'cards cardspread' } );
        this.starter    = this.create( 'ul', { id: 'startercard', class: 'cards cardspread stack ontable' } );
        this.neutral    = this.create( 'ul', { id: 'neutralcards', class: 'cards cardspread' } );
        this.crib       = this.create( 'ul', { id: 'cribcards', class: 'cards cardstack ontable' } );
        this.playerhand = this.create( 'ul', { id: 'playerhand', class: 'cards cardfan' } );
        /*  */
        this.neutraltext = this.create( 'div', { class: 'floattext-container neutraltext' } );


        /* game view structure */
        const a = [
            this.create( 'div', { id: 'opp-block' }, [
                this.create( 'div', { class: 'floattext-container' }, this.opphand )
            ] ),
            this.create( 'div', { id: 'neutral-block', class: '' }, [
                this.neutraltext,
                this.create( 'div', {  class: 'cardsrow' }, [
                    this.create( 'div', 0, this.starter ),
                    this.create( 'div', 0, this.neutral ),
                    this.create( 'div', 0, this.crib )
                ] ),
                this.create( 'div' )
            ] ),
            this.create( 'div', { id: 'plyr-block' }, [
                this.create( 'div' ),
                this.create( 'div', { class: 'floattext-container' }, this.playerhand ),
                this.create( 'div', { id: 'context-block' , class: '' }, this._button )
            ] )
        ];

        /* append game structure to view */
        const v = this.view;
        v.textContent = '';
        this._nest( v, a );
    }

    /*
     * return a card with included index
     * pass a value to make it a face card
     */
    createCard( index, suit = null, value = null, offset = null )
    {
        /* create card element */
        const card = this.create( 'li', { tabindex: 0 } );
        /* assign properties */
        this.setCard( card, index, suit, value, offset );
        return card;
    }

    /* apply card suit/value */
    setCard( el, index, suit, value, offset = null )
    {
        /* set class definition */
        let c = 'card';
        c += suit != null && value != null ? ` s${suit} c${value}` : ' facedown';
        if ( offset != null ) { c += offset ? ' up' : ' down' }

        el.setAttribute( 'class', c );
        el._game = { index: index, suit: suit, value: value };
    }

    /* return descriptive text span with suit color */
    createCardSpan( s, v )
    {
        let str = '';
        switch ( true )
        {
            case v ==  0: str += 'A'; break;
            case v  < 10: str += ( v + 1 ).toString(); break;
            case v == 10: str += 'J'; break;
            case v == 11: str += 'Q'; break;
            case v == 12: str += 'K'; break;
        }
        switch ( s )
        {
            case 0: str += '♠'; break;
            case 1: str += '♥'; break;
            case 2: str += '♦'; break;
            case 3: str += '♣'; break;
        }
        return this.create( 'span', { class: `cardtext s${s}` }, str );
    }

    /* return score text with color style
     *    t: text
     * type: 0 is none, 1 is player, 2 is opponent, 3 is soft
     *  inv: invalid - use strikethrough style (t/f)
     */
    createScoreSpan = ( t, type = 0, inv = false, clickhandler ) =>
    {
        const props = {
            class: ( inv ? 'invalid ' : '' ) + ( type ? ( type == 3 ? 'soft' : ( ( type == 2 ? !this.color : this.color ) ? 'blue' : 'red' ) ) : '' )
        };
        /* bind click events if used */
        if ( clickhandler )
        {
            props.onclick = clickhandler;
            /* prevent pointerdown from bubbling before click can */
            props.onpointerdown = e => e.stopPropagation();
        }
        return this.create(
            'span',
            props,
            t
        );
    } 

    /* clear an element before nesting new children */
    display( el, a )
    {
        this._nest( el, a, true )
    }

    /* display a play count and set ip = true to set player color */
    updatePlayCount( v, ip = false, iv = true )
    {
        const pc = this.playcount;
        pc.textContent = v;
        /* set or remove color */
        pc.classList.toggle( this.color ? 'blue' : 'red', !!ip );
        /* set or remove invalid appearance */
        pc.classList.toggle( 'invalid', ip ? !iv : false );
    }

    displayFloatTextNeutral = ( t, show = false ) => this.floattextneutral = this._displayFloatText( t, this.neutraltext, show );

    /* opp hand floattext */
    displayFloatTextOpp = ( t, show = false ) => this.floattextopp = this._displayFloatText( t, this.opphand.parentNode, show );

    /* clear the floating text */
    clearFloatTextOpp = () => this.floattextopp?.parentNode && this.floattextopp.parentNode.removeChild( this.floattextopp );

    /* player hand floattext */
    displayFloatTextPlayer = ( t, show = false ) => this.floattextplayer = this._displayFloatText( t, this.playerhand.parentNode, show );

    /* clear the floating text */
    clearFloatTextPlayer = () => this.floattextplayer?.parentNode && this.floattextplayer.parentNode.removeChild( this.floattextplayer );

    /* display t in float element above el and hide if show is false */
    _displayFloatText = ( t, el, show = false ) =>
    {
        /* detect string length */
        const len   = [ ...t ].reduce( ( p, c ) => p + ( c?.tagName == 'SPAN' ? c.textContent.length : c.length ?? 0 ), 0 );
        /* create floattext span and apply wide styles if necessary */
        const float = this.create( 'span', { class: 'floattext' + ( 21 < len ? ' wide5' : 16 < len ? ' wide4' : 10 < len ? ' wide3' : 5 < len ? ' wide2' : 2 < len ? ' wide1' : '' ) + ( show ? '' : ' hide' ) }, t );
        //setTimeout( () => this._nest( float, t ), 300 );
        /* append child to el */
        this._nest( el, float );
        return float;
    }

    /* use margin animations in neutral deck */
    get neutralanimate() { return this.neutral?.classList.contains( 'animatemargin' ) }
    set neutralanimate( b ) { this.neutral?.classList.toggle( 'animatemargin', !!b ) }

    /* stack neutral card spread */
    get neutralstack() { return this.neutral.classList.contains( 'stack' ) }
    set neutralstack( b ) { this.neutral.classList.toggle( 'stack', !!b ) }

    get showCrib() { return !this.crib.parentNode.classList.contains( 'hide' ) }
    set showCrib( b ) { this.crib.parentNode.classList.toggle( 'hide', !b ) }

    get showNeutral() { return !this.neutral.parentNode.classList.contains( 'hide' ) }
    set showNeutral( b ) { this.neutral.parentNode.classList.toggle( 'hide', !b ) }

    get showFloatTextNeutral() { return this.floattextneutral ? !this.floattextneutral.classList.contains( 'hide' ) : false }
    set showFloatTextNeutral( b ) { this.floattextneutral.classList.toggle( 'hide', !b ) }

    get showFloatTextOpp() { return this.floattextopp ? !this.floattextopp.classList.contains( 'hide' ) : false }
    set showFloatTextOpp( b ) { this.floattextopp.classList.toggle( 'hide', !b ) }

    get showFloatTextPlayer() { return this.floattextplayer ? !this.floattextplayer.classList.contains( 'hide' ) : false }
    set showFloatTextPlayer( b ) { this.floattextplayer.classList.toggle( 'hide', !b ) }

    get showFullOppHand() { return this.playerhand.classList.contains( 'cardspread' ) && this.opphand.classList.contains( 'cardfan' ) }
    set showFullOppHand( b )
    {
        this.playerhand.classList.toggle( 'cardfan',    !b  );
        this.playerhand.classList.toggle( 'cardspread', !!b );
        this.opphand.classList.toggle(    'cardfan',    !!b );
        this.opphand.classList.toggle(    'cardspread', !b );
    }

    /* move neutral text to right portion of screen in some layouts */
    get pinNeutraltext() { return this.neutraltext.classList.contains( 'pin' ) }
    set pinNeutraltext( b ) {  this.neutraltext.classList.toggle( 'pin', !!b ) }

    /* return button inside container */
    get button() { return this._button.children[ 0 ] }

    /* button prompt text */
    get prompt() { return this.button.textContent }
    set prompt( s ) { if ( s instanceof Array ) { this.display( this.button, s ) } else { this.button.textContent = s } }

    /* game header */
    get header() { return this._header.textContent }
    set header( s ) { this._header.textContent = s }

    /* opponent color */
    get color() { return this._header.classList.contains( 'red' ) }
    set color( b ) { this._header.classList.add( 'color' ); this._header.classList.toggle( 'red', !!b ); }

    /* crib type - ours, theirs, none */
    get cribtype() { return this.view.classList.contains( 'player-crib' ) ? 1 : ( this.view.classList.contains( 'opponent-crib' ) ? 2 : 0 ) }
    set cribtype( v )
    {
        if ( v == 1 )
        {
            this.view.classList.add( 'player-crib' );
            this.view.classList.remove( 'opponent-crib' );
        }
        else if ( v == 2 )
        {
            this.view.classList.remove( 'player-crib' );
            this.view.classList.add( 'opponent-crib' );
        }
        else if ( v == 0 )
        {
            this.view.classList.remove( 'player-crib' );
            this.view.classList.remove( 'opponent-crib' );
        }
    }

}
