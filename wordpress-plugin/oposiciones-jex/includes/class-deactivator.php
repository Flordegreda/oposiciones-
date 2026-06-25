<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Deactivator {

	public static function deactivate(): void {
		flush_rewrite_rules();
	}
}
