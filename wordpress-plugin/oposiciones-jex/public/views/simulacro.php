<?php defined( 'ABSPATH' ) || exit; ?>
<div class="ojex ojex-simulacro" data-ojex-simulacro data-materias="<?php echo esc_attr( wp_json_encode( $materias ) ); ?>" data-pool="<?php echo esc_attr( wp_json_encode( $pool ) ); ?>">
	<div class="ojex-card" data-ojex-simulacro-root>
		<h2><?php esc_html_e( 'Simulacro', 'oposiciones-jex' ); ?></h2>
		<p class="ojex-muted"><?php esc_html_e( '80 % teórico · 20 % práctico', 'oposiciones-jex' ); ?></p>
	</div>
</div>
