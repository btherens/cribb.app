# cribb.app - online multiplayer cribbage

this project represents a proof of concept frontend javascript card game with server-side multiplayer matchmaking.

improved documentation still to come!

# CREDITS

[Symbola Font](https://www.fontspace.com/symbola-font-f22021), v10.24, 2018/01/31.  
Font is licensed as public domain and was provided for any personal or commercial use.  

[Varela Round](https://github.com/avrahamcornfeld/Varela-Round-Hebrew), acfa070, 2020/11/16.  
SIL Open Font License 1.1.  
Varela Round is based on the well known font Varela. It is suitable for headlines and printed collateral.  

[DejaVu Sans](https://dejavu-fonts.github.io), accessed 2022/04/15.  
Font is licensed as public domain and was provided for any personal or commercial use.  

[WebAuthn](https://github.com/lbuchs/WebAuthn), v1.1.0, 2022/05/06.  
A simple PHP WebAuthn (FIDO2) server library.  

[avataaars](https://avataaars.com), 2017/12/17.  
Designed by Pablo Stanley.  
Create avatar illustrations with this free library. Combine clothes, hair, emotions, accesories, and colors.  

[AvataaarsJs](https://github.com/HB0N0/AvataaarsJs), 2ee514d, 2021/04/27.  
Use the awesome Avataaars Library by Pablo Stanley (avataaars.com) in any javascript application.  

[qr-code-styling](https://github.com/kozakdenys/qr-code-styling), v1.6rc0, 2021/07/05.  
JavaScript library for generating QR codes with a logo and styling.  

[google-profanity-words](https://github.com/coffee-and-fun/google-profanity-words),  v1.4, 2022/01/16  
A list of bad words and top swear words banned by Google.  

font subset generated from Symbola-AjYx.ttf via pyftsubset:
```
pyftsubset \
    ./Symbola-AjYx.ttf \
    --unicodes=1F0A0,1F0A1,1F0B1,1F0C1,1F0D1,1F0A2,1F0B2,1F0C2,1F0D2,1F0A3,1F0B3,1F0C3,1F0D3,1F0A4,1F0B4,1F0C4,1F0D4,1F0A5,1F0B5,1F0C5,1F0D5,1F0A6,1F0B6,1F0C6,1F0D6,1F0A7,1F0B7,1F0C7,1F0D7,1F0A8,1F0B8,1F0C8,1F0D8,1F0A9,1F0B9,1F0C9,1F0D9,1F0AA,1F0BA,1F0CA,1F0DA,1F0AB,1F0BB,1F0CB,1F0DB,1F0AD,1F0BD,1F0CD,1F0DD,1F0AE,1F0BE,1F0CE,1F0DE \
    --flavor=woff2 \
    --output-file=Symbola-AjYx.subset.card.woff2
```

1. Create DB

Run create script `/create.db.sql` on mysql instance to build tables, functions, and views.

2. Create ~/config.php

Create a new file config.php at the root of this project and enter required variables unique to your config. See config.php.example for more information.

3. Generate VAPID keys for web push

Run create script `./vapid.generate` in a bash shell to generate vapid keys for Web Push encryption.

# build project settings

1. open project directory and init npm
```bash
    npm init -y;
    npm install --save-dev webpack webpack-cli;
    npm install --save-dev cssnano;
    npm install --save-dev postcss;
    npm install --save-dev postcss-cli;
```

2. create package.json
```
{
  "name": "card.html",
  "version": "1.0.0",
  "scripts": {
    "clean": "rm dist/main.min.css; rm dist/app.min.js;",
    "buildcss": "cat css/scaling.css css/global.css css/layers.css css/screen.css css/board.css css/card.css css/drag.css css/gameview.css css/ui.css css/pulldown.css css/notifier.css css/avatar.css css/layout-post.css | postcss > dist/styles.min.css; cat css/font.css css/variables.css css/calc.css css/patch.css | postcss > dist/inline.min.css;",
    "csstest": "cat css/scaling.css | postcss > dist/scaling.min.css",
    "buildjs": "webpack --mode production"
  },
  "license": "ISC",
  "devDependencies": {
    "cssnano": "^5.1.12",
    "postcss-cli": "^10.0.0",
    "webpack": "^5.74.0",
    "webpack-cli": "^4.10.0"
  }
}
```

3. create webpack.config.js
```
const webpack = require('webpack');
const path = require('path');

const config = {
  entry: './js/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.min.js'
  }
};
module.exports = config;
```

4. create postcss.config.js
```
module.exports = {
    plugins: [
        require('cssnano')({
            preset: 'default',
        }),
    ],
};
```

4. update handling in .htaccess
```
    # app redirections
    # redirect styles.css to php
    #RewriteRule ^css/styles.css(.*)$ css/styles.php [L,NC]
    # redirect css
    RewriteRule ^css/styles.css(.*)$ dist/styles.min.css [L,NC]
    # redirect js
    RewriteRule ^js/app.js(.*)$ dist/app.min.js [L,NC]
    # exclude dist directory from redirection
    RewriteRule ^dist/? - [L,NC]
```

5. update includes/head.php to look at minimized inline styles
```
    <style><?php
        include 'dist/inline.min.css';
    ?></style>
```

6. commit these changes to the deployment branch

7. after deployment run these commands to build
```
    npm run buildcss;
    npm run buildjs;
```
