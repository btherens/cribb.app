/* imports */
import View from './view.js';

export default class ButtonView extends View
{
    constructor()
    {
        super();
    }

    static createButton = (
        type,
        attr,
        content
    ) => ButtonView.create( 'div', { class: 'tactile ' + type + ' button' },
        ButtonView.create( 'button', attr, content )
    );

}
