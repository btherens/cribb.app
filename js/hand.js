
export default class Hand {

    /* set hand element and mDrag object to properties for re-use */
    constructor(el,dragref) {
        this.element = el;
        this._mDrag = dragref;
        this.deck = null;
    }

    /* set cards from deck to view */
    setView() {
        /* clear html */
        this.element.textContent = '';
        /* for every card in the deck */
        for (let i in this.deck.cards) {
            /* get card's html */
            let card = this.deck.cards[i].html;
            /* set mDrag event listeners to card for drag support */
            this._mDrag.setDragEvents(card);
            /* append card to view node */
            this.element.appendChild(card);
        }
    }

}
