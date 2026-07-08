<?php
/**
 * Plugin Name: Flor de Greda — Campo
 * Description: Captura en /campo/, identificación de avistamientos y compartir fichas en Facebook.
 * Version: 3.2.2
 * Author: Tomás Mesa
 * Text Domain: fdg-campo
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FDG_CAMPO_VERSION', '3.2.2' );
define( 'FDG_CAMPO_FILE', __FILE__ );
define( 'FDG_CAMPO_DIR', plugin_dir_path( __FILE__ ) );
define( 'FDG_CAMPO_URL', plugin_dir_url( __FILE__ ) );

require_once FDG_CAMPO_DIR . 'includes/meta-helpers.php';
require_once FDG_CAMPO_DIR . 'includes/rest-ajax.php';
require_once FDG_CAMPO_DIR . 'includes/guardar-avistamiento.php';
require_once FDG_CAMPO_DIR . 'includes/borrar-avistamiento.php';
require_once FDG_CAMPO_DIR . 'includes/crear-ficha.php';
require_once FDG_CAMPO_DIR . 'includes/ficha-mapa.php';
require_once FDG_CAMPO_DIR . 'includes/imagenes.php';
require_once FDG_CAMPO_DIR . 'includes/compartir-redes.php';
require_once FDG_CAMPO_DIR . 'includes/setup.php';
require_once FDG_CAMPO_DIR . 'includes/admin-page.php';

register_activation_hook( __FILE__, 'fdg_campo_activate' );
register_deactivation_hook( __FILE__, 'fdg_campo_deactivate' );
