<?php
/**
 * One-shot setup for Flor de Greda Blog. DELETE after use.
 */
require __DIR__ . '/wp/wp-load.php';

$token = isset( $_GET['token'] ) ? (string) $_GET['token'] : '';
if ( $token !== 'fdg-blog-setup-2026' ) {
	status_header( 403 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	echo 'Forbidden';
	exit;
}

if ( ! function_exists( 'switch_theme' ) ) {
	require_once ABSPATH . 'wp-admin/includes/theme.php';
}

$log = array();

// Activate theme.
$theme = wp_get_theme( 'flordegreda-blog' );
if ( $theme->exists() ) {
	switch_theme( 'flordegreda-blog' );
	$log[] = 'theme:activated';
} else {
	$log[] = 'theme:MISSING';
}

update_option( 'blogname', 'Flor de Greda' );
update_option( 'blogdescription', 'Blog' );
update_option( 'timezone_string', 'Europe/Madrid' );
update_option( 'date_format', 'j \d\e F \d\e Y' );
update_option( 'WPLANG', 'es_ES' );
update_option( 'show_on_front', 'posts' );
update_option( 'posts_per_page', 10 );
$log[] = 'options:updated';

// Delete default content.
$hello = get_page_by_path( 'hello-world', OBJECT, 'post' );
if ( ! $hello ) {
	$q = new WP_Query(
		array(
			'name'           => 'hello-world',
			'post_type'      => 'post',
			'posts_per_page' => 1,
			'post_status'    => 'any',
		)
	);
	if ( $q->have_posts() ) {
		$hello = $q->posts[0];
	}
}
if ( $hello ) {
	wp_delete_post( $hello->ID, true );
	$log[] = 'deleted:hello-world';
}

$sample = get_page_by_path( 'sample-page' );
if ( $sample ) {
	wp_delete_post( $sample->ID, true );
	$log[] = 'deleted:sample-page';
}

// About page.
$about = get_page_by_path( 'sobre' );
if ( ! $about ) {
	$about_id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => 'Sobre',
			'post_name'    => 'sobre',
			'post_content' => "<p>Este es el cuaderno abierto de <strong>Flor de Greda</strong>: notas desde Salvatierra de los Barros sobre el campo, el pueblo y lo que vaya surgiendo.</p>\n<p>El catálogo de plantas e insectos sigue en <a href=\"https://flordegreda.es/\">flordegreda.es</a>.</p>",
		),
		true
	);
	$log[] = is_wp_error( $about_id ) ? 'about:error' : 'about:created';
} else {
	$about_id = $about->ID;
	$log[]    = 'about:exists';
}

// First post.
$posts = get_posts( array( 'numberposts' => 1, 'post_status' => 'publish' ) );
if ( ! $posts ) {
	$post_id = wp_insert_post(
		array(
			'post_type'    => 'post',
			'post_status'  => 'publish',
			'post_title'   => 'Abrir el cuaderno',
			'post_name'    => 'abrir-el-cuaderno',
			'post_content' => "<p>Flor de Greda nació como catálogo del monte. Aquí el tono es otro: más libre, más amplio.</p>\n<p>Habrá plantas y bichos, sí, pero también pueblo, caminos, cocina, memoria y lo que el día traiga.</p>\n<blockquote><p>Un rincón del bosque encantado — y también de lo que hay alrededor.</p></blockquote>\n<p>Si vienes desde el catálogo, bienvenido. Si llegas de paso, también.</p>",
		),
		true
	);
	$log[] = is_wp_error( $post_id ) ? 'post:error' : 'post:created';
} else {
	$log[] = 'post:exists';
}

// Menu.
$menu_name = 'Principal';
$menu      = wp_get_nav_menu_object( $menu_name );
if ( ! $menu ) {
	$menu_id = wp_create_nav_menu( $menu_name );
} else {
	$menu_id = (int) $menu->term_id;
	$items   = wp_get_nav_menu_items( $menu_id );
	if ( $items ) {
		foreach ( $items as $item ) {
			wp_delete_post( $item->ID, true );
		}
	}
}

if ( ! is_wp_error( $menu_id ) ) {
	wp_update_nav_menu_item(
		$menu_id,
		0,
		array(
			'menu-item-title'  => 'Inicio',
			'menu-item-url'    => home_url( '/' ),
			'menu-item-status' => 'publish',
			'menu-item-type'   => 'custom',
		)
	);
	if ( ! empty( $about_id ) && ! is_wp_error( $about_id ) ) {
		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-title'     => 'Sobre',
				'menu-item-object'    => 'page',
				'menu-item-object-id' => (int) $about_id,
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
			)
		);
	}
	wp_update_nav_menu_item(
		$menu_id,
		0,
		array(
			'menu-item-title'  => 'Catálogo',
			'menu-item-url'    => 'https://flordegreda.es/',
			'menu-item-status' => 'publish',
			'menu-item-type'   => 'custom',
		)
	);
	$locations            = get_theme_mod( 'nav_menu_locations', array() );
	$locations['primary'] = (int) $menu_id;
	set_theme_mod( 'nav_menu_locations', $locations );
	$log[] = 'menu:ready';
}

flush_rewrite_rules( false );
$log[] = 'rewrites:flushed';

header( 'Content-Type: application/json; charset=utf-8' );
echo wp_json_encode(
	array(
		'ok'   => true,
		'home' => home_url( '/' ),
		'log'  => $log,
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);
