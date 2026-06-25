<?php defined( 'ABSPATH' ) || exit; ?>
<div class="ojex ojex-practicar">
	<header class="ojex-hero">
		<p class="ojex-eyebrow"><?php esc_html_e( 'Oposición Jurídica', 'oposiciones-jex' ); ?></p>
		<h2><?php esc_html_e( 'Tests', 'oposiciones-jex' ); ?></h2>
	</header>

	<?php if ( ! $sections ) : ?>
		<div class="ojex-card"><p><?php esc_html_e( 'Aún no hay bancos publicados.', 'oposiciones-jex' ); ?></p></div>
	<?php else : ?>
		<?php foreach ( $sections as $section ) : ?>
			<section class="ojex-section">
				<h3><?php echo esc_html( $section['nombre'] ); ?></h3>
				<div class="ojex-grid">
					<?php
					$pages   = get_option( 'ojex_page_ids', array() );
					$test_url = ! empty( $pages['test'] ) ? get_permalink( $pages['test'] ) : get_permalink();
					foreach ( $section['bancos'] as $banco ) :
						?>
						<a class="ojex-tile" href="<?php echo esc_url( add_query_arg( 'banco', $banco['id'], $test_url ) ); ?>">
							<strong><?php echo esc_html( $banco['nombre'] ); ?></strong>
							<span><?php echo (int) $banco['numPreguntas']; ?> <?php esc_html_e( 'preguntas', 'oposiciones-jex' ); ?></span>
							<span class="ojex-badge"><?php echo esc_html( $banco['tipo'] ); ?></span>
						</a>
					<?php endforeach; ?>
				</div>
			</section>
		<?php endforeach; ?>
	<?php endif; ?>
</div>
