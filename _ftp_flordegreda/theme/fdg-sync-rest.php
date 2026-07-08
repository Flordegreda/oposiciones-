<?php
/**
 * REST API — listar fichas publicadas para sincronizar con flordegrea-photos.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'fdg_register_sync_routes' );

function fdg_register_sync_routes() {
	register_rest_route(
		'fdg/v1',
		'/sync',
		array(
			'methods'             => 'GET',
			'callback'            => 'fdg_rest_sync_list',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);
}

/**
 * Meses 1–12 desde meta floracion/vuelo (nombres en español).
 */
function fdg_sync_months_from_meta( $post_id, $type ) {
	$key = 'planta' === $type ? 'floracion' : 'vuelo';
	$raw = get_post_meta( $post_id, $key, true );
	if ( is_string( $raw ) && strpos( $raw, 'a:' ) === 0 ) {
		$raw = maybe_unserialize( $raw );
	}
	if ( ! is_array( $raw ) ) {
		return array();
	}
	$nombres = array(
		'Enero' => 1, 'Febrero' => 2, 'Marzo' => 3, 'Abril' => 4,
		'Mayo' => 5, 'Junio' => 6, 'Julio' => 7, 'Agosto' => 8,
		'Septiembre' => 9, 'Octubre' => 10, 'Noviembre' => 11, 'Diciembre' => 12,
	);
	$out = array();
	foreach ( $raw as $label ) {
		$label = trim( (string) $label );
		if ( isset( $nombres[ $label ] ) ) {
			$out[] = $nombres[ $label ];
		}
	}
	sort( $out );
	return array_values( array_unique( $out ) );
}

/**
 * @param WP_Post $post
 */
function fdg_sync_item_from_post( $post, $type ) {
	$post_id = (int) $post->ID;
	$nc_key  = 'planta' === $type ? 'nombre_cientifico' : 'nombre_cientifico_ins';
	$com_key = 'planta' === $type ? 'nombre_comun' : 'nombre_comun_ins';

	$zona_tags = array();
	$zona_terms = get_the_terms( $post_id, 'zona' );
	if ( $zona_terms && ! is_wp_error( $zona_terms ) ) {
		$zona_tags = wp_list_pluck( $zona_terms, 'name' );
	}

	$habitat = '';
	if ( 'insecto' === $type ) {
		$hab_terms = get_the_terms( $post_id, 'habitat_insecto' );
		if ( $hab_terms && ! is_wp_error( $hab_terms ) ) {
			$habitat = implode( ', ', wp_list_pluck( $hab_terms, 'name' ) );
		}
	}
	if ( ! $habitat ) {
		$hab_raw = get_post_meta( $post_id, 'habitat', true );
		if ( is_string( $hab_raw ) && strpos( $hab_raw, 'a:' ) === 0 ) {
			$hab_raw = maybe_unserialize( $hab_raw );
		}
		if ( is_array( $hab_raw ) ) {
			$names = array();
			foreach ( $hab_raw as $hid ) {
				$t = get_term( (int) $hid, 'habitat' );
				if ( $t && ! is_wp_error( $t ) ) {
					$names[] = $t->name;
				}
			}
			$habitat = implode( ', ', $names );
		} elseif ( is_string( $hab_raw ) ) {
			$habitat = $hab_raw;
		}
	}

	$familia = '';
	if ( 'planta' === $type ) {
		$fam_id = get_post_meta( $post_id, 'familia', true );
		if ( $fam_id ) {
			$t = get_term( (int) $fam_id, 'category' );
			if ( $t && ! is_wp_error( $t ) ) {
				$familia = $t->name;
			}
		}
	} else {
		$familia = (string) get_post_meta( $post_id, 'familia_ins', true );
	}

	$orden = '';
	if ( 'insecto' === $type ) {
		$orden_terms = get_the_terms( $post_id, 'orden_insecto' );
		if ( $orden_terms && ! is_wp_error( $orden_terms ) ) {
			$orden = $orden_terms[0]->name;
		}
		if ( ! $orden ) {
			$orden = (string) get_post_meta( $post_id, 'orden', true );
		}
	}

	$descripcion = (string) get_post_meta( $post_id, 'descripcion', true );
	if ( ! $descripcion ) {
		$descripcion = wp_strip_all_tags( $post->post_content );
	}

	return array(
		'type'           => $type,
		'postId'         => $post_id,
		'slug'           => $post->post_name,
		'url'            => get_permalink( $post_id ),
		'scientificName' => (string) get_post_meta( $post_id, $nc_key, true ) ?: $post->post_title,
		'commonName'     => (string) get_post_meta( $post_id, $com_key, true ),
		'descripcion'    => $descripcion,
		'curiosidad'     => (string) get_post_meta( $post_id, 'curiosidad', true ),
		'familia'        => $familia,
		'orden'          => $orden,
		'habitat'        => $habitat,
		'zonaTags'       => $zona_tags,
		'activeMonths'   => fdg_sync_months_from_meta( $post_id, $type ),
		'envergadura'    => (string) get_post_meta( $post_id, 'envergadura', true ),
		'plantasAsociadas' => (string) get_post_meta( $post_id, 'plantas_asociadas', true ),
		'modified'       => get_post_modified_time( 'c', true, $post ),
	);
}

/**
 * @param WP_REST_Request $request
 */
function fdg_rest_sync_list( $request ) {
	$species = array();
	foreach ( array( 'plantas' => 'planta', 'insectos' => 'insecto' ) as $post_type => $type ) {
		$posts = get_posts(
			array(
				'post_type'      => $post_type,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'modified',
				'order'          => 'DESC',
			)
		);
		foreach ( $posts as $post ) {
			$species[] = fdg_sync_item_from_post( $post, $type );
		}
	}

	return rest_ensure_response(
		array(
			'species'  => $species,
			'syncedAt' => gmdate( 'c' ),
			'count'    => count( $species ),
		)
	);
}
