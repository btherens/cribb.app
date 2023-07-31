/* imports */
import Controller from './controller.js';
import EndModel from '../model/endmodel.js';
import EndView from '../view/endview.js';

import sfetch from '../sfetch.js';
import AvatarController from './avatarcontroller.js';
import ListboxController from './listboxcontroller.js';
import ButtonController from './buttoncontroller.js';

export default class EndController extends Controller
{
    constructor( model = new EndModel, view = new EndView )
    {
        super( model, view );

        /* avatar interface */
        this.avatar = new AvatarController( );

        this.model.bindOnModelChanged( this.onModelChanged );
        this.view.bindClickButton( this.handleClickButton );

    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        pname   = this.idName(),
        pavatar = this.idAvatar(),
        oname   = this.model.name,
        oavatar = this.avatar.createStaticAvatar( this.model.avatar ),
        color   = this.model.color,
        rank    = this.model.rank,
        score   = this.model.score,
        next    = this.model.next,
        stat    = this.model.stat
    ) => {
        const iswin    = score[ 0 ] > score[ 1 ];
        const playstat = stat ? ( 0 < stat.players[ 0 ].st ? '+' : '-' ) + stat.players[ 0 ].st.toString() : ( iswin  ? 'win' : 'lose' );
        const oppstat  = stat ? ( 0 < stat.players[ 1 ].st ? '+' : '-' ) + stat.players[ 1 ].st.toString() : ( !iswin ? 'win' : 'lose' );

        this.view.displayEndView(
            ListboxController.createListBox(
                oavatar,
                color,
                oname,
                rank,
                !iswin,
                ListboxController.tableSet( 'score', score[ 1 ].toString() ),
                ListboxController.tableSet( stat ? 'streak' : 'result', oppstat ),
                1
            ),
            ListboxController.createListBox(
                pavatar,
                !color,
                pname,
                rank,
                iswin,
                ListboxController.tableSet( 'score', score[ 0 ].toString() ),
                ListboxController.tableSet( stat ? 'streak' : 'result', playstat ),
                1
            ),
            ButtonController.create(
                'board',
                { onclick: () => this.handleClickButton() },
                next ? 'done' : 'play again'
            )
        );
    }

    /* get game details from server */
    fetchEnd = ( gid = this.model.gid ) =>
    {
        /* request a game result */
        return sfetch.json( sfetch.request( '/game/getEnd', { g: gid } ) )
        .then( j =>
        {
            /* check for return object */
            if ( j?.st == 'end' )
            {
                /* assign properties */
                this.model.gid    = j.g;
                this.model.name   = j.name;
                this.model.avatar = j.av;
                this.model.color  = j.se.color;
                this.model.rank   = j.se.rank;
                this.model.score  = [ j.sc.p.s, j.sc.o.s ];
                this.model.next   = j.ng;
                this.model.stat   = j?.stat;
                this.onModelChanged();
            }
            return j;
        } )
    }

    handleClickButton = (
        gid  = this.model.gid,
        next = this.model.next
    ) => {
        /* button dismisses page if a new game has already been set up */
        if   ( next ) { this.handlePopMenu() }
        /* create a new game from this game's ashes */
        else { sfetch.json( sfetch.request( '/game/createNextGame', { gid: gid }, 'post' ) ).then( j => j?.success && this.handleRoute( '/g/' + j.g ) ) }
    }

    /* return a new invite view */
    createView( )
    {
        /* create view */
        const view = this.view.createEndView();
        /* update live fields */
        return view;
    }

    clear()
    {
        this.model.gid = ''
    }

    /* bindings */
    bindRoute(    handler ) { this.handleRoute   = handler }
    bindPopMenu(  handler ) { this.handlePopMenu = handler }
    bindIdName(   handler ) { this.idName        = handler }
    bindIdAvatar( handler ) { this.idAvatar      = handler }

}