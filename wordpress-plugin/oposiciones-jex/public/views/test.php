<?php
defined( 'ABSPATH' ) || exit;
$pages = get_option( 'ojex_page_ids', array() );
$practicar_url = ! empty( $pages['practicar'] ) ? get_permalink( $pages['practicar'] ) : home_url( '/' );
?>
<div class="ojex ojex-test" data-ojex-test data-banco-id="<?php echo esc_attr( $banco_id ); ?>">
	<?php if ( ! $banco_id ) : ?>
		<div class="ojex-card">
			<p><?php esc_html_e( 'Selecciona un banco desde Practicar.', 'oposiciones-jex' ); ?></p>
			<p><a href="<?php echo esc_url( $practicar_url ); ?>"><?php esc_html_e( 'Ir al temario', 'oposiciones-jex' ); ?></a></p>
		</div>
	<?php else : ?>
		<div class="ojex-card" data-ojex-test-root>
			<p class="ojex-muted"><?php esc_html_e( 'Cargando test…', 'oposiciones-jex' ); ?></p>
		</div>
	<?php endif; ?>
</div>
