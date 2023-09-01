/* imports */
import Controller from './controller.js';
import _view      from '../view/svgcharview.js';

import sfetch     from '../sfetch.js';

export default class SvgCharController extends Controller
{
    /* return uri to svg by key */
    static _getUri = ( key ) => `/asset/${key}.svg`;
    /* return a text span with inner svg reference */
    static span    = ( key ) => _view.createCharSpan( this._getUri( key ) )
    /* return svg object and load svg content into DOM as a promise */
    static svg     = ( key ) =>
    {
        const svg = _view.createBlankSvg();
        fetch( sfetch.request( this._getUri( key ) ) )
            .then( r       => r.text() )
            .then( html    => _view.string2dom( html ) )
            .then( fullsvg => svg.replaceWith( fullsvg ) );
        return svg;
    }
}
