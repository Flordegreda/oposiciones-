<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Crea ficha planta/insecto desde una captura e identifica el avistamiento.
 */
function fdg_campo_ajax_crear_ficha() {
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_send_json_error( 'No autorizado', 403 );
	}

	if ( ! fdg_fase1_verify_nonce() ) {
		wp_send_json_error( 'Nonce inválido', 403 );
	}

	$avistamiento_id = isset( $_POST['avistamiento_id'] ) ? (int) $_POST['avistamiento_id'] : 0;
	$tipo            = isset( $_POST['tipo_ficha'] ) ? sanitize_text_field( wp_unslash( $_POST['tipo_ficha'] ) ) : '';

	if ( ! $avistamiento_id || 'avistamiento' !== get_post_type( $avistamiento_id ) ) {
		wp_send_json_error( 'Captura no encontrada', 404 );
	}

	if ( ! in_array( $tipo, array( 'plantas', 'insectos' ), true ) ) {
		wp_send_json_error( 'Tipo de ficha no válido', 400 );
	}

	$nombre = isset( $_POST['nombre'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['nombre'] ) ) ) : '';
	if ( '' === $nombre ) {
		$nombre = trim( (string) fdg_fase1_get_meta( $avistamiento_id, 'nombre_provisional' ) );
	}
	if ( '' === $nombre ) {
		$nombre = get_the_title( $avistamiento_id );
	}
	$nombre = preg_replace( '/^Especie sin identificar\s*[—-]\s*/iu', '', $nombre );
	if ( '' === $nombre ) {
		wp_send_json_error( 'Escribe un nombre para la nueva ficha (campo provisional).', 400 );
	}

	$ficha_id = wp_insert_post(
		array(
			'post_type'   => $tipo,
			'post_status' => 'draft',
			'post_title'  => $nombre,
			'post_content' => '',
		),
		true
	);

	if ( is_wp_error( $ficha_id ) ) {
		wp_send_json_error( $ficha_id->get_error_message(), 500 );
	}

	$thumb_id = get_post_thumbnail_id( $avistamiento_id );
	if ( $thumb_id ) {
		set_post_thumbnail( $ficha_id, $thumb_id );
	}

	list( $lat, $lng ) = fdg_fase1_parse_coords( $avistamiento_id );
	$coords = fdg_fase1_get_meta( $avistamiento_id, 'coordenadas' );
	$habitat = fdg_fase1_get_meta( $avistamiento_id, 'habitat' );
	$notas   = fdg_fase1_get_meta( $avistamiento_id, 'notas' );

	if ( $coords ) {
		update_post_meta( $ficha_id, 'coordenadas', $coords );
	}
	if ( $lat && $lng ) {
		update_post_meta( $ficha_id, 'lat', (string) $lat );
		update_post_meta( $ficha_id, 'lng', (string) $lng );
	}
	if ( $habitat ) {
		update_post_meta( $ficha_id, 'habitat', $habitat );
	}
	if ( $notas ) {
		$existing = get_post_field( 'post_content', $ficha_id );
		$bloque   = '<p><em>Notas de la captura de campo:</em> ' . esc_html( $notas ) . '</p>';
		wp_update_post(
			array(
				'ID'           => $ficha_id,
				'post_content' => $existing . $bloque,
			)
		);
	}

	$tipo_especie = ( 'insectos' === $tipo ) ? 'insecto' : 'planta';
	$result       = fdg_fase1_aplicar_identificacion(
		$avistamiento_id,
		array(
			'especie_id'         => $ficha_id,
			'nombre_provisional' => '',
			'tipo'               => $tipo_especie,
		)
	);

	if ( is_wp_error( $result ) ) {
		wp_delete_post( $ficha_id, true );
		wp_send_json_error( $result->get_error_message(), 400 );
	}

	wp_send_json_success(
		array(
			'ficha_id'   => $ficha_id,
			'edit_url'   => get_edit_post_link( $ficha_id, 'raw' ),
			'view_url'   => get_permalink( $ficha_id ),
			'titulo'     => get_the_title( $ficha_id ),
			'tipo'       => $tipo_especie,
			'count'      => fdg_fase1_pendientes_count(),
		)
	);
}
add_action( 'wp_ajax_fdg_crear_ficha_desde_captura', 'fdg_campo_ajax_crear_ficha' );

function fdg_campo_url_nueva_ficha_manual( $post_type ) {
	return admin_url( 'post-new.php?post_type=' . rawurlencode( $post_type ) );
}
