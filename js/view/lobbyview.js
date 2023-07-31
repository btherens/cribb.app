/* imports */
import View from './view.js';

export default class LobbyView extends View
{
    constructor()
    {
        super();
    }

    /* return a lobby view */
    createLobbyView( button )
    {
        this.header  = this.create( 'span', { class: 'pd-header' }, 'new game' );
        this.view    = this.create( 'div', { class: 'flex-container dynamic fullscreen-flex-all' } );
        this._button = button;
        return this.create( 'div', { class: 'flex-container column', onclick: e => e.stopPropagation() }, [ this.header, this.view ] );
    }

    /* display the lobby screen */
    displayLobby()
    {
        /* spawn new qr code div */
        this.qr     = this.create( 'div', { class: ( 'qr-container' + ( this.showQr ? ' visible' : '' ) ) } );
        /* create inputs */
        this.inputColor = this._createLabelContainer( 'peg color', this.create( 'input', {
            type: 'checkbox',
            class: 'color',
            onpointerdown: e => e.stopPropagation(),
            oninput: this.handleUpdateColor
        } ) );
        this.inputRank = this._createLabelContainer( 'rankings', this.create( 'input', {
            type: 'checkbox',
            onpointerdown: e => e.stopPropagation(),
            oninput: this.handleUpdateRank
        } ) );

        /* content boxes */
        this.box1 = this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
            this.create( 'div', { class: 'fullscreen-flex-all'   } ),
            this.qr,
            this.create( 'div', { class: 'fullscreen-flex-wide'  } )
        ] );
        this.box2 = this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
            this.create( 'div', { class: 'fullscreen-flex-all'  } ),
            this.inputColor,
            this.inputRank,
            this._button
        ] );

        /* clear view and append array */
        this._nest( this.view, [ this.box1, this.box2 ], true );
    }

    /* display player/opponent info with game settings and colors */
    displayAccept(
        oppbox,
        playbox
    )
    {
        /* disable checkbox control */
        this.inputRank.children[ 0 ].disabled = true;
        /* replace contents of box1 with opponent listbox and disabled rank checkbox */
        this._nest(
            this.box1,
            [
                this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                oppbox,
                this.create( 'div', { class: 'fullscreen-flex-all' } ),
                this.inputRank
            ],
            true
        );
        /* replace box2 contents with player listbox and button */
        this._nest(
            this.box2,
            [
                this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                playbox,
                this.create( 'div', { class: 'fullscreen-flex-all' } ),
                this._button
            ],
            true
        );
        /* remove top margin from button now that a flex container exists between button and listbox */
        this.button.classList.remove( 'topmargin' );
    }

    /* create label container with event passthru to inner checkbox */
    _createLabelContainer( label, nest )
    {
        return this.create( 'label', {
            class: 'tactile splitmargin board',
            /* toggle input value by clicking on label */
            onpointerdown: e =>
            {
                /* changes apply to container's inner input */
                const input = e.currentTarget.children[ 0 ];
                /* ignore if input is disabled */
                if ( input.disabled ) return;
                /* capture event */
                e.stopPropagation();
                /* toggle input value++ */
                input.value = +input.value + +input.step <= input.max ? +input.value + +input.step : input.min;
                /* trigger oninput */
                input.dispatchEvent( new Event( 'input' ) );
            }
        },
        [ nest, this.create( 'div', 0, label ) ] )
    }

    /* control qr fade-in/out */
    get showQr()    { return !!this.qr?.classList.contains( 'visible' ) }
    set showQr( b ) { this.qr.classList.toggle( 'visible', !!b ) }

    get button() { return this._button.children[ 0 ] }

    /* inputs */
    get checkColor()    { return this.inputColor?.children[ 0 ].checked }
    set checkColor( b ) { this.inputColor.children[ 0 ].checked = !!b }
    get checkRank()     { return this.inputRank?.children[ 0 ].checked }
    set checkRank( b )  { this.inputRank.children[ 0 ].checked = !!b }

    /* bindings */
    bindUpdateColor( handler ) { this.handleUpdateColor = handler }
    bindUpdateRank( handler  ) { this.handleUpdateRank  = handler }
    bindClickButton( handler ) { this.handleClickButton = handler }

}
