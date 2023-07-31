/* imports */
import Controller from './controller.js';
import _model from '../model/buttonmodel.js';
import _view from '../view/buttonview.js';

export default class ButtonController extends Controller
{
    constructor( model = new _model(), view = new _view() )
    {
        super( model, view );

    }

    static create = (
        type,
        attr,
        content
    ) => _view.createButton( type, attr, content );

}
