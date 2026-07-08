<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function fdg_fase1_rest_pendientes( WP_REST_Request $request ) {
	$items = array();
	foreach ( fdg_fase1_get_pendientes_ids() as $post_id ) {
		$items[] = fdg_fase1_format_avistamiento( $post_id );
	}
	return rest_ensure_response( $items );
}

function fdg_fase1_rest_avistamientos( WP_REST_Request $request ) {
	$query = new WP_Query(
		array(
			'post_type'      => 'avistamiento',
			'posts_per_page' => 100,
			'post_status'    => 'publish',
			'orderby'        => 'date',
			'order'          => 'DESC',
		)
	);

	$items = array();
	foreach ( $query->posts as $post ) {
		$items[] = fdg_fase1_format_avistamiento( $post->ID );
	}

	return rest_ensure_response( $items );
}

function fdg_fase1_rest_identificar( WP_REST_Request $request ) {
	if ( ! fdg_fase1_verify_nonce() && ! current_user_can( 'edit_posts' ) ) {
		return new WP_Error( 'forbidden', 'No autorizado', array( 'status' => 403 ) );
	}

	$post_id = (int) $request->get_param( 'id' );
	if ( ! $post_id || 'avistamiento' !== get_post_type( $post_id ) ) {
		return new WP_Error( 'invalid', 'Avistamiento no válido', array( 'status' => 400 ) );
	}

	$result = fdg_fase1_aplicar_identificacion(
		$post_id,
		array(
			'especie_id'         => (int) $request->get_param( 'especie_id' ),
			'nombre_provisional' => sanitize_text_field( (string) $request->get_param( 'nombre_provisional' ) ),
			'tipo'               => sanitize_text_field( (string) $request->get_param( 'tipo' ) ),
			'nc'                 => sanitize_text_field( (string) $request->get_param( 'nc' ) ),
		)
	);

	if ( is_wp_error( $result ) ) {
		return $result;
	}

	return rest_ensure_response(
		array(
			'ok'   => true,
			'item' => fdg_fase1_format_avistamiento( $post_id ),
		)
	);
}

function fdg_fase1_ajax_identificar() {
	if ( ! fdg_fase1_verify_nonce() || ! current_user_can( 'edit_posts' ) ) {
		wp_send_json_error( 'No autorizado', 403 );
	}

	$post_id = isset( $_POST['avistamiento_id'] ) ? (int) $_POST['avistamiento_id'] : 0;
	$result  = fdg_fase1_aplicar_identificacion(
		$post_id,
		array(
			'especie_id'         => isset( $_POST['especie_id'] ) ? (int) $_POST['especie_id'] : 0,
			'nombre_provisional' => isset( $_POST['nombre_provisional'] ) ? sanitize_text_field( wp_unslash( $_POST['nombre_provisional'] ) ) : '',
			'tipo'               => isset( $_POST['tipo_especie'] ) ? sanitize_text_field( wp_unslash( $_POST['tipo_especie'] ) ) : '',
			'nc'                 => isset( $_POST['nc'] ) ? sanitize_text_field( wp_unslash( $_POST['nc'] ) ) : '',
		)
	);

	if ( is_wp_error( $result ) ) {
		wp_send_json_error( $result->get_error_message(), 400 );
	}

	wp_send_json_success(
		array(
			'item'  => fdg_fase1_format_avistamiento( $post_id ),
			'count' => fdg_fase1_pendientes_count(),
		)
	);
}
add_action( 'wp_ajax_fdg_identificar_avistamiento', 'fdg_fase1_ajax_identificar' );

function fdg_fase1_rest_campo_nonce() {
	return rest_ensure_response(
		array(
			'nonce' => fdg_campo_create_nonce(),
		)
	);
}

function fdg_fase1_register_rest_routes() {
	register_rest_route(
		'fdg/v1',
		'/campo/nonce',
		array(
			'methods'             => 'GET',
			'callback'            => 'fdg_fase1_rest_campo_nonce',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'fdg/v1',
		'/avistamientos',
		array(
			'methods'             => 'GET',
			'callback'            => 'fdg_fase1_rest_avistamientos',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);

	register_rest_route(
		'fdg/v1',
		'/avistamientos/(?P<id>\d+)',
		array(
			'methods'             => 'DELETE',
			'callback'            => 'fdg_fase1_rest_borrar_avistamiento',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);

	register_rest_route(
		'fdg/v1',
		'/avistamientos/(?P<id>\d+)/identificar',
		array(
			'methods'             => 'POST',
			'callback'            => 'fdg_fase1_rest_identificar',
			'permission_callback' => '__return_true',
		)
	);
}
add_action( 'rest_api_init', 'fdg_fase1_register_rest_routes' );

function fdg_fase1_override_pendientes_route( $endpoints ) {
	$route = '/fdg/v1/pendientes';
	if ( empty( $endpoints[ $route ] ) ) {
		return $endpoints;
	}
	foreach ( $endpoints[ $route ] as $i => $handler ) {
		if ( ! is_array( $handler ) ) {
			continue;
		}
		$methods = isset( $handler['methods'] ) ? $handler['methods'] : 0;
		if ( $methods & WP_REST_Server::READABLE ) {
			$endpoints[ $route ][ $i ]['callback']            = 'fdg_fase1_rest_pendientes';
			$endpoints[ $route ][ $i ]['permission_callback'] = '__return_true';
		}
	}
	return $endpoints;
}
add_filter( 'rest_endpoints', 'fdg_fase1_override_pendientes_route', 99 );
