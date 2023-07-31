<?php

/**
 * filter out profanity in user content using a blocklist
 */
class WordFilter extends Model
{
    /* load swears array from file */
    public function __construct( )
    {
        parent::__construct();
    }

    /* consider letters separated by these characters to be part of the same word */
    private $_joins = ' _\-\+\.';

    /* return the wordlist from database */
    protected function _wordList(): PDOStatement { return $this->run( 'SELECT `word` FROM `blockwords`' ); }

    /* character substitutions map */
    private $replacement = [
        'a' => 'aªàáâãäåāăąǎȁȃȧᵃḁẚạảₐ⒜ⓐａ4⍺4⁴₄④⑷⒋４₳@',
        'b' => 'bᵇḃḅḇ⒝ⓑｂɞßℬ฿8',
        'c' => 'cçćĉċčᶜⅽ⒞ⓒｃ©¢℃￠€\<',
        'd' => 'dďᵈḋḍḏḑḓⅆⅾ⒟ⓓｄ',
        'e' => 'eèéêëēĕėęěȅȇȩᵉḙḛẹẻẽₑ℮ℯⅇ⒠ⓔｅ⅀∑⨊⨋€℮3',
        'f' => 'fᶠḟ⒡ⓕﬀｆƒ⨐ƒ៛',
        'g' => 'gĝğġģǧǵɡᵍᵹḡℊ⒢ⓖｇ',
        'h' => 'hĥȟʰһḣḥḧḩḫẖₕℎ⒣ⓗｈ44⁴₄④⑷⒋４',
        'i' => 'iìíîïĩīĭįİıǐȉȋᵢḭỉịⁱℹⅈⅰⅱ⒤ⓘｉlĺļľŀˡḷḻḽₗℓⅼ⒧ⓛｌ|׀∣❘｜1¹₁⅟①⑴⒈１',
        'j' => 'jĵǰʲⅉ⒥ⓙⱼｊ',
        'k' => 'kķǩᵏḱḳḵₖ⒦ⓚｋ',
        'l' => 'iìíîïĩīĭįİıǐȉȋᵢḭỉịⁱℹⅈⅰⅱ⒤ⓘｉlĺļľŀˡḷḻḽₗℓⅼ⒧ⓛｌ|׀∣❘｜1¹₁⅟①⑴⒈１',
        'm' => 'mᵐḿṁṃₘⅿ⒨ⓜ㎜ｍℳ',
        'n' => 'nñńņňŉƞǹṅṇṉṋⁿₙ⒩ⓝｎ',
        'o' => 'oºòóôõöōŏőơǒǫȍȏȯᵒọỏₒℴ⒪ⓞｏ°⃝⃠⊕⊖⊗⊘⊙⊚⊛⊜⊝⌼⌽⌾⍉⍜⍟⍥⎉⎊⎋⏀⏁⏂⏣○◌●◯⚆⚇⚪⚬❍⦲⦵⦶⦷⦸⦹⦾⧂⧃⧲⧬⨀㊀0⁰₀⓪０',
        'p' => 'pᵖṕṗₚ⒫ⓟｐ',
        'q' => 'q⒬ⓠｑ',
        'r' => 'rŕŗřȑȓɼʳᵣṙṛṟ⒭ⓡｒſẛɼẛ',
        's' => 'sśŝşšșˢṡṣₛ⒮ⓢｓ$﹩＄5⁵₅⑤⑸⒌５§',
        't' => 'tţťƫțᵗƾṫṭṯṱẗₜ⒯ⓣｔ☨☩♰♱⛨✙✚✛✜✝✞✟⧧†\+7',
        'u' => 'uùúûüũūŭůűųưǔȕȗᵘᵤṳṵṷụủ⒰ⓤｕvᵛᵥṽṿⅴ⒱ⓥｖ',
        'v' => 'uùúûüũūŭůűųưǔȕȗᵘᵤṳṵṷụủ⒰ⓤｕvᵛᵥṽṿⅴ⒱ⓥｖ',
        'w' => 'wŵʷẁẃẅẇẉẘ⒲ⓦｗ',
        'x' => 'xˣẋẍₓⅹ⒳ⓧｘ˟╳❌❎⤫⤬⤭⤮⤯⤰⤱⤲⨯×✕✖⨰⨱⨴⨵⨶⨷',
        'y' => 'yýÿŷȳʸẏẙỳỵỷỹ⒴ⓨｙ¥￥',
        'z' => 'zźżžƶᶻẑẓẕ⒵ⓩｚ2²₂②⑵⒉２',
        ' ' => ' _\-\+\.',
        '0' => '0',
        '1' => '1',
        '2' => '2',
        '3' => '3',
        '4' => '4',
        '5' => '5',
        '6' => '6',
        '7' => '7',
        '8' => '8',
        '9' => '9'
    ];

    /* generate word replacement regex with all available character substitutions */
    protected function _expandCharRegex( string $s ): string
    {
        /* begin with empty array */
        $regex_parts = [];
        /* step through each ascii character in string and add a regex replace string to array */
        for ( $i = 0; $i < strlen( $s ); $i++ ) { $regex_parts[] = "[{$this->replacement[ substr( $s, $i, 1 ) ]}]+"; }
        /* always replace e,s,d with basic ascii character */
        $regex_parts[] = "[{$this->replacement['e']}]*[{$this->replacement[ 's' ]}{$this->replacement[ 'd' ]}]*";
        /* join character replace blocks with non-word separators */
        return join( "[{$this->_joins}]*", $regex_parts );
    }

    /* filter str and return with blocked word characters replaced with censor character */
    public function filter_string( string $str, string $censor = '*' ): string
    {
        /* execute block for each word returned from list */
        foreach ( $this->_wordList() as $list )
        if      ( $word = $list->word )
        {
            /* generate the string to replace words with */
            $replacement = ( mb_strlen( $censor ) ) ? ' ' . str_pad( '', strlen( $word ), $censor ) . ' ' : '';
            /* run string through regex result to replace the word */
            $str = preg_replace( '/(\b|[ \t])' . $this->_expandCharRegex( $word ) . '(\b|[ \t])/ui', $replacement, $str );
        }
        /* trim spaces */
        return trim( $str );
    }
}