<?php
require __DIR__ . "/wp-load.php";
if (($_GET["token"]??"")!=="fdg-purge-2026"){exit("no");}
if (has_action("litespeed_purge_all")) do_action("litespeed_purge_all");
echo "purged";
