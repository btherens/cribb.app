/* imports */
import Controller         from './controller.js';
import GameListModel      from '../model/gamelistmodel.js';
import GameListView       from '../view/gamelistview.js';

import sfetch             from '../sfetch.js';
import AvatarController   from './avatarcontroller.js';
import ListboxController  from './listboxcontroller.js';
import SvgCharController  from './svgcharcontroller.js';

export default class GameListController extends Controller
{
    constructor( model = new GameListModel, view = new GameListView )
    {
        super( model, view );

        /* avatar interface */
        this.avatar = new AvatarController( );

        this.model.bindOnModelChanged( this.onModelChanged );
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        list = this.model.list
    ) => {
        /* update list view */
        if ( list != null && this.view.list )
        {
            this.view.displayList( list.filter( o => o.opp ).map( this._createlistBox ) )
            /* refresh scroll state */
            this.refreshScroll();
        }
        this.enableButton( list?.filter( o => o.opp ).length );
    }

    _createlistBox = listItem => ListboxController.createListBox(
        /* avatar if available */
        listItem.opp ? this.avatar.createStaticAvatar( listItem.opp.avatar ) : null,
        /* colors to use based on game settings and which player you are */
        listItem.se.color,
        listItem.opp?.name ?? 'open invite',
        /* is game ranked */
        listItem.se.rank,
        /* set isnew flag */
        listItem.it,
        /* include scores */
        listItem.r ? ListboxController.tableSet( 'them', listItem.opp.score[ 1 ].toString() ) : null,
        listItem.r ? ListboxController.tableSet( 'you',  listItem.opp.score[ 0 ].toString() ) : null,
        0,
        /* clickhandler */
        null,
        /* include open overlay */
        ListboxController.createListOverlay(
            null,
            ListboxController.tableSet(
                'archive',
                SvgCharController.svg( 'delete' ),
                {
                    class: 'red',
                    onclick: ev =>
                    {
                        ev.stopPropagation();
                        this._clickArchive( 
                            ev.currentTarget.parentNode.parentNode.parentNode.parentNode,
                            () => this.hideGame( listItem.gid ).then( () => this.closeGameByGid( listItem.gid ) )
                        );
                    }
                }
            ),
            ListboxController.tableSet(
                'play',
                SvgCharController.svg( 'action-icon' ),
                {
                    class: 'green',
                    onclick: ev =>
                    {
                        ev.stopPropagation();
                        this._closeAll();
                        this.openGame( listItem.gid, listItem.r );
                    }
                }
            ),
            ev =>
            {
                ev.stopPropagation();
                this._closeAll();
                listItem.r ? this.openGameStatus( listItem.gid ) : this.openGame( listItem.gid, listItem.r )
            }
        )
    );

    _closeAll = () =>
    {
        const c     = 'show';
        const shows = this.view.list.getElementsByClassName( c );
        while ( shows[ 0 ] ) { shows[ 0 ].classList.remove( c ) }
    }

    _clickArchive = ( listbox, callback ) =>
    {
        /* return now if we have a second overlay already */
        if ( listbox.getElementsByClassName('overlay')[ 1 ] ) return;

        const overlay = ListboxController.createListOverlay(
            'archive?',
            ListboxController.tableSet(
                'cancel',
                'X',
                {
                    class: 'red',
                    onclick: () => { overlay.classList.remove( 'show' ); overlay.onshowloss(); }
                }
            ),
            ListboxController.tableSet(
                'confirm',
                '✓',
                {
                    class: 'green',
                    onclick: () =>
                    {
                        listbox.classList.add( 'delete' );
                        callback();
                    }
                }
            )
        );
        overlay.onshowloss = () => this._delay( 120 ).then( () => overlay.remove() );
        listbox.appendChild( overlay );
        this._delay( 10 ).then( () => overlay.classList.add( 'show' ) );
    }

    /* run updates after model changes */
    onGidChanged = (
        gid,
        name,
        isinvite,
        isturn,
        t
    ) => {
        /* test event for a game to trigger on */
        if ( gid && name )
        {
            /* call general sync functions for this game */
            this.syncGid( gid, t );
            /* notify user if push service is not active, it is player's turn, and the game is not in foreground */
            if ( !this.model.pushAvailable && !isinvite && isturn && window.location.pathname.split( '/' ).filter( n => n ).pop() != gid )
            {
                /* define notification */
                const action = isinvite ? ' has accepted!' : ' has moved';
                /* path to link depending upon game state */
                const uri    = isinvite ? 'i' : 'g';
                /* trigger notifications in app */
                this.notify( [ this.view.create( 'span', { class: 'mono' }, name ), action ], `/${uri}/${gid}` );
            }
        };
    }

    /* route to game when clicked */
    openGame       = ( gid, isgame ) => this.handleRoute( '/' + ( isgame ? 'g' : 'i' ) + '/' + gid );
    /* route to game status screen */
    openGameStatus = ( gid ) => this.handleRoute( '/s/' + gid );

    /* bindings */
    bindRoute( handler ) { this.handleRoute = handler }
    bindPopMenu( handler ) { this.handlePopMenu = handler }
    bindSyncGid( handler ) { this.syncGid = handler }
    bindCloseGameByGid( handler ) { this.closeGameByGid = handler }
    bindRefreshScroll( handler ) { this.refreshScroll = handler }
    bindNotify( handler ) { this.notify = handler }
    bindSetAppBadge( handler ) { this.setAppBadge = handler }
    bindVerifyVersion( handler ) { this.verifyVersion = handler }
    /* enable/disable the main menu gamelist button */
    bindEnableButton( handler ) { this.enableButton = handler }
    /* true if push subscription is active in client */
    bindIsPushSubscribe( handler ) { this.isPushSubscribe = handler }

    /* refresh gamelist */
    fetchGamelist = ( ) => sfetch.json( sfetch.request( '/game/getGames' ) ).then( this._handleGamelistResponse );
    /* hide a game */
    hideGame = ( gid )  => sfetch.json( sfetch.request( '/game/hideGame', { g: gid }, 'post' ) ).then( this._handleGamelistResponse );

    _handleGamelistResponse = ( response ) =>
    {
            /* verify local and server services match */
            this.verifyVersion( response?.v );
            const list = response?.l;
            /* update push service availability flag */
            this.model.pushAvailable = this.isPushSubscribe();
            /* update model and trigger events if list object was returned */
            if ( list ) { this._updateModel( list ) }
            /* otherwise set list to null */
            else { this.model.list = null }
    }

    _updateModel = ( list ) =>
    {
        /* filter response for new changes and trigger events */
        list.filter( o => o.t > ( this.model.list?.filter( n => n.gid == o.gid )[ 0 ]?.t ?? o.t ) ).forEach( g => this.onGidChanged( g.gid, g.opp?.name, !g.r, g.it, g.t ) );
        /* update app badge with count of open games waiting for player turn */
        this.setAppBadge( list.filter( o => o.it ).length );
        /* set list to model */
        this.model.list = list;
    }

    /* return a new list view */
    createListView( )
    {
        /* create view */
        const view = this.view.createListView();
        /* update live fields */
        this.onModelChanged();
        return view;
    }

    /* update a specific gid with detail from other model */
    setGidDetail = ( gid, color, rank, s1, s2, t ) =>
    {
        /* look through list and update the proper gid */
        this.model.list?.filter( l => l.gid == gid ).forEach( l =>
            {
                /* update any included properties */
                if (          color != null ) { l.se.color       = color }
                if (          rank  != null ) { l.se.rank        = rank  }
                if (          t     != null ) { l.t              = t     }
                if ( l.opp && s1    != null ) { l.opp.score[ 0 ] = s1    }
                if ( l.opp && s2    != null ) { l.opp.score[ 0 ] = s2    }
                /* trigger model update */
                this.onModelChanged();
            }
        )
    }

    /* call dependent sync functions */
    sync()
    {
        this.fetchGamelist()
    }

}