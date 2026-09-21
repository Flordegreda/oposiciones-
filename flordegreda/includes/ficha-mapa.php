<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Avistamientos vinculados a una ficha de catálogo.
 */
function fdg_campo_get_avistamientos_por_especie( $especie_id ) {
	$especie_id = (int) $especie_id;
	if ( $especie_id <= 0 ) {
		return array();
	}

	$query = new WP_Query(
		array(
			'post_type'      => 'avistamiento',
			'post_status'    => 'publish',
			'posts_per_page' => 50,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'meta_query'     => array(
				array(
					'key'     => 'especie_id',
					'value'   => (string) $especie_id,
					'compare' => '=',
				),
			),
		)
	);

	$items = array();
	foreach ( $query->posts as $post ) {
		$items[] = fdg_fase1_format_avistamiento( $post->ID );
	}

	return $items;
}

/**
 * Avistamientos con coordenadas para el mapa.
 */
function fdg_campo_get_avistamientos_mapa() {
	$query = new WP_Query(
		array(
			'post_type'      => 'avistamiento',
			'post_status'    => 'publish',
			'posts_per_page' => 200,
			'orderby'        => 'date',
			'order'          => 'DESC',
		)
	);

	$items = array();
	foreach ( $query->posts as $post ) {
		$formatted = fdg_campo_format_avistamiento_mapa( $post->ID );
		if ( $formatted ) {
			$items[] = $formatted;
		}
	}

	return $items;
}

function fdg_campo_format_avistamiento_mapa( $post_id ) {
	list( $lat, $lng ) = fdg_fase1_parse_coords( $post_id );
	if ( null === $lat || null === $lng ) {
		return null;
	}

	$formatted   = fdg_fase1_format_avistamiento( $post_id );
	$especie_id  = (int) $formatted['especie_id'];
	$pendiente   = ! empty( $formatted['pendiente'] );
	$tipo        = $formatted['tipo'] ?: 'planta';
	$nc          = $formatted['nc'];
	$comun       = '';
	$url         = '';
	$familia     = '';

	if ( $especie_id > 0 ) {
		$especie = get_post( $especie_id );
		if ( $especie ) {
			$nc   = $especie->post_title;
			$url  = get_permalink( $especie_id );
			$tipo = ( 'insectos' === $especie->post_type ) ? 'insecto' : 'planta';
			if ( function_exists( 'get_field' ) ) {
				$comun = (string) get_field( 'nombre_comun', $especie_id );
			}
			if ( ! $comun ) {
				$comun = (string) get_post_meta( $especie_id, 'nombre_comun', true );
			}
			if ( function_exists( 'get_field' ) ) {
				$familia = (string) get_field( 'familia', $especie_id );
			}
			if ( ! $familia ) {
				$familia = (string) get_post_meta( $especie_id, 'familia', true );
			}
		}
	} elseif ( $pendiente ) {
		$nc = $formatted['nombre_provisional'] ? $formatted['nombre_provisional'] : 'Captura sin identificar';
	}

	$meses_todos = array( 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' );

	return array(
		'id'                => 'av-' . $post_id,
		'avistamiento_id'   => (int) $post_id,
		'origen'            => 'captura',
		'captura_pendiente' => $pendiente,
		'tipo'              => $pendiente ? 'captura' : $tipo,
		'nc'                => $nc,
		'comun'             => $comun,
		'familia'           => $familia,
		'meses'             => $meses_todos,
		'lat'               => $lat,
		'lng'               => $lng,
		'img'               => $formatted['img_full'] ?: $formatted['img'],
		'url'               => $url,
		'fecha'             => $formatted['fecha'],
		'hora'              => $formatted['hora'],
		'habitat'           => $formatted['habitat'],
		'notas'             => $formatted['notas'],
	);
}

function fdg_campo_render_ficha_avistamientos_html( $especie_id ) {
	$items = fdg_campo_get_avistamientos_por_especie( $especie_id );
	if ( ! $items ) {
		return '';
	}

	ob_start();
	?>
	<section class="fdg-seccion fdg-avistamientos fdg-avistamientos--campo" id="fdg-avistamientos-campo">
		<p class="fdg-label">Observaciones de campo</p>
		<p class="fdg-avistamientos__lead"><?php echo esc_html( count( $items ) ); ?> captura<?php echo count( $items ) > 1 ? 's' : ''; ?> tuya<?php echo count( $items ) > 1 ? 's' : ''; ?> en el monte.</p>
		<div class="fdg-avistamientos__grid">
			<?php foreach ( $items as $item ) : ?>
				<figure class="fdg-avistamientos__item">
					<?php if ( ! empty( $item['img_full'] ) || ! empty( $item['img'] ) ) : ?>
						<a href="<?php echo esc_url( $item['img_full'] ?: $item['img'] ); ?>" class="fdg-avistamientos__link" target="_blank" rel="noopener">
							<img src="<?php echo esc_url( $item['img_full'] ?: $item['img'] ); ?>" alt="<?php echo esc_attr( wp_strip_all_tags( $item['nc'] ) ); ?>" loading="lazy">
						</a>
					<?php endif; ?>
					<figcaption class="fdg-avistamientos__meta">
						<?php if ( ! empty( $item['fecha'] ) ) : ?>
							<span class="fdg-avistamientos__fecha"><?php echo esc_html( $item['fecha'] ); ?><?php echo ! empty( $item['hora'] ) ? ' · ' . esc_html( $item['hora'] ) : ''; ?></span>
						<?php endif; ?>
						<?php if ( ! empty( $item['habitat'] ) ) : ?>
							<span class="fdg-avistamientos__habitat"><?php echo esc_html( $item['habitat'] ); ?></span>
						<?php endif; ?>
						<?php if ( ! empty( $item['coords'] ) ) : ?>
							<a class="fdg-avistamientos__mapa" href="<?php echo esc_url( 'https://www.openstreetmap.org/?mlat=' . rawurlencode( (string) $item['lat'] ) . '&mlon=' . rawurlencode( (string) $item['lng'] ) . '#map=16/' . rawurlencode( (string) $item['lat'] ) . '/' . rawurlencode( (string) $item['lng'] ) ); ?>" target="_blank" rel="noopener">Ver en mapa</a>
						<?php endif; ?>
						<?php if ( ! empty( $item['notas'] ) ) : ?>
							<p class="fdg-avistamientos__notas"><?php echo esc_html( $item['notas'] ); ?></p>
						<?php endif; ?>
					</figcaption>
				</figure>
			<?php endforeach; ?>
		</div>
	</section>
	<?php
	return ob_get_clean();
}

function fdg_campo_is_ficha_singular() {
	return is_singular( array( 'plantas', 'insectos' ) );
}

function fdg_campo_is_mapa_page() {
	return is_page( 'mapa' ) || is_page_template( 'page-mapa.php' );
}

function fdg_campo_enqueue_ficha_avistamientos() {
	if ( ! fdg_campo_is_ficha_singular() ) {
		return;
	}

	wp_enqueue_style(
		'fdg-campo-ficha-avistamientos',
		FDG_CAMPO_URL . 'assets/ficha-avistamientos.css',
		array(),
		FDG_CAMPO_VERSION
	);

	wp_enqueue_script(
		'fdg-campo-ficha-avistamientos',
		FDG_CAMPO_URL . 'assets/ficha-avistamientos.js',
		array(),
		FDG_CAMPO_VERSION,
		true
	);

	$html = fdg_campo_render_ficha_avistamientos_html( get_queried_object_id() );
	if ( $html ) {
		wp_add_inline_script(
			'fdg-campo-ficha-avistamientos',
			'window.fdgCampoFichaAvistamientos = ' . wp_json_encode( array( 'html' => $html ) ) . ';',
			'before'
		);
	}
}
add_action( 'wp_enqueue_scripts', 'fdg_campo_enqueue_ficha_avistamientos', 40 );

function fdg_campo_rest_avistamientos_especie( WP_REST_Request $request ) {
	$especie_id = (int) $request->get_param( 'id' );
	if ( $especie_id <= 0 || ! in_array( get_post_type( $especie_id ), array( 'plantas', 'insectos' ), true ) ) {
		return new WP_Error( 'invalid', 'Ficha no encontrada', array( 'status' => 404 ) );
	}

	return rest_ensure_response( fdg_campo_get_avistamientos_por_especie( $especie_id ) );
}

function fdg_campo_rest_mapa_capturas() {
	return rest_ensure_response( fdg_campo_get_avistamientos_mapa() );
}

function fdg_campo_enqueue_mapa_capturas() {
	// Mapa desactivado — rehaciendo en local (ver flordegreda-work/herramientas/editor-zonas.html).
	return;
}
add_action( 'wp_enqueue_scripts', 'fdg_campo_enqueue_mapa_capturas', 40 );

function fdg_campo_register_public_routes() {
	register_rest_route(
		'fdg/v1',
		'/avistamientos/especie/(?P<id>\d+)',
		array(
			'methods'             => 'GET',
			'callback'            => 'fdg_campo_rest_avistamientos_especie',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'fdg/v1',
		'/mapa/capturas',
		array(
			'methods'             => 'GET',
			'callback'            => 'fdg_campo_rest_mapa_capturas',
			'permission_callback' => '__return_true',
		)
	);
}
add_action( 'rest_api_init', 'fdg_campo_register_public_routes' );

function fdg_campo_inject_mapa_legend() {
	return;
}
add_action( 'wp_footer', 'fdg_campo_inject_mapa_legend', 5 );
