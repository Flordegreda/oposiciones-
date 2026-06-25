<?php defined( 'ABSPATH' ) || exit; ?>
<div class="ojex ojex-stats">
	<h2><?php esc_html_e( 'Estadísticas', 'oposiciones-jex' ); ?></h2>
	<?php if ( ! get_current_user_id() ) : ?>
		<div class="ojex-card"><p><?php esc_html_e( 'Inicia sesión para ver tu historial en la nube.', 'oposiciones-jex' ); ?></p></div>
	<?php elseif ( ! $resultados ) : ?>
		<div class="ojex-card"><p><?php esc_html_e( 'Aún no hay resultados guardados.', 'oposiciones-jex' ); ?></p></div>
	<?php else : ?>
		<ul class="ojex-result-list">
			<?php foreach ( $resultados as $r ) : ?>
				<li>
					<strong><?php echo esc_html( $r['titulo'] ); ?></strong>
					— <?php echo (int) $r['porcentaje']; ?>%
					— <?php echo esc_html( $r['created_at'] ); ?>
				</li>
			<?php endforeach; ?>
		</ul>
	<?php endif; ?>
</div>
