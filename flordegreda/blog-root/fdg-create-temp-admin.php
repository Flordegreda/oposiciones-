<?php
/**
 * One-shot temporary admin creator. DELETE after use.
 */
require __DIR__ . '/wp/wp-load.php';

$token = isset( $_GET['token'] ) ? (string) $_GET['token'] : '';
if ( $token !== 'fdg-temp-admin-2026-x7k' ) {
	status_header( 403 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	echo 'Forbidden';
	exit;
}

$user_login = 'fdg_temp_admin';
$user_email = 'fdg-temp@flordegreda.es';
$user_pass  = 'TmpBlog_' . wp_generate_password( 14, true, true );

$existing = get_user_by( 'login', $user_login );
if ( $existing ) {
	wp_set_password( $user_pass, $existing->ID );
	$user_id = $existing->ID;
	$existing->set_role( 'administrator' );
	$action = 'updated';
} else {
	$user_id = wp_create_user( $user_login, $user_pass, $user_email );
	if ( is_wp_error( $user_id ) ) {
		status_header( 500 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'ERROR: ' . $user_id->get_error_message();
		exit;
	}
	$user = new WP_User( $user_id );
	$user->set_role( 'administrator' );
	$action = 'created';
}

header( 'Content-Type: application/json; charset=utf-8' );
echo wp_json_encode(
	array(
		'ok'       => true,
		'action'   => $action,
		'user_id'  => (int) $user_id,
		'login'    => $user_login,
		'password' => $user_pass,
		'admin'    => home_url( '/wp/wp-login.php' ),
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);
