<?php
/**
 * Bloques de la página de inicio.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function fdg_home_meses() {
	return array(
		1  => 'Enero',
		2  => 'Febrero',
		3  => 'Marzo',
		4  => 'Abril',
		5  => 'Mayo',
		6  => 'Junio',
		7  => 'Julio',
		8  => 'Agosto',
		9  => 'Septiembre',
		10 => 'Octubre',
		11 => 'Noviembre',
		12 => 'Diciembre',
	);
}

function fdg_home_mes_activo() {
	$meses = fdg_home_meses();
	$mes   = isset( $_GET['mes'] ) ? (int) $_GET['mes'] : (int) gmdate( 'n' );
	if ( $mes < 1 || $mes > 12 ) {
		$mes = (int) gmdate( 'n' );
	}
	return array(
		'num'    => $mes,
		'nombre' => $meses[ $mes ],
	);
}

function fdg_home_especies_del_mes( $mes_nombre ) {
	$out = array();

	$plantas = get_posts(
		array(
			'post_type'      => 'plantas',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'meta_query'     => array(
				array(
					'key'     => 'floracion',
					'value'   => $mes_nombre,
					'compare' => 'LIKE',
				),
			),
		)
	);

	foreach ( $plantas as $p ) {
		$out[] = array(
			'post' => $p,
			'tipo' => 'planta',
		);
	}

	$insectos = get_posts(
		array(
			'post_type'      => 'insectos',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'meta_query'     => array(
				array(
					'key'     => 'vuelo',
					'value'   => $mes_nombre,
					'compare' => 'LIKE',
				),
			),
		)
	);

	foreach ( $insectos as $p ) {
		$out[] = array(
			'post' => $p,
			'tipo' => 'insecto',
		);
	}

	return $out;
}

function fdg_home_temporada_thumb( $post_id ) {
	$url = get_the_post_thumbnail_url( $post_id, 'medium' );
	if ( $url ) {
		return $url;
	}
	$gallery = get_post_meta( $post_id, 'galeria', true );
	if ( is_string( $gallery ) && strpos( $gallery, 'a:' ) === 0 ) {
		$gallery = maybe_unserialize( $gallery );
	}
	if ( is_array( $gallery ) && ! empty( $gallery[0] ) ) {
		$u = wp_get_attachment_image_url( (int) $gallery[0], 'medium' );
		if ( $u ) {
			return $u;
		}
	}
	return '';
}

function fdg_home_render_temporada_card( $item ) {
	$p    = $item['post'];
	$tipo = $item['tipo'];
	$id   = $p->ID;

	if ( 'insecto' === $tipo ) {
		$nc    = get_post_meta( $id, 'nombre_cientifico_ins', true ) ?: $p->post_title;
		$comun = get_post_meta( $id, 'nombre_comun_ins', true );
		$tax   = get_post_meta( $id, 'familia_ins', true );
		$badge = 'Insecto';
		$class = 'fdg-temporada__badge--insecto';
	} else {
		$nc    = get_post_meta( $id, 'nombre_cientifico', true ) ?: $p->post_title;
		$comun = get_post_meta( $id, 'nombre_comun', true );
		$tax   = '';
		$fam   = get_post_meta( $id, 'familia', true );
		if ( $fam ) {
			$ft = get_term( (int) $fam, 'category' );
			if ( $ft && ! is_wp_error( $ft ) ) {
				$tax = $ft->name;
			}
		}
		$badge = 'Planta';
		$class = 'fdg-temporada__badge--planta';
	}

	$img = fdg_home_temporada_thumb( $id );
	?>
	<a href="<?php echo esc_url( get_permalink( $p ) ); ?>" class="fdg-temporada__tarjeta">
		<div class="fdg-temporada__img"<?php echo $img ? ' style="background-image:url(' . esc_url( $img ) . ')"' : ''; ?>>
			<span class="fdg-temporada__badge <?php echo esc_attr( $class ); ?>"><?php echo esc_html( $badge ); ?></span>
		</div>
		<div class="fdg-temporada__info">
			<em><?php echo esc_html( $nc ); ?></em>
			<span><?php echo $comun ? esc_html( $comun ) : '—'; ?></span>
			<?php if ( $tax ) : ?>
				<small><?php echo esc_html( $tax ); ?></small>
			<?php endif; ?>
		</div>
	</a>
	<?php
}

function fdg_home_sierra_geojson_url() {
	$path = get_template_directory() . '/fdg-sierra-home.json';
	if ( ! file_exists( $path ) ) {
		$path = get_template_directory() . '/fdg-sierra-data.json';
	}
	$ver = file_exists( $path ) ? (string) filemtime( $path ) : (string) time();
	return add_query_arg( 'v', $ver, rest_url( 'fdg/v1/sierra-mapa-home' ) );
}

function fdg_home_render_territorio() {
	$theme_uri = get_template_directory_uri();
	?>
	<section class="fdg-territorio" id="territorio">
		<div class="fdg-territorio__inner">
			<div class="fdg-territorio__texto-wrap">
				<span class="fdg-territorio__etiqueta">El territorio</span>
				<h2 class="fdg-territorio__titulo">Salvatierra de los Barros</h2>
				<p class="fdg-territorio__texto">
					Dehesas, laderas y otros montes conforman el término de Salvatierra de los Barros.
					Aquí documentamos la flora y los insectos que encontramos en nuestros paseos por el campo.
					Entre sus rincones destaca la <strong>ZEC Sierra de María Andrés</strong> (Red Natura 2000, ES4310066):
					<strong>unas 4.009&nbsp;hectáreas</strong> de caliza y matorral — el enclave más singular del municipio, pero solo una de sus zonas.
				</p>
				<ul class="fdg-territorio__highlights">
					<li>Sierras, dehesas y ribazas en el mismo término municipal</li>
					<li>ZEC Sierra de María Andrés: 4.009 ha · el LIC más notable del pueblo</li>
					<li>Catálogo vivo de plantas e insectos de campo</li>
				</ul>
				<a class="fdg-territorio__btn" href="<?php echo esc_url( home_url( '/zonas/sierra/' ) ); ?>">
					Explorar la sierra: mapa, hábitats y conservación
				</a>
			</div>
			<div
				id="fdg-home-sierra-map"
				class="fdg-territorio__mapa"
				data-fdg-sierra-map
				data-geojson="<?php echo esc_url( fdg_home_sierra_geojson_url() ); ?>"
				aria-label="Mapa del término municipal y la ZEC Sierra de María Andrés"
			></div>
			<p class="fdg-territorio__mapa-leyenda" aria-hidden="true">
				<span><i class="fdg-territorio__swatch fdg-territorio__swatch--mun"></i> Término municipal</span>
				<span><i class="fdg-territorio__swatch fdg-territorio__swatch--lic"></i> ZEC Sierra de María Andrés (4.009 ha)</span>
			</p>
		</div>
	</section>
	<?php
}

function fdg_home_render_temporada() {
	$meses  = fdg_home_meses();
	$activo = fdg_home_mes_activo();
	$items  = fdg_home_especies_del_mes( $activo['nombre'] );
	$n_pl   = 0;
	$n_ins  = 0;
	foreach ( $items as $item ) {
		if ( 'planta' === $item['tipo'] ) {
			++$n_pl;
		} else {
			++$n_ins;
		}
	}
	?>
	<div class="fdg-temporada">
		<div class="fdg-temporada__cabecera">
			<div class="fdg-temporada__titulo-wrap">
				<span class="fdg-temporada__etiqueta">Este mes</span>
				<h2 class="fdg-temporada__titulo">Qué ver en <?php echo esc_html( $activo['nombre'] ); ?></h2>
				<p class="fdg-temporada__desc">
					<?php echo (int) count( $items ); ?> especies en activo en el bosque encantado.
					<?php if ( $n_pl || $n_ins ) : ?>
						<?php echo (int) $n_pl; ?> plantas en flor · <?php echo (int) $n_ins; ?> insectos en vuelo.
					<?php endif; ?>
				</p>
			</div>
			<div class="fdg-temporada__meses">
				<?php foreach ( $meses as $num => $label ) :
					$short = function_exists( 'mb_substr' ) ? mb_substr( $label, 0, 3 ) : substr( $label, 0, 3 );
					?>
				<a href="<?php echo esc_url( add_query_arg( 'mes', $num, home_url( '/' ) ) ); ?>"
					class="fdg-temporada__mes<?php echo $num === $activo['num'] ? ' fdg-temporada__mes--activo' : ''; ?>">
					<?php echo esc_html( $short ); ?>
				</a>
				<?php endforeach; ?>
			</div>
		</div>
		<?php if ( $items ) : ?>
		<div class="fdg-temporada__grid">
			<?php foreach ( $items as $item ) {
				fdg_home_render_temporada_card( $item );
			} ?>
		</div>
		<?php else : ?>
		<p class="fdg-temporada__vacio">Todavía no hay especies marcadas para <?php echo esc_html( strtolower( $activo['nombre'] ) ); ?> en el catálogo.</p>
		<?php endif; ?>
	</div>
	<?php
}

function fdg_home_render_catalogo() {
	$n_plantas  = (int) ( wp_count_posts( 'plantas' )->publish ?? 0 );
	$n_insectos = (int) ( wp_count_posts( 'insectos' )->publish ?? 0 );
	?>
	<div class="fdg-home-catalogo">
		<div class="fdg-home-catalogo__inner">
			<h2 class="fdg-home-catalogo__titulo">Cuaderno de campo</h2>
			<p class="fdg-home-catalogo__desc">
				Fichas botánicas y entomológicas de Salvatierra de los Barros.
				<?php if ( $n_plantas || $n_insectos ) : ?>
					<?php echo $n_plantas; ?> plantas · <?php echo $n_insectos; ?> insectos publicados.
				<?php endif; ?>
			</p>
			<div class="fdg-home-catalogo__btns">
				<a class="fdg-zonas-home__btn" href="<?php echo esc_url( home_url( '/catalogo/' ) ); ?>">Plantas</a>
				<a class="fdg-zonas-home__btn" href="<?php echo esc_url( home_url( '/catalogo-insectos/' ) ); ?>">Insectos</a>
				<a class="fdg-zonas-home__btn fdg-zonas-home__btn--sec" href="<?php echo esc_url( home_url( '/zonas/' ) ); ?>">Mapa de zonas</a>
				<a class="fdg-zonas-home__btn fdg-zonas-home__btn--sec" href="<?php echo esc_url( home_url( '/instalar/' ) ); ?>">Instalar en el móvil</a>
			</div>
		</div>
	</div>
	<?php
}

function fdg_enqueue_home_sierra_map() {
	if ( ! is_front_page() ) {
		return;
	}
	$uri = get_template_directory_uri();
	wp_enqueue_style( 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', array(), '1.9.4' );
	wp_enqueue_script( 'leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_style( 'fdg-sierra', $uri . '/fdg-sierra.css', array(), '1.0.5' );
	wp_enqueue_script( 'fdg-sierra', $uri . '/fdg-sierra.js', array( 'leaflet-js' ), '1.0.5', true );
}

add_action( 'wp_enqueue_scripts', 'fdg_enqueue_home_sierra_map' );
