/* imports */
import Controller from './controller.js';
import _model from '../model/listboxmodel.js';
import _view from '../view/listboxview.js';


export default class ListboxController extends Controller
{
    constructor( model = new _model(), view = new _view() )
    {
        super( model, view );
    }

    static createListBox = (
        svg,
        altcolor,
        name,
        rankcolor,
        highlight,
        datacol1,
        datacol2,
        solo,
        clickhandler,
        swipehandler
    ) =>
    {
        return _view._createListBox(
            svg,
            altcolor,
            name,
            rankcolor,
            highlight,
            datacol1,
            datacol2,
            solo,
            clickhandler,
            swipehandler
        )
    }

    static createTextblock = (
        text
    ) =>
    {
        return _view.createTextblock( text )
    }

    static createNoteBox = (
        header,
        link,
        subheader,
        disclaimer,
        body,
        fitcontent
    ) =>
    {
        return _view.createNoteBox( header, link, subheader, disclaimer, body, fitcontent )
    }

    static createHeader = (
        header
    ) =>
    {
        return _view.createHeader( header )
    }

    /* create a note with 1-n key / value rows */
    static createTableNote = ( obj ) => _view.create( 'div', { class: 'notebox' }, [ ...Object.entries( obj ).map( ( [ k, v ] ) => _view.createNoteRow( k, v ) ) ] );

    /* listbox table header / value definition */
    static tableSet = ( key, value ) => { return { [key]: value } };

}
