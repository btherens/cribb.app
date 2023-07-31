<?php

class AvatarModel extends Model
{
    /* constructor */
    public function __construct() { parent::__construct(); }

    /* return a map of properties with min/max values corresponding to avatar settings */
    public function getAvatarMap(): array
    {
        return [
            'colorBackground' => [ 1, 16 ],
            'colorSkin' => [ 1, 7 ],
            'colorHair' => [ 1, 10 ],
            'colorFacialHair' => [ 1, 10 ],
            'colorHat' => [ 1, 16 ],
            'colorGlasses' => [ 1, 16 ],
            'colorClothing' => [ 1, 16 ],
            'typeHair' => [ 1, 27 ],
            'typeFacialHair' => [ 1, 6 ],
            'typeHat' => [ 1, 9 ],
            'typeGlasses' => [ 1, 7 ],
            'typeClothing' => [ 1, 9 ],
            'typeClothingGraphic' => [ 1, 10 ],
            'typeEyebrows' => [ 1, 13 ],
            'typeEyes' => [ 1, 12 ],
            'typeMouth' => [ 1, 12 ]
        ];
    }

    /* set a new avatar config to database */
    public function setAvatarConfig( int $id, $cmd ): void
    {
        $this->run(
            'INSERT INTO `avatar` ( `identity_id`, `colorBackground`, `colorSkin`, `colorHair`, `colorFacialHair`, `colorHat`, `colorGlasses`, `colorClothing`, `typeHair`, `typeFacialHair`, `typeHat`, `typeGlasses`, `typeClothing`, `typeClothingGraphic`, `typeEyebrows`, `typeEyes`, `typeMouth` )
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
            [ $id, $cmd[ 'colorBackground' ], $cmd[ 'colorSkin' ],  $cmd[ 'colorHair' ], $cmd[ 'colorFacialHair' ], $cmd[ 'colorHat' ], $cmd[ 'colorGlasses' ], $cmd[ 'colorClothing' ], $cmd[ 'typeHair' ], $cmd[ 'typeFacialHair' ], $cmd[ 'typeHat' ], $cmd[ 'typeGlasses' ], $cmd[ 'typeClothing' ], $cmd[ 'typeClothingGraphic' ], $cmd[ 'typeEyebrows' ], $cmd[ 'typeEyes' ], $cmd[ 'typeMouth' ] ]
        );
    }

    /* return avatar config */
    public function getAvatarConfig( int $id ): ?array
    {
        return $this->run(
            'SELECT `colorBackground`, `colorSkin`, `colorHair`, `colorFacialHair`, `colorHat`, `colorGlasses`, `colorClothing`, `typeHair`, `typeFacialHair`, `typeHat`, `typeGlasses`, `typeClothing`, `typeClothingGraphic`, `typeEyebrows`, `typeEyes`, `typeMouth`
            FROM `avatar` WHERE `identity_id` = ?
            ORDER BY `timestamp` DESC LIMIT 1',
            [ $id ]
        )->fetch( PDO::FETCH_ASSOC ) ?: null;
    }
}
