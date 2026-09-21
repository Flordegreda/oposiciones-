<?php
/**
 * Mapa de zonas estático — sectores, subzonas y enlace a Sierra (sin Leaflet).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Subzonas agrupadas por sector cardinales.
 */
function fdg_get_subzonas_por_sector() {
	$extent   = fdg_get_zonas_extent();
	$sectores = fdg_get_sectores_from_extent( $extent );
	$by_slug  = array();
	foreach ( $sectores as $s ) {
		$by_slug[ $s['slug'] ] = array(
			'nombre'   => $s['nombre'],
			'color'    => $s['color'],
			'subzonas' => array(),
		);
	}
	$orden_sector = array( 'sector-norte' => 'N', 'sector-este' => 'E', 'sector-sur' => 'S', 'sector-oeste' => 'O' );
	if ( empty( $extent['subzonas'] ) || ! is_array( $extent['subzonas'] ) ) {
		return $by_slug;
	}
	foreach ( $extent['subzonas'] as $slug => $s ) {
		$sector = $s['sector'] ?? '';
		if ( ! $sector || ! isset( $by_slug[ $sector ] ) ) {
			continue;
		}
		$url = function_exists( 'fdg_subzona_catalog_url' ) ? fdg_subzona_catalog_url( $slug ) : '';
		$by_slug[ $sector ]['subzonas'][] = array(
			'slug'   => $slug,
			'nombre' => $s['nombre'] ?? $slug,
			'color'  => $s['color'] ?? '#4a7c2f',
			'url'    => $url,
		);
	}
	return $by_slug;
}

function fdg_enqueue_mapa_zonas_estatico() {
	$uri = get_template_directory_uri();
	wp_enqueue_style( 'fdg-archivo', $uri . '/fdg-archivo.css', array(), '1.2.2' );
	wp_enqueue_style( 'fdg-home', $uri . '/fdg-home.css', array(), '1.2.1' );
	wp_enqueue_style( 'fdg-sierra', $uri . '/fdg-sierra.css', array(), '1.1.1' );
	wp_enqueue_style(
		'fdg-mapa-estatico',
		$uri . '/fdg-mapa-estatico.css',
		array( 'fdg-archivo', 'fdg-sierra' ),
		'1.4.3'
	);
	wp_enqueue_style( 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', array(), '1.9.4' );
	wp_enqueue_script( 'leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_script( 'fdg-sierra', $uri . '/fdg-sierra.js', array( 'leaflet-js' ), '1.0.5', true );
}

function fdg_render_mapa_zonas_estatico( $args = array() ) {
	$titulo = $args['titulo'] ?? 'Zonas del término';
	$desc   = $args['desc'] ?? 'Salvatierra de los Barros se organiza en cuatro sectores. Elige una zona para ver qué especies hay catalogadas.';
	$extent = fdg_get_zonas_extent();
	$pueblo = $extent['pueblo'] ?? array( 'nombre' => 'Salvatierra de los Barros' );
	$por_sector = fdg_get_subzonas_por_sector();

	$cuadrantes = array(
		'sector-norte' => array( 'key' => 'N', 'class' => 'fdg-zonas-cuad--norte', 'label' => 'Norte' ),
		'sector-este'  => array( 'key' => 'E', 'class' => 'fdg-zonas-cuad--este',  'label' => 'Este' ),
		'sector-sur'   => array( 'key' => 'S', 'class' => 'fdg-zonas-cuad--sur',   'label' => 'Sur' ),
		'sector-oeste' => array( 'key' => 'O', 'class' => 'fdg-zonas-cuad--oeste', 'label' => 'Oeste' ),
	);
	$geojson_url = function_exists( 'fdg_home_sierra_geojson_url' ) ? fdg_home_sierra_geojson_url() : '';
	?>
	<div class="fdg-archivo fdg-zonas-estatico-wrap">
		<div class="fdg-archivo__cabecera">
			<div class="fdg-archivo__cabecera-inner">
				<h1 class="fdg-archivo__titulo"><?php echo esc_html( $titulo ); ?></h1>
				<p class="fdg-archivo__desc"><?php echo esc_html( $desc ); ?></p>
			</div>
		</div>

		<section class="fdg-zonas-paneles fdg-territorio">
			<div class="fdg-zonas-paneles__inner">
				<div class="fdg-zonas-paneles__izq">
					<span class="fdg-territorio__etiqueta">Mapa esquemático</span>
					<p class="fdg-zonas-paneles__hint">Pulsa un sector del mapa para ir al listado de zonas.</p>
					<div class="fdg-zonas-estatico__mapa" aria-label="Mapa esquemático del término municipal">
						<div class="fdg-zonas-cuadrantes">
							<span class="fdg-zonas-brujula fdg-zonas-brujula--n" aria-hidden="true">N</span>
							<span class="fdg-zonas-brujula fdg-zonas-brujula--s" aria-hidden="true">S</span>
							<span class="fdg-zonas-brujula fdg-zonas-brujula--e" aria-hidden="true">E</span>
							<span class="fdg-zonas-brujula fdg-zonas-brujula--o" aria-hidden="true">O</span>
							<?php foreach ( $cuadrantes as $slug => $c ) :
								$sec = $por_sector[ $slug ] ?? null;
								$color = $sec['color'] ?? '#4a7c2f';
								$anchor = '#sector-' . esc_attr( str_replace( 'sector-', '', $slug ) );
								?>
							<a href="<?php echo esc_attr( $anchor ); ?>"
							   class="fdg-zonas-cuad <?php echo esc_attr( $c['class'] ); ?>"
							   style="--sector-color:<?php echo esc_attr( $color ); ?>">
								<span class="fdg-zonas-cuad__letra"><?php echo esc_html( $c['key'] ); ?></span>
								<span class="fdg-zonas-cuad__nombre"><?php echo esc_html( $c['label'] ); ?></span>
							</a>
							<?php endforeach; ?>
							<div class="fdg-zonas-pueblo">
								<span class="fdg-zonas-pueblo__punto" aria-hidden="true"></span>
								<span class="fdg-zonas-pueblo__nombre"><?php echo esc_html( $pueblo['nombre'] ?? 'Salvatierra de los Barros' ); ?></span>
							</div>
						</div>
					</div>
				</div>
				<div class="fdg-zonas-paneles__der">
					<span class="fdg-territorio__etiqueta">Mapa real</span>
					<h2 class="fdg-territorio__titulo">Salvatierra de los Barros</h2>
					<p class="fdg-territorio__texto">
						El municipio se organiza en cuatro sectores. Elige un sector o una zona concreta para ver qué especies hay catalogadas.
					</p>
					<?php if ( $geojson_url ) : ?>
					<div
						id="fdg-zonas-sierra-map"
						class="fdg-territorio__mapa"
						data-fdg-sierra-map
						data-geojson="<?php echo esc_url( $geojson_url ); ?>"
						aria-label="Mapa del término municipal y la ZEC Sierra de María Andrés"
					></div>
					<p class="fdg-territorio__mapa-leyenda" aria-hidden="true">
						<span><i class="fdg-territorio__swatch fdg-territorio__swatch--mun"></i> Término municipal</span>
						<span><i class="fdg-territorio__swatch fdg-territorio__swatch--lic"></i> ZEC Sierra de María Andrés (4.009 ha)</span>
					</p>
					<?php endif; ?>
				</div>
			</div>
		</section>

		<div class="fdg-archivo__contenido fdg-zonas-sectores-wrap">
			<div class="fdg-zonas-sectores-lista">
				<?php foreach ( $cuadrantes as $slug => $c ) :
					$sec = $por_sector[ $slug ] ?? array( 'subzonas' => array(), 'color' => '#4a7c2f', 'nombre' => $c['label'] );
					$id  = 'sector-' . str_replace( 'sector-', '', $slug );
					?>
				<section class="fdg-zonas-sector" id="<?php echo esc_attr( $id ); ?>">
					<h2 class="fdg-zonas-sector__titulo">
						<span class="fdg-zonas-sector__swatch" style="background:<?php echo esc_attr( $sec['color'] ?? '#4a7c2f' ); ?>"></span>
						Sector <?php echo esc_html( $sec['nombre'] ?? $c['label'] ); ?>
					</h2>
					<?php if ( ! empty( $sec['subzonas'] ) ) : ?>
					<ul class="fdg-zonas-subzona-lista">
						<?php foreach ( $sec['subzonas'] as $z ) : ?>
						<li>
							<?php if ( ! empty( $z['url'] ) ) : ?>
							<a href="<?php echo esc_url( $z['url'] ); ?>" class="fdg-zonas-subzona-link">
								<?php echo esc_html( $z['nombre'] ); ?>
							</a>
							<?php else : ?>
							<span class="fdg-zonas-subzona-link fdg-zonas-subzona-link--sin-url"><?php echo esc_html( $z['nombre'] ); ?></span>
							<?php endif; ?>
						</li>
						<?php endforeach; ?>
					</ul>
					<?php else : ?>
					<p class="fdg-zonas-sector__vacio">Zonas de este sector en preparación.</p>
					<?php endif; ?>
				</section>
				<?php endforeach; ?>

				<section class="fdg-zonas-sector fdg-zonas-sector--especial" id="zona-sierra">
					<h2 class="fdg-zonas-sector__titulo">
						<span class="fdg-zonas-sector__swatch fdg-zonas-sector__swatch--sierra"></span>
						Zona especial
					</h2>
					<p class="fdg-zonas-sector__intro">Espacio protegido dentro del término municipal.</p>
					<a class="fdg-territorio__btn" href="<?php echo esc_url( home_url( '/zonas/sierra/' ) ); ?>">
						Sierra de María Andrés — mapa, hábitats y conservación
					</a>
				</section>
			</div>
		</div>
	</div>
	<?php
}
