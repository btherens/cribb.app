/* imports */
import Controller        from './controller.js';
import _model            from '../model/mainmenumodel.js';
import _view             from '../view/mainmenuview.js';

import AvatarController  from './avatarcontroller.js';
import ListboxController from './listboxcontroller.js';
import ButtonController  from './buttoncontroller.js';

/* main menu view - responsible for the top level menu system - begin new game, open games, etc */
export default class MainmenuController extends Controller
{
    constructor( model = new _model, view = new _view )
    {
        super( model, view );

    }

    onModelChanged = (
        name   = this.idName(),
        avatar = this.idAvatar(),
        stat   = this.idStat()
    ) => {
        this.view.displayView(
            avatar ? ListboxController.createListBox(
                avatar,
                2,
                name,
                0,
                0,
                ListboxController.tableSet( 'best streak', ( stat?.maxstreak ?? '--' ).toString() ),
                ListboxController.tableSet( 'cur. streak', ( stat?.streak    ?? '--' ).toString() ),
                1
            ) : null
        )
    }

    /* bindings */
    bindRoute( handler ) { this.handleRoute = handler }
    bindInitPushService( handler ) { this.handleInitPushService = handler }
    bindIdName( handler ) { this.idName = handler }
    bindIdAvatar( handler ) { this.idAvatar = handler }
    bindIdStat( handler ) { this.idStat = handler }

    clickIdentity = ( ) =>
    {
        this.handleRoute( `/identity/update` )
    }

    clickNewGame = ( ) =>
    {
        this.handleRoute( `/i` )
    }

    clickOpenGames = ( ) =>
    {
        this.handleInitPushService();
        this.handleRoute( `/list` );
    }

    enableOpenGames = ( enable ) =>
    {
        this.view.btnOpen.children[ 0 ].disabled = !enable
    }

    clickAbout = ( ) =>
    {
        this.handleRoute( `/about` )
    }

    /* get a view object */
    getView()
    {
        const view = this.view.createView(
            ButtonController.create( 'board', { onclick: this.clickNewGame   }, 'begin new game' ),
            ButtonController.create( 'board', { onclick: this.clickOpenGames }, 'open games' ),
            ButtonController.create( 'board', { onclick: this.clickIdentity  }, 'identity' ),
            ButtonController.create( 'board', { onclick: this.clickAbout     }, 'about' )
        );
        this.onModelChanged();
        return view;
    }
}