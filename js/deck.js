/* deck of cards interface - spawn cards, shuffle, manipulate */
class BaseDeck {
    /* constructor accepts deck from freshDeck() method defined in child class */
    constructor(cards) {this.cards = cards}

    /* return # of cards in deck */
    get numberOfCards() {return this.cards.length}

    /* get top card from deck (removed from array and returned to method call) */
    pop() {return this.cards.shift()}

    /* add card to bottom of deck */
    push(card) {this.cards.push(card)}

    /* shuffle the deck */
    shuffle() {
        /* loop through each card in the deck */
        for (let i = this.numberOfCards - 1; i > 0; i--) {
            /* create new index for this card inside the bounds of our deck */
            const newIndex = Math.floor(Math.random() * (i + 1));
            /* the card currently at the new index */
            const oldValue = this.cards[newIndex];
            /* swap card positions */
            this.cards[newIndex] = this.cards[i]; this.cards[i] = oldValue;
        }
    }
}

/* a deck of standard playing cards */
export default class Deck extends BaseDeck {

    /* create a new deck and pass to parent constructor */
    constructor(cards = Deck.freshDeck()) {super(cards);}

    /* define suits and values here */
    static SUITS = [...Array(4).keys()];
    static VALUES = [...Array(13).keys()];

    /* generate a deck using SUITS and VALUES static properties */
    static freshDeck() {
        /* create a new suit for each SUITS
         * flatten the array of arrays into one sequential array
         */
        return Deck.SUITS.flatMap(suit => {
            /* create a new card for each VALUES */
            return Deck.VALUES.map( value => { return new Card(suit, value); } )
        })
    }

}

/* standard playing card */
class Card {

    /* accept and set suit, value properties */
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this._html = null;
    }

    /* return the html element representing this card */
    get html() {
        /* create html if cache is empty */
        if (!this._html) { this._html = this._createHTML(); }
        /* return property */
        return this._html;
    }

    /* spawn an html element representing this card */
    _createHTML() {
        const cardLi = document.createElement('li');
        cardLi.setAttribute('tabindex', 0);
        cardLi.classList.add('card', `s${this.suit}`, `c${this.value}`);
        return cardLi;
    }
}
