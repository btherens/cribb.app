<?php

class _testGameController extends GameController
{

    /* constructor */
    public function __construct( $action )
    {
        parent::__construct( 'index' );
    }

    private function _pctEcho( float $num, int $decimals = 0, string $unit = '%' ): void
    {
        /* conditionally echo % */
        if ( round( $num, $decimals ) == $num )
        {
            echo number_format( $num * 100, 2 ) . '%' . chr( 10 );
            ob_flush(); flush();
        }
    }


    /* test hand scores */
    public function _hands( $precond = null ): void
    {
        /* create a deck of cards */
        $deck = range( 0, 51 );
        $combos = new combination( $deck, 5 );

        $total = $combos->_nCr();
        $i = 0;

        /* step through every possible combination of card */
        foreach ( new combination( $deck, 5 ) as $hand )
        {
            /* print % done periodically */
            $this->_pctEcho( $i++ / $total, 6 );
            /* pre-catch */
            if ( !is_null( $precond ) && count( $this->_array_diff( [ $hand, $precond ] ) ) == 0 )
            {
                echo 'condition met';
            }
            /* return array of loaded cards */
            $detail = $this->_returnHandDetail( $hand, $deck );
            /* scan hand for scores */
            try { $scores = $this->_findScores( $detail ); }
            catch ( Exception $e )
            {
                echo "hand\n";
                echo json_encode( $hand );
                echo "\n\n";

                echo "detail\n";
                echo json_encode( $detail );
                echo "\n\n";

                echo "exception\n";
                echo $e;
                return;
            }
        }
        /* confirm test completed */
        echo '_hands: test completed';
    }


}
