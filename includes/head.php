<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title><?php echo $title ?></title>
    <meta property="og:title" content="<?php echo $title ?>">
    <meta property="og:type" content="game">
    <?php if ( !preg_match( '/^(?=.*facebot)(?=.*twitterbot).*$/i', $_SERVER[ 'HTTP_USER_AGENT' ] ) ) { ?>
        <meta property="og:image" content="/asset/board-icon@512x.png?vers=<?php echo VERSION; ?>" />
    <?php } ?>
    <link rel="manifest" href="/webmanifest?vers=<?php echo VERSION; ?>" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="rgb(239, 182, 91)" />
    <link rel="icon" href="/asset/board-icon@180x.png?vers=<?php echo VERSION; ?>" />
    <link rel="shortcut icon" href="/asset/board-icon@180x.png?vers=<?php echo VERSION; ?>" />
    <link rel="apple-touch-icon" href="/asset/board-icon@180x.png?vers=<?php echo VERSION; ?>" sizes="180x180" />
    <script type="module" src="/js/app.js?vers=<?php echo VERSION; ?>" ></script>
    <script>
        let env = {
            credits: <?php echo CREDITS; ?>,
            dedication: <?php echo DEDICATION; ?>,
            sourceurl: '<?php echo SOURCECODEURL; ?>',
            author: '<?php echo SOURCEAUTHOR; ?>',
            changelog: <?php echo CHANGELOG; ?>,
            version: '<?php echo VERSION; ?>',
            vapidkey: '<?php echo encryption::vapidPublic(); ?>'
        };
    </script>
    <style><?php
        include 'css/inline.php';
    ?></style>
    <link rel="stylesheet" href="/css/style.css?vers=<?php echo VERSION; ?>" />
</head>