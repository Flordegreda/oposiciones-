<?php
/**
 * REST API — publicar fichas desde flordegrea-photos.
 * Autenticación: Application Password de WordPress (Basic Auth).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'fdg_register_publish_routes' );

function fdg_register_publish_routes() {
	register_rest_route(
		'fdg/v1',
		'/publish',
		array(
			'methods'             => 'POST',
			'callback'            => 'fdg_rest_publish_species',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);
}

/**
 * @param WP_REST_Request $request
 */
function fdg_rest_publish_species( $request ) {
	$body = $request->get_json_params();
	if ( empty( $body ) || empty( $body['type'] ) ) {
		return new WP_Error( 'fdg_invalid', 'Falta el cuerpo JSON (type, scientificName, …)', array( 'status' => 400 ) );
	}

	$type = sanitize_key( $body['type'] );
	if ( ! in_array( $type, array( 'planta', 'insecto' ), true ) ) {
		return new WP_Error( 'fdg_type', 'type debe ser planta o insecto', array( 'status' => 400 ) );
	}

	$post_type = 'planta' === $type ? 'plantas' : 'insectos';
	$wp_id     = ! empty( $body['wpPostId'] ) ? (int) $body['wpPostId'] : 0;
	$slug      = sanitize_title( $body['wpSlug'] ?? $body['scientificName'] ?? '' );

	if ( ! $slug ) {
		return new WP_Error( 'fdg_slug', 'Falta wpSlug o scientificName', array( 'status' => 400 ) );
	}

	$nc    = sanitize_text_field( $body['scientificName'] ?? '' );
	$comun = sanitize_text_field( $body['commonName'] ?? '' );
	$title = $nc ?: $slug;

	$postarr = array(
		'post_type'   => $post_type,
		'post_status' => 'publish',
		'post_title'  => $title,
		'post_name'   => $slug,
		'post_content'=> '',
	);

	if ( $wp_id && get_post( $wp_id ) ) {
		$postarr['ID'] = $wp_id;
		$post_id       = wp_update_post( $postarr, true );
	} else {
		$existing = get_page_by_path( $slug, OBJECT, $post_type );
		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
			$post_id       = wp_update_post( $postarr, true );
		} else {
			$post_id = wp_insert_post( $postarr, true );
		}
	}

	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}

	$nc_key = 'planta' === $type ? 'nombre_cientifico' : 'nombre_cientifico_ins';
	$com_key = 'planta' === $type ? 'nombre_comun' : 'nombre_comun_ins';
	update_post_meta( $post_id, $nc_key, $nc );
	update_post_meta( $post_id, $com_key, $com );

	if ( ! empty( $body['curiosidad'] ) ) {
		update_post_meta( $post_id, 'curiosidad', sanitize_textarea_field( $body['curiosidad'] ) );
	}
	if ( ! empty( $body['descripcion'] ) ) {
		update_post_meta( $post_id, 'descripcion', sanitize_textarea_field( $body['descripcion'] ) );
	} elseif ( array_key_exists( 'descripcion', $body ) ) {
		delete_post_meta( $post_id, 'descripcion' );
	}

	$months = $body['activeMonths'] ?? array();
	if ( is_array( $months ) && $months ) {
		$labels = array();
		$nombres = array( 1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto', 9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre' );
		foreach ( $months as $m ) {
			$m = (int) $m;
			if ( isset( $nombres[ $m ] ) ) {
				$labels[] = $nombres[ $m ];
			}
		}
		$meta_key = 'planta' === $type ? 'floracion' : 'vuelo';
		update_post_meta( $post_id, $meta_key, $labels );
	}

	if ( 'planta' === $type && ! empty( $body['familia'] ) ) {
		update_post_meta( $post_id, 'familia', sanitize_text_field( $body['familia'] ) );
	}
	if ( 'insecto' === $type && ! empty( $body['orden'] ) ) {
		update_post_meta( $post_id, 'orden', sanitize_text_field( $body['orden'] ) );
	}
	if ( ! empty( $body['habitat'] ) ) {
		update_post_meta( $post_id, 'habitat', sanitize_text_field( $body['habitat'] ) );
	}
	if ( ! empty( $body['zonaTags'] ) && is_array( $body['zonaTags'] ) ) {
		update_post_meta( $post_id, 'zona', array_map( 'sanitize_text_field', $body['zonaTags'] ) );
	}

	$gallery_ids = array();
	if ( array_key_exists( 'images', $body ) && is_array( $body['images'] ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		foreach ( $body['images'] as $idx => $img ) {
			$att_id = fdg_rest_upload_base64_image( $img, $post_id, $nc );
			if ( $att_id ) {
				$gallery_ids[] = $att_id;
				if ( 0 === $idx ) {
					set_post_thumbnail( $post_id, $att_id );
				}
			}
		}
		$gal_key = 'planta' === $type ? 'galeria' : 'galeria_ins';
		if ( $gallery_ids ) {
			update_post_meta( $post_id, $gal_key, $gallery_ids );
		} else {
			delete_post_meta( $post_id, $gal_key );
			delete_post_thumbnail( $post_id );
		}
	}

	return rest_ensure_response(
		array(
			'ok'      => true,
			'postId'  => $post_id,
			'url'     => get_permalink( $post_id ),
			'slug'    => $slug,
			'gallery' => $gallery_ids,
		)
	);
}

/**
 * @param array $img filename, data (base64), mime
 */
function fdg_rest_upload_base64_image( $img, $post_id, $alt ) {
	if ( empty( $img['data'] ) ) {
		return 0;
	}
	$data = $img['data'];
	if ( strpos( $data, 'base64,' ) !== false ) {
		$data = substr( $data, strpos( $data, 'base64,' ) + 7 );
	}
	$raw = base64_decode( $data, true );
	if ( ! $raw ) {
		return 0;
	}
	$mime = $img['mime'] ?? 'image/jpeg';
	$ext  = 'image/png' === $mime ? 'png' : ( 'image/webp' === $mime ? 'webp' : 'jpg' );
	$name = sanitize_file_name( ( $img['filename'] ?? 'foto' ) . '.' . $ext );

	$tmp = wp_tempnam( $name );
	if ( ! $tmp ) {
		return 0;
	}
	file_put_contents( $tmp, $raw );

	$file = array(
		'name'     => $name,
		'type'     => $mime,
		'tmp_name' => $tmp,
		'error'    => 0,
		'size'     => strlen( $raw ),
	);

	$att_id = media_handle_sideload( $file, $post_id, $alt );
	if ( is_wp_error( $att_id ) ) {
		@unlink( $tmp );
		return 0;
	}
	return (int) $att_id;
}
