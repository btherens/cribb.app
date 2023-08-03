/* imports */
import Controller        from './controller.js';
import LobbyModel        from '../model/lobbymodel.js';
import LobbyView         from '../view/lobbyview.js';

import sfetch            from '../sfetch.js';
import QRCodeStyling     from '../vendor/qr-code-styling/qr-code-styling.js';
import AvatarController  from './avatarcontroller.js';
import ListboxController from './listboxcontroller.js';
import ButtonController  from './buttoncontroller.js';

export default class LobbyController extends Controller
{
    constructor( model = new LobbyModel, view = new LobbyView )
    {
        super( model, view );

        /* avatar interface */
        this.avatar = new AvatarController( );

        this.view.bindUpdateColor( this.handleUpdateColor );
        this.view.bindUpdateRank( this.handleUpdateRank );
        //this.view.bindClickAccept( this.handleClickAccept );
        this.model.bindOnModelChanged( this.onModelChanged );

        /* bind debounce function */
        this._applydesetLobbySetting();
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        gid        = this.model.gid,
        avatar     = this.model.avatar,
        name       = this.model.name,
        liveColor  = this.model.liveColor,
        liveRank   = this.model.liveRank,
        storeColor = this.model.storeColor,
        storeRank  = this.model.storeRank,
        pstat      = this.idStat(),
        ostat      = this.model.stat,
        /* lobby is in newgame mode if no opponent is attached */
        newmode    = !avatar
    ) => {
        /* display blank screen */
        this.view.displayLobby();
        /* update view elements */
        this.view.checkColor = liveColor;
        this.view.checkRank  = liveRank;
        /* exit now if we don't have a game id loaded */
        if ( !gid ) { return }
        /* set header accordingly */
        this.view.header.textContent = newmode ? 'new game'   : 'challenge!';
        this.view.button.textContent = newmode ? 'challenge!' : 'begin game';
        /* present qr if newmode */
        if ( newmode ) { this._displayQr() }
        /* render accept screen variant */
        else
        {
            this.view.displayAccept(
                ListboxController.createListBox(
                    this.avatar.createStaticAvatar( avatar ),
                    !storeColor,
                    name,
                    storeRank,
                    1,
                    storeRank ? ListboxController.tableSet( 'best streak', ( ostat?.maxstreak ?? '--' ).toString() ) : null,
                    storeRank ? ListboxController.tableSet( 'cur. streak', ( ostat?.streak    ?? '--' ).toString() ) : null,
                    1
                ),
                ListboxController.createListBox(
                    this.idAvatar(),
                    storeColor,
                    this.idName(),
                    storeRank,
                    1,
                    storeRank ? ListboxController.tableSet( 'best streak', ( pstat?.maxstreak ?? '--' ).toString() ) : null,
                    storeRank ? ListboxController.tableSet( 'cur. streak', ( pstat?.streak    ?? '--' ).toString() ) : null,
                    1
                )
            )
        }
    }

    handleUpdateColor = ( e ) =>
    {
        this.model.liveColor = e.target.checked;
        this._displayQr();
    }
    handleUpdateRank = ( e ) =>
    {
        this.model.liveRank = e.target.checked;
        this._displayQr();
    }

    updateSetting = (
        newmode    = !this.model.avatar,
        liveColor  = this.model.liveColor,
        liveRank   = this.model.liveRank,
        storeColor = this.model.storeColor,
        storeRank  = this.model.storeRank
    ) => {
        /* update game settings on server if necessary */
        if ( newmode && liveColor != storeColor || liveRank != storeRank )
        {
            this.desetLobbySetting( { color: liveColor, rank: liveRank } )
        }
        /* call debounced method with null arguments to cancel any pending server updates */
        else
        {
            this.desetLobbySetting( null );
        }
    }

    /* disable all inputs to prevent issues */
    disableInputs = ( disable = true ) =>
    {
        /* disable switches */
        this.view.inputRank.children[ 0 ].disabled  = disable;
        this.view.inputColor.children[ 0 ].disabled = disable;
        this.view.button.disabled = disable;
    }

    handleClickButton = (
        url     = this.model.url,
        newmode = !this.model.avatar,
        gid     = this.model.gid
    ) => {
        /* trigger browser share sheet */
        if   ( newmode ) { navigator.share( { title: 'share this link with a friend!', url: url } ).then( () => {} ).catch( () => {} ) }
        /* send begin game command to server and route to the game upon success */
        else { sfetch.json( sfetch.request( '/game/beginGame', { gid: gid }, 'post' ) ).then( j => j && this.handleRoute( '/g/' + gid ) ) }
    }

    _applydesetLobbySetting()
    {
        this.desetLobbySetting = this._debounce( () => this.setLobbySetting(), 1000 )
    }

    setLobbySetting = ( obj = { gid: this.model.gid, color: this.model.liveColor, rank: this.model.liveRank } ) =>
    {
        if ( obj )
        {
            sfetch.json( sfetch.request( '/game/setLobbySetting', obj, 'post' ) ).then( j =>
            {
                /* save name from result */
                if ( j )
                {
                    this.model.storeColor = j.color;
                    this.model.storeRank = j.rank;
                    /* set these updates to other local models */
                    this.setGidDetail( obj.gid, !j.color, j.rank );
                }
            } )
        }
    }

    /* return a qr object with encoded url and colors */
    _createQrObj = (
        url    = this.model.url,
        colors
    ) => new QRCodeStyling( {
        /* generate large image for easier scaling */
        width:  2000,
        height: 2000,
        type: 'canvas',
        margin: 0,
        data: url,
        dotsOptions: {
            type: 'dots',
            color: colors[ 0 ]
        },
        cornersSquareOptions: {
            type: 'extra-rounded',
            color: colors[ 1 ]
        },
        cornersDotOptions: {
            type: 'dot',
            color: colors[ 2 ]
        },
        backgroundOptions: {
            color: colors[ 3 ]
        }
    } );

    /* render a new qr code */
    _displayQr = (
        url       = this.model.url,
        liveColor = this.model.liveColor,
        liveRank  = this.model.liveRank
    ) => {
        const dom    = this.view.qr;
        /* get colors from css stylesheet */
        const colors = [
            '--pegholecolor',
            liveRank  ? '--tablecolor'   : '--pegholecolor',
            liveColor ? '--cardredcolor' : '--cardcolor',
            '--btn-control-color'
        ].map( c => getComputedStyle( document.body ).getPropertyValue( c ).trim() );
        /* create object from options */
        const qr     = this._createQrObj( url, colors );
        /* clear the qr code's parent */
        dom.textContent = '';
        /* write qr code to view: call qr object append method to append the qr code to dom */
        qr.append( dom );
        /* fade-in qr (if not visible already) */
        setTimeout( () => this.view.showQr = true, 200 );

        /* disable challenge button if we can't use the share method */
        if ( !navigator.share ) { this.view.button.disabled = true }

        /* update settings on server (if necessary) */
        this.updateSetting();
    }

    /* bindings */
    bindRoute(        handler ) { this.handleRoute   = handler }
    bindPopMenu(      handler ) { this.handlePopMenu = handler }
    bindSetGidDetail( handler ) { this.setGidDetail  = handler }
    bindIdName(       handler ) { this.idName        = handler }
    bindIdAvatar(     handler ) { this.idAvatar      = handler }
    bindIdStat(       handler ) { this.idStat        = handler }

    fetchLobby = ( gid = this.model.gid ) =>
    {
        /* prepare header if we're expecting a new game */
        if ( !gid ) { this.view.header.textContent = 'new game' }
        /* request a lobby from server */
        return sfetch.json( sfetch.request( '/game/getLobby', { gid: gid ?? '' } ) ).then( j =>
        {
            /* check for return object */
            if ( j )
            {
                if ( j.type == 'invite' )
                {
                    this.model.type       = j.type;
                    this.model.name       = j?.name;
                    this.model.avatar     = j?.avatar;

                    this.model.gid        = j.gid;
                    this.model.storeColor = j.se.color;
                    this.model.storeRank  = j.se.rank;
                    this.model.stat       = j.stat;
                    //this.setLobbyType();
                    this.onModelChanged();
                }
            }
            return j;
        } )
    }

    /* return a new invite view */
    createView( newlobby = false, oldchallenge = !!this.model.avatar )
    {
        /* create view */
        const view = this.view.createLobbyView(
            ButtonController.create(
                'board topmargin',
                { onclick: () => this.handleClickButton() },
                'challenge!'
            )
        );
        /* force clear the model if we're loading a new lobby and the previous lobby is an accept view */
        if ( newlobby && oldchallenge ) { this.clear() }
        /* preload lobby if view is new */
        if ( newlobby )
        {
            this.onModelChanged();
            this.disableInputs();
        }
        /* return view */
        return view;
    }

    clear()
    {
        this.model.gid = ''
    }

    /* call dependent sync functions */
    sync( gid = null )
    {
        /* use currently loaded gid if no gid was specified */
        if ( gid == null && this.model.gid && document.body.contains( this.view.view ) ) { gid = this.model.gid }
        /*  refresh the lobby's state from server */
        if ( this.model.gid == gid ) { this.fetchLobby( gid ) }
    }

    get header() { return this.view.header }

}