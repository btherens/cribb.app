<!DOCTYPE html>
<html lang="en">
    <?php include 'includes/head.php' ?>
    <body tabindex="-1" class="" >
        <div id="dragmap" ></div>
        <div class="screen top" ><?php echo $board2; ?></div>
        <div class="screen mid show" >
            <div class="screen left"><?php echo $board1; ?></div>
            <div id="notifybar" class="transition" >
                <span></span>
            </div>
            <?php echo $pulldown; ?>

            <div id="mainscreen" >
                <?php echo $gamescreen; ?>
            </div>
            <div class="screen right"><?php echo $board3; ?></div>
        </div>
        <div class="screen bottom" ><?php echo $board4; ?></div>
    </body>
</html>