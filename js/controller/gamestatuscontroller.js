/* imports */
import Controller from './controller.js';
import _model     from '../model/gamestatusmodel.js';
import _view      from '../view/gamestatusview.js';

import sfetch            from '../sfetch.js';
import AvatarController  from './avatarcontroller.js';
import ListboxController from './listboxcontroller.js';
import ButtonController  from './buttoncontroller.js';

export default class GamestatusController extends Controller
{
    constructor( model = new _model, view = new _view )
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
        isEnd   = 'end' == this.model.stage,
        color   = this.model.color,
        rank    = this.model.rank,
        score   = this.model.score,
        next    = this.model.next,
        stat    = this.model.stat
    ) => {
        const iswin  = score[ 0 ] > score[ 1 ];
        let playstat = [ isEnd ? 'result' : 'current', iswin  ? 'win' : 'lose' ];
        let oppstat  = [ isEnd ? 'result' : 'current', !iswin ? 'win' : 'lose' ];
        if ( stat  )
        if ( isEnd )
        {
            playstat = [ 'streak', ( 0 < stat.players[ 0 ].st ? '+' : '-' ) + stat.players[ 0 ].st.toString() ];
            oppstat  = [ 'streak', ( 0 < stat.players[ 1 ].st ? '+' : '-' ) + stat.players[ 1 ].st.toString() ];
        }
        else
        {
            playstat = [ 'streak', stat[ 0 ]?.streak.toString() ];
            oppstat  = [ 'streak', stat[ 1 ]?.streak.toString() ];
        }

        this.view.displayInfoView(
            ListboxController.createListBox(
                oavatar,
                color,
                oname,
                rank,
                score[ 0 ] <= score[ 1 ],
                ListboxController.tableSet( 'score', score[ 1 ].toString() ),
                ListboxController.tableSet( ...oppstat ),
                1
            ),
            ListboxController.createListBox(
                pavatar,
                !color,
                pname,
                rank,
                score[ 0 ] >= score[ 1 ],
                ListboxController.tableSet( 'score', score[ 0 ].toString() ),
                ListboxController.tableSet( ...playstat ),
                1
            ),
            ButtonController.create(
                'board',
                { onclick: () => this.handleClickButton() },
                isEnd ? ( next ? 'done' : 'play again' ) : 'open game'
            )
        );
        /* set header */
        this.view.header.textContent = isEnd ? 'results' : 'open game';
    }

    /* get game details from server */
    fetchInfo = ( gid = this.model.gid ) => sfetch.json( sfetch.request( '/game/getInfo', { g: gid } ) )
    .then( j =>
    {
        /* check for return object */
        if ( j?.success )
        {
            /* assign properties */
            this.model.gid    = j.g;
            this.model.stage  = j.st;
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

    handleClickButton = (
        gid   = this.model.gid,
        next  = this.model.next,
        isEnd = 'end' == this.model.stage,
    ) => {
        if      ( !isEnd ) { this.handleRoute( '/g/' + gid ) }
        /* button dismisses page if a new game has already been set up */
        else if ( next ) { this.handlePopMenu() }
        /* create a new game from this game's ashes */
        else    { sfetch.json( sfetch.request( '/game/createNextGame', { gid: gid }, 'post' ) ).then( j => j?.success && this.handleRoute( '/g/' + j.g ) ) }
    }

    /* return a new invite view */
    createView( )
    {
        /* create view */
        const view = this.view.createInfoView();
        /* update live fields */
        return view;
    }

    clear()
    {
        this.model.clear()
    }

    /* bindings */
    bindRoute(    handler ) { this.handleRoute   = handler }
    bindPopMenu(  handler ) { this.handlePopMenu = handler }
    bindIdName(   handler ) { this.idName        = handler }
    bindIdAvatar( handler ) { this.idAvatar      = handler }

}