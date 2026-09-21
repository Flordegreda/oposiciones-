<?php
/**
 * One-shot: set Site Address to subdomain root; WordPress Address stays in /wp/.
 * Delete this file after running.
 */
require __DIR__ . '/wp/wp-load.php';

if ( ! current_user_can( 'manage_options' ) && ! defined( 'FDG_ALLOW_URL_FIX' ) ) {
	// Allow unauthenticated one-shot with secret token in query.
}

$token = isset( $_GET['token'] ) ? (string) $_GET['token'] : '';
if ( $token !== 'fdg-blog-root-2026' ) {
	status_header( 403 );
	echo 'Forbidden';
	exit;
}

update_option( 'home', 'https://blog.flordegreda.es' );
update_option( 'siteurl', 'https://blog.flordegreda.es/wp' );

// Flush rewrite rules if possible.
flush_rewrite_rules( false );

header( 'Content-Type: text/plain; charset=utf-8' );
echo "OK\n";
echo 'home=' . get_option( 'home' ) . "\n";
echo 'siteurl=' . get_option( 'siteurl' ) . "\n";
