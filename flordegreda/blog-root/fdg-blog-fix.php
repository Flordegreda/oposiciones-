<?php
require __DIR__ . '/wp/wp-load.php';
if ( ( $_GET['token'] ?? '' ) !== 'fdg-blog-fix-2026' ) { status_header(403); exit('Forbidden'); }
update_option( 'date_format', 'j/n/Y' );
$cat = get_category_by_slug( 'uncategorized' );
if ( ! $cat ) {
	$cats = get_categories( array( 'hide_empty' => false ) );
	foreach ( $cats as $c ) {
		if ( $c->term_id === 1 || strtolower( $c->name ) === 'uncategorized' || strtolower( $c->name ) === 'sin categoría' ) {
			$cat = $c; break;
		}
	}
}
if ( $cat ) {
	wp_update_term( (int) $cat->term_id, 'category', array( 'name' => 'Notas', 'slug' => 'notas' ) );
}
header( 'Content-Type: text/plain' );
echo "OK date=" . get_option('date_format') . "\n";
