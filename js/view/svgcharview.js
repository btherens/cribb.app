/* imports */
import View from './view.js';

export default class SvgCharView extends View
{
    /* create a span with reference to included path */
    static createCharSpan = ( uri ) => this.create( 'span', {
        class: 'svg-char',
        style: `content:url(${uri})`
    } );

    static createBlankSvg = () => this.create( 'svg' );

}
