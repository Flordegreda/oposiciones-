<?php
/**
 * Flor de Greda Blog — functions
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FDG_BLOG_VERSION', '1.1.2' );

function fdg_blog_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' )
	);
	add_theme_support( 'automatic-feed-links' );
	load_theme_textdomain( 'flordegreda-blog', get_template_directory() . '/languages' );
	register_nav_menus(
		array(
			'primary' => __( 'Menú principal', 'flordegreda-blog' ),
		)
	);
}
add_action( 'after_setup_theme', 'fdg_blog_setup' );

/** Forzar castellano en el front. */
function fdg_blog_locale( $locale ) {
	return 'es_ES';
}
add_filter( 'locale', 'fdg_blog_locale' );

/**
 * Una sola vez: idioma, fechas, quitar página/menú Sobre.
 */
function fdg_blog_castellano_cleanup() {
	if ( get_option( 'fdg_blog_castellano_v1' ) ) {
		return;
	}

	update_option( 'WPLANG', 'es_ES' );
	update_option( 'timezone_string', 'Europe/Madrid' );
	update_option( 'date_format', 'j \\d\\e F \\d\\e Y' );
	update_option( 'time_format', 'H:i' );

	if ( ! function_exists( 'wp_download_language_pack' ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/translation-install.php';
	}
	if ( function_exists( 'wp_download_language_pack' ) ) {
		wp_download_language_pack( 'es_ES' );
	}

	$page = get_page_by_path( 'sobre' );
	if ( $page ) {
		wp_trash_post( (int) $page->ID );
	}

	$menus = wp_get_nav_menus();
	foreach ( $menus as $menu ) {
		$items = wp_get_nav_menu_items( $menu->term_id );
		if ( ! $items ) {
			continue;
		}
		foreach ( $items as $item ) {
			$url   = (string) $item->url;
			$title = (string) $item->title;
			if ( stripos( $url, '/sobre' ) !== false || strcasecmp( $title, 'Sobre' ) === 0 ) {
				wp_delete_post( (int) $item->ID, true );
			}
		}
	}

	update_option( 'fdg_blog_castellano_v1', 1 );
}
add_action( 'init', 'fdg_blog_castellano_cleanup', 5 );

function fdg_blog_assets() {
	wp_enqueue_style(
		'fdg-blog-fonts',
		'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap',
		array(),
		null
	);
	wp_enqueue_style(
		'fdg-blog-style',
		get_stylesheet_uri(),
		array( 'fdg-blog-fonts' ),
		FDG_BLOG_VERSION
	);
}
add_action( 'wp_enqueue_scripts', 'fdg_blog_assets' );

function fdg_blog_excerpt_more( $more ) {
	return '…';
}
add_filter( 'excerpt_more', 'fdg_blog_excerpt_more' );

function fdg_blog_excerpt_length( $length ) {
	return 28;
}
add_filter( 'excerpt_length', 'fdg_blog_excerpt_length' );

/**
 * Fallback menu when none is assigned.
 */
function fdg_blog_fallback_menu() {
	echo '<ul>';
	echo '<li><a href="' . esc_url( home_url( '/' ) ) . '">' . esc_html__( 'Inicio', 'flordegreda-blog' ) . '</a></li>';
	echo '<li><a href="https://flordegreda.es/" rel="noopener">' . esc_html__( 'Catálogo', 'flordegreda-blog' ) . '</a></li>';
	echo '</ul>';
}
