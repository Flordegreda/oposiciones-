<?php
/**
 * One-shot: add Blog link to Flor de Greda primary menu. DELETE after use.
 */
require __DIR__ . '/wp-load.php';

if ( ( $_GET['token'] ?? '' ) !== 'fdg-add-blog-link-2026' ) {
	status_header( 403 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	echo 'Forbidden';
	exit;
}

$blog_url = 'https://blog.flordegreda.es/';
$log      = array();

$menus = wp_get_nav_menus();
$menu  = null;
foreach ( $menus as $m ) {
	if ( 'principal' === $m->slug || false !== stripos( $m->name, 'principal' ) ) {
		$menu = $m;
		break;
	}
}
if ( ! $menu && $menus ) {
	$menu = $menus[0];
}

if ( ! $menu ) {
	header( 'Content-Type: application/json; charset=utf-8' );
	echo wp_json_encode( array( 'ok' => false, 'error' => 'No menu found' ) );
	exit;
}

$log[] = 'menu:' . $menu->slug . ':' . $menu->term_id;

// Avoid duplicates.
$items = wp_get_nav_menu_items( $menu->term_id );
if ( $items ) {
	foreach ( $items as $item ) {
		$url = untrailingslashit( (string) $item->url );
		if ( untrailingslashit( $blog_url ) === $url || 'Blog' === $item->title ) {
			header( 'Content-Type: application/json; charset=utf-8' );
			echo wp_json_encode( array( 'ok' => true, 'log' => array( 'already_exists', 'item:' . $item->ID ) ) );
			exit;
		}
	}
}

$item_id = wp_update_nav_menu_item(
	$menu->term_id,
	0,
	array(
		'menu-item-title'  => 'Blog',
		'menu-item-url'    => $blog_url,
		'menu-item-status' => 'publish',
		'menu-item-type'   => 'custom',
		'menu-item-position' => 40,
	)
);

if ( is_wp_error( $item_id ) ) {
	header( 'Content-Type: application/json; charset=utf-8' );
	echo wp_json_encode( array( 'ok' => false, 'error' => $item_id->get_error_message() ) );
	exit;
}

$log[] = 'created:' . $item_id;

// Soft purge hint for LiteSpeed if available.
if ( class_exists( 'LiteSpeed\Purge' ) && method_exists( 'LiteSpeed\Purge', 'purge_all' ) ) {
	\LiteSpeed\Purge::purge_all();
	$log[] = 'litespeed:purged';
} elseif ( has_action( 'litespeed_purge_all' ) ) {
	do_action( 'litespeed_purge_all' );
	$log[] = 'litespeed:action';
}

header( 'Content-Type: application/json; charset=utf-8' );
echo wp_json_encode(
	array(
		'ok'   => true,
		'menu' => $menu->name,
		'item' => (int) $item_id,
		'url'  => $blog_url,
		'log'  => $log,
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);
