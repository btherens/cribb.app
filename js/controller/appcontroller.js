/* imports */
import Controller         from './controller.js';
import AppModel           from '../model/appmodel.js';
import AppView            from '../view/appview.js';

import ServiceController  from './servicecontroller.js';
import PulldownController from './pulldowncontroller.js';
import IdentityController from './identitycontroller.js';
import MainmenuController from './mainmenucontroller.js';
import LobbyController    from './lobbycontroller.js';
import GameListController from './gamelistcontroller.js';
import GameController     from './gamecontroller.js';
import AboutController    from './aboutcontroller.js';
import ModalController    from './modalcontroller.js';
import GamestatusController from './gamestatuscontroller.js';

export default class AppController extends Controller
{
    constructor( model = new AppModel, view = new AppView )
    {
        super( model, view );
        /* disable display now if updates are running */
        /* initiate components */
        this._service   = new ServiceController();
        this._pulldown  = new PulldownController();
        this._identity  = new IdentityController();
        this._mainmenu  = new MainmenuController();
        this._lobby     = new LobbyController();
        this._gamelist  = new GameListController();
        this._game      = new GameController();
        this._about     = new AboutController();
        this._status    = new GamestatusController();

        /* apply bindings */
        /* give controllers access to route() */
        this._identity.bindRoute( this.route );
        this._mainmenu.bindRoute( this.route );
        this._about   .bindRoute( this.route );
        this._lobby   .bindRoute( this.route );
        this._gamelist.bindRoute( this.route );
        this._game    .bindRoute( this.route );
        this._status  .bindRoute( this.route );
        /* push service */
        this._mainmenu.bindInitPushService( this.initPushService );
        /* sync event */
        this._gamelist.bindSyncGid( this.syncGid );
        /* scrolling update event */
        this._gamelist.bindRefreshScroll( this.refreshScroll );
        /* app notifications */
        this._gamelist.bindNotify( this.notify );
        /* app version verification */
        this._gamelist.bindVerifyVersion( this.verifyVersion );
        this._gamelist.bindEnableButton( this.enableGamelistBtn );
        this._gamelist.bindIsPushSubscribe( this.isPushSubscribe );
        /* reset badges */
        this._gamelist.bindSetAppBadge( this.setAppBadge );
        /* bind model update events */
        this._lobby   .bindSetGidDetail( this.setGidDetail );
        this._game    .bindSetGidDetail( this.setGidDetail );
        /* bind game close methods to game */
        this._game    .bindDropGameView( this.dropGameView );
        /* bind identity name to lobby id */
        this._lobby   .bindIdName( this.idName );
        this._lobby   .bindIdAvatar( this.idAvatar );
        this._lobby   .bindIdStat( this.idStat );
        this._status  .bindIdName( this.idName );
        this._status  .bindIdAvatar( this.idAvatar );
        this._status  .bindPopMenu( this.handlePopMenu );
        this._mainmenu.bindIdName( this.idName );
        this._mainmenu.bindIdAvatar( this.idAvatar );
        this._mainmenu.bindIdStat( this.idStat );
        this._identity.bindPopMenu( this.handlePopMenu );
        this._identity.bindServicesConnect( this.servicesConnect );
        this._identity.bindSetPulldownState( this._setPulldownState );

        this.model.bindNotifyListChanged( this.onNotifyListChanged );

        /* detect offline/online (not really working yet) */
        //window.addEventListener( 'online',  () => this._updateOnlineStatus() );
        //window.addEventListener( 'offline', () => this._updateOnlineStatus() );
        //document.getElementById( 'pulldown-menu' ).addEventListener( 'onclick', () => {
        //    this.initPushService();
        //    document.getElementById( 'pulldown-menu' ).removeEventListener( 'onclick' );
        //}, 1 )

        /* track a running notification */
        this.isnotify = this.view.showNotify;

        /* save app version to property */
        this.model.appversion = env?.version;

        /* prepare main menu */
        this._pulldown.appendView( this._mainmenu.getView() );
        /* track last application state here */
        this.lastState = [];
    }

    launch()
    {
        /* trigger startup events if we're not starting from the about view */
        if ( !window.location.pathname.toLowerCase().startsWith( '/about' ) ) this.playIntro().then( () => this.remindCookies() );
        /* route application to proper place */
        this.route();
        /* connect to service and establish events */
        this.servicesConnect();
        /* detect online status (disabled) */
        //this._updateOnlineStatus();
    }

    /* confirm version matches and reload application as necessary */
    verifyVersion = (
        checkVers,
        storeVers     = this.model.appversion,
        updatecounter = this.model.updatecounter
    ) =>
    {
        /* trigger refreshes if both versions exist but dont match */
        if ( storeVers && checkVers && storeVers != checkVers )
        {
            /* set maximum number of app resets before falling back on the update prompt again */
            const resetmax = 5;
            /* refresh automatically if page has been open less than 10 seconds, with fallback to user confirmation */
            if ( ( resetmax > updatecounter ) || !window.alert( 'an update to cribb.app is ready to download. update to continue!' + '\n\nversion: ' + checkVers ) )
            {
                /* advance updatecounter */
                this.model.updatecounter++;
                location.reload();
            }
        }
        /* end update if everything checks out and we have a running updatecounter */
        else if ( updatecounter )
        {
            /* show the app screen */
            this.view.screenload = false;
            /* reset update counter */
            this.model.updatecounter = 0;
        }
    }

    remindCookies = ( force = !this.model.cookiewarning ) =>
    {
        /* run first time warnings if needed */
        if ( force )
        {
            setTimeout( () =>
            {
                this.notify( 'this site uses cookies', `/about/privacy` );
                this.model.cookiewarning = true;
            }, 1500 )
        }
    }

    playIntro = ( force = this.model.doPlayIntro && null == this._identity.name ) => this._promise()
        .then( () =>
        {
            if ( force )
            {
                const intro = this.view.createIntro();
                return this._delay( 7500 ).then( () =>
                {
                    intro.remove();
                    this.model.doPlayIntro = false;
                } )
            }
        } )


    remindAppInstall = ( force = !this.model.installappreminder ) =>
    {
        if ( force && ( 'standalone' in window.navigator ) && !window.navigator.standalone )
        {
            setTimeout( () =>
            {
                this.modal( [
                    'install app', this.view.create( 'br' ),
                    'to home screen!', this.view.create( 'br' ),
                    this.view.create( 'span', { class: 'action-icon' } ), ' > add to home screen'
                ] );
                /* confirm */
                this.model.installappreminder = true;
            }, 2000 );
        }
    }

    /* pushState but only if path is not already set */
    pushState( path, title, fchange, fnochange )
    {
        const oldpath   = window.location.pathname;
        const oldtitle  = document.title;
        if ( oldpath != path )
        {
            this.lastState.push( [ oldpath, oldtitle ] );
            window.history.pushState( null, null, path );
            /* clear hash store */
            this.model?.hash.clearAll();
            /* callback function in the event of change */
            if ( fchange ) { fchange() }
        }
        /* run nochange callback */
        else if ( fnochange ) { fnochange() }
        /* set site title */
        document.title = title ?? 'cribb.app';
    }

    /* navigate back in application */
    popState( )
    {
        const oldpath = window.location.pathname;
        const [ path, title ] = this.lastState.pop() ?? [ '/', null ];
        if ( oldpath != path )
        {
            window.history.pushState( null, null, path );
            /* clear hash store */
            this.model?.hash.clearAll();
        }
        document.title = title ?? 'cribb.app';
    }

    route = ( path, clearstate ) =>
    {
        /* implicit calls load current path */
        if      ( path == null ) { path = window.location.pathname }
        /* explicit calls to current route will be ignored */
        else if ( path == window.location.pathname ) { return }
        /* forget where we are now - disallow back navigation through this route() */
        if      ( clearstate )
        {
            /* replace current page with root */
            history.replaceState( '', '', '/' );
            /* (re)set menu state */
            this._setPulldownState( true, false, null, true );
        }
        /* split path into non-zero arguments */
        const route = path.split( '/' ).filter( n => n );
        /* route web request to proper place in application */
        switch ( route[ 0 ] )
        {
            case 'g':
                this.openGame( route[ 1 ] );
                break;
            case 'i':
                this.openInvite( route[ 1 ] );
                break;
            case 'r':
                this.openEnd( route[ 1 ] );
                break;
            case 'list':
                this.openList();
                break;
            case 'identity':
                this.routeIdentity( route[1] );
                break; 
            case 'about':
                this.openAbout( route[ 1 ] );
                break;
            default:
                this.openRoot();
                break;
        }
    }

    routeIdentity( method )
    {
        switch ( method )
        {
            case 'create':
                this.handleOpenIdentityCreate();
                break; 
            case 'update':
                this.handleOpenIdentityUpdate();
            default:
                /* */
        }
    }

    /* set a pulldown state and return previous state */
    _setPulldownState = ( showMenu, showMenuToggle, showMenuHeader, isFullScreen ) =>
    {
        const pdstate = [ this._pulldown.showMenu, this._pulldown.showMenuToggle, this._pulldown.showMenuHeader, this._pulldown.isFullScreen ];
        if ( showMenu       != null ) { this._pulldown.showMenu       = showMenu }
        if ( showMenuToggle != null ) { this._pulldown.showMenuToggle = showMenuToggle }
        if ( showMenuHeader != null ) { this._pulldown.showMenuHeader = showMenuHeader }
        if ( isFullScreen   != null ) { this._pulldown.isFullScreen   = isFullScreen }
        return pdstate;
    }

    /* open application to root view */
    openRoot = ( ) =>
    {
        /* close any open pulldown menus */
        this.handleTrimViews();
        /* set pulldown to full screen with no toggle */
        this._setPulldownState( true, false, false, true );
        /* update path and title */
        this.pushState( '/', 'cribb.app' );
    }

    openList = ( ) =>
    {
        /* update path */
        this.pushState( '/list', 'open games' );
        const view = this._gamelist.createListView();

        /* save current pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, true, null, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this.popState();
        } );
    }

    openAbout = ( page ) =>
    {
        let view;
        if ( 'changelog' == page )
        {
            this.pushState( '/about/changelog', 'changelog' );
            view = this._about.createChangelogView();
        }
        else if ( 'privacy' == page )
        {
            this.pushState( '/about/privacy', 'privacy' );
            view = this._about.createPrivacyView();
        }
        else if ( 'license' == page )
        {
            this.pushState( '/about/license', 'license' );
            view = this._about.createLicenseView();
        }
        else
        {
            this.pushState( '/about', 'about' );
            view = this._about.createAboutView();
        }

        /* save current pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, true, null, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this.popState();
        } );
    }

    /* go to the given identity page */
    handleOpenIdentityCreate = ( ) =>
    {
        /* redirect if we are logged in */
        if ( null != this._identity.name ) { this.route( `/identity/update`, true ); return; }
        /* lock and skip routing if we're at the about view */
        if ( window.location.pathname.startsWith( `/about` ) ) { this.lockMenu(); return; }
        /* clear out views */
        this.handleTrimViews();
        const view = this._identity.createCreateView();

        /* update path */
        this.pushState( `/identity/create`, 'create identity' );

        /* explicitly set pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, false, null, true );
        /* append create view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this._identity.clear();
            this.popState();
        } );

    }

    handleOpenIdentityUpdate = ( ) =>
    {
        /* redirect if we are not logged in */
        if ( null == this._identity.name ) { this.route( `/identity/create`, true ); return; }
        const view = this._identity.createUpdateView();
        /* update path */
        this.pushState( `/identity/update`, 'update identity' );

        /* save current pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, true, null, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this._identity.clear();
            this.popState();
        } );
    }

    /* update local record */
    setGidDetail = ( gid, color, rank, s1, s2, t ) =>
    {
        /* update relevant models directly */
        this._gamelist.setGidDetail( gid, color, rank, s1, s2, t );
    }

    /* open a new lobby */
    openInvite = ( gid = null ) =>
    {
        /* generate a fresh lobby view */
        const view = this._lobby.createView( !gid );
        /* save current pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, true, null, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this.popState();
        } );
        /* open invite from server */
        this._lobby.fetchLobby( gid ).then( o =>
        {
            /* if we received a game object */
            if ( o?.gid )
            {
                /* update state if a lobby was loaded */
                if   ( o.type == 'invite' ) { this.pushState( '/i/' + o.gid, 'challenge!' ) }
                /* or redirect to game */
                else { this.route( '/g/' + o.gid ) }
            }
            /* if the request failed but we appear to be logged on */
            else if ( null != this._identity.name ) { this.route( '/', true ) }
        } );
    }

    openEnd = ( gid = null ) =>
    {
        /* generate a fresh lobby view */
        const view = this._status.createView();
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, true, null, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
            this.popState();
        } );
        /* open end screen from server */
        this._status.fetchEnd( gid ).then( g =>
        {
            if ( g?.g )
            {
                /* finalize url state if results check out */
                if   ( 'end' == g?.st ) { this.pushState( '/r/' + g.g, 'results' ) }
                /* open as a game if we found a game in the wrong state */
                else { this.route( '/g/' + g.g, true ) }
            }
            /* if the request failed but we appear to be logged on */
            else if ( null != this._identity.name ) { this.route( '/', true ) }
        } );
    }

    openGame = ( gid ) =>
    {
        /* redirect if no gid was given */
        if ( !gid ) { this.route( '/', true ); return; }
        /* generate a fresh game view and attach */
        const view = this._game.createGameView();
        this.appendGameView( view );

        /* set pulldown state properties */
        this._setPulldownState( false, true, false, false );
        /* drop menu views after menu has been closed */
        this.handleTrimViews( 400 );
        /* set gid */
        this._game.fetchGameState( gid, true ).then( s =>
        {
            /* if a game state value was returned */
            if ( s?.success )
            {
                /* direct games in other state to appropriate context */
                if ( [ 'invite', 'end' ].includes( s.st ) )
                {
                    /* trim views now and interrupt any pending commands */
                    this.handleTrimViews();
                    /* clean up game view if we are closing it */
                    this.dropGameView();
                    /* open menu to full screen and then redirect app */
                    /* direct to invite/result */
                    this.route( '/' + ( s.st == 'invite' ? 'i' : 'r' ) + '/' + gid, true );
                }
                else
                {
                    /* close any open notifications */
                    this._service.removeNotifications( 'g/' + gid );
                    /* update path */
                    this.pushState( '/g/' + gid, 'open game' );
                }
                /* remind player about app install if necessary */
                this.remindAppInstall();
            }
            /* if the request failed but we appear to be logged on */
            else if ( null != this._identity.name ) { this.route( '/', true ) }
        } );
    }

    /* get logged in user info */
    idName   = () => this._identity.name;
    idAvatar = () => this._identity.avatar;
    idStat   = () => this._identity.stat;

    /* application status */
    isPushSubscribe = () => this._service.isPushSubscribe;

    /* call trimViews function, with optional delay
     * run immediately to clear any pending view changes
     */
    handleTrimViews = ( d = 0 ) =>
    {
        clearTimeout( this._trimViewDelay );
        if ( d > 0 ) { this._trimViewDelay = setTimeout( () => this._pulldown.trimViews(), d ) } else { this._pulldown.trimViews() }
    } 

    handlePopMenu = ( ) =>
    {
        /* drop pulldown */
        this._pulldown.dropView();
    }

    /* lock pulldown view (if user is logged off and app navigation doesn't make sense) */
    lockMenu = ( ) =>
    {
        [ this._pulldown.showMenu, this._pulldown.showMenuToggle, this._pulldown.isFullScreen ] = [ true, false, true ]
    }

    /* append a view to gamescreen (replace previous contents) */
    appendGameView = ( view ) =>
    {
        this.view.mainscreen.textContent = '';
        /* set baseheader to pulldown to use game header by default */
        this._pulldown.baseheader = view.getElementsByClassName( 'pd-header' )[ 0 ];
        this.view.mainscreen.appendChild( view );
    }

    dropGameView = () =>
    {
        this._game.clear();
        this.view.mainscreen.textContent = '';
        this._pulldown.baseheader = null;
    }

    refreshScroll = ( ) =>
    {
        this._pulldown.refreshScroll()
    }

    notify = ( str, route ) =>
    {
        if ( str )
        {
            this.model.appendNotify( [ str, route ] )
        }
    }

    setAppBadge = ( n ) => this._service.setAppBadge( n );

    modal = ( message, option = { 'done': this.handlePopMenu } ) =>
    {
        /* create a new modal view with argument details */
        const view = ModalController.createModal( message, option );
        /* save current pulldown properties for callback */
        /* set pulldown state properties */
        const pdstate = this._setPulldownState( true, false, false, true );
        /* append view to pulldown menu - call popState on close */
        this._pulldown.appendView( view, () =>
        {
            /* revert pulldown state properties */
            this._setPulldownState( ...pdstate );
        } );
    }

    /* handlers */
    /* run notification events on list */
    onNotifyListChanged = ( l = this.model.notifyList ) =>
    {
        /* only run if pending notifications and if not already running */
        if ( l?.length && !this.isnotify )
        {
            /* prevent >1 thread */
            this.isnotify = true;

            /* take the last notification in list */
            const o = l.pop();
            /* notification properties */
            /* click event */
            this.view.note.onclick = () => ( o[ 1 ] != null ) && this.view.hideNotify() || this.route( o[ 1 ] );
            /* set notification content to view */
            this.view.note = o[ 0 ];
            /* show the notification (transition) */
            this.view.showNotify = this.isnotify;
            /* scan dimensions and apply a %pan that is needed to avoid clipping */
            this.view.applyNotifyPan();
            /* close the notification after set time limit */
            this._delay( 5000 )
                .then( () => this.view.showNotify = false )
                .then( () => this._delay( 750 ) )
                /* call function again after promise chain completes to run again on next notification */
                .then( () =>
                {
                    this.isnotify = false;
                    this.onNotifyListChanged();
                } );
        }
    }

    /* connect to sse for realtime updates */
    initMsgHandler()
    {
        /* only init if we haven't already or if the stream is closed */
        if ( !this._msg || this._msg.readyState == 2 )
        {
            /* keep track of server timestamp */
            let time = null;
            /* initiate the SSE connection */
            this._msg = new EventSource( '/msg' );
            /* run when server updates */
            this._msg.onmessage = e =>
            {
                /* close eventsource if we got a 0 response from server */
                if ( e.data === '0' ) { this._msg.close() }
                /* detect new timestamps */
                if ( time && ( time != e.data ) )
                {
                    console.log( 'msg: ' + e.data );
                    /* trigger sync */
                    this.sync( true );
                }
                /* save msg timestamp */
                time = e.data;
            } 
        }

    }

    /* attach visibilitychange callbacks if necessary */
    initVisibilitySync = () => !document.onvisibilitychange && ( document.onvisibilitychange = () => document.visibilityState === 'visible' && this.sync() );

    /* establish a web push subscription if necessary */
    initPushService = ( force = !this.model.isPnSubscribe ) =>
    {
        if ( force )
        {
            this._service.pnSubscribe();
            this.model.isPnSubscribe = true;
        }
    }

    /* sync models with service */
    sync = ( f = false ) =>
    {
        /* set placeholder past time if no lastsync exists */
        if ( !this._lastsync ) { this._lastsync = new Date( 0 ) }
        /* measure seconds since last sync */
        const past = ( ( new Date() ) - this._lastsync ) / 1000;
        if ( past > 20 || f )
        {
            /* open event stream with server for push sync (no effect if stream is open) */
            this.initMsgHandler();
            /* sync identity - name and avatar */
            this._identity.sync().then(
                /* refresh main menu when identity has been synchronized */
                () => this._mainmenu.onModelChanged()
            );
            /* sync the gamelist - specific game updates will trigger syncGid */
            this._gamelist.sync();
            /* update last sync property */
            this._lastsync = new Date();
        }
    }


    servicesConnect = () =>
    {
        /* don't do anything if we aren't logged in */
        if ( null == this._identity.name ) { this.route( '/identity/create' ); return; }
        /* reconnect the sync services */
        /* sync when site is foregrounded */
        this.initVisibilitySync();
        /* call sync process */
        this.sync( true );
    }

    /* call sync functions for a specific gid */
    syncGid = ( gid, t ) =>
    {
        /* synchronize any models that have this game id open */
        this._lobby.sync( gid );
        this._game.sync( gid, t );
    }

    /* detect online status */
    _updateOnlineStatus = ( isOn = navigator.onLine ) =>
    {
        /* test for ui update */
        if ( isOn != !this.view.showOffline )
        {
            /* notify if online status is changing */
            this.notify( isOn ? 'you are online' : 'you are offline' );
        }
        /* update view */
        this.view.showOffline = !isOn;
    }

    /* enable or disable the open games button in main menu */
    enableGamelistBtn = ( enable ) => this._mainmenu.enableOpenGames( enable );

}