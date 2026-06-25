<?php
defined( 'ABSPATH' ) || exit;
$err = sanitize_text_field( wp_unslash( $_GET['ojex_err'] ?? '' ) );
$ok  = ! empty( $_GET['ojex_ok'] );
$stats_raw = sanitize_text_field( wp_unslash( $_GET['stats'] ?? '' ) );
$stats = $stats_raw ? json_decode( rawurldecode( $stats_raw ), true ) : null;
?>
<div class="wrap ojex-admin">
	<h1><?php esc_html_e( 'Copia de seguridad', 'oposiciones-jex' ); ?></h1>

	<?php if ( $ok && is_array( $stats ) ) : ?>
		<div class="notice notice-success">
			<p>
				<?php
				printf(
					esc_html__( 'Importado: %1$d materias, %2$d bancos, %3$d preguntas.', 'oposiciones-jex' ),
					(int) ( $stats['materias'] ?? 0 ),
					(int) ( $stats['bancos'] ?? 0 ),
					(int) ( $stats['preguntas'] ?? 0 )
				);
				?>
			</p>
		</div>
	<?php elseif ( $err ) : ?>
		<div class="notice notice-error"><p><?php echo esc_html( $err ); ?></p></div>
	<?php endif; ?>

	<h2><?php esc_html_e( 'Exportar', 'oposiciones-jex' ); ?></h2>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'ojex_export_backup' ); ?>
		<input type="hidden" name="action" value="ojex_export_backup" />
		<?php submit_button( __( 'Descargar JSON', 'oposiciones-jex' ), 'secondary' ); ?>
	</form>

	<h2><?php esc_html_e( 'Importar', 'oposiciones-jex' ); ?></h2>
	<p><?php esc_html_e( 'Compatible con el export de la app Next.js (Material → Copia de seguridad).', 'oposiciones-jex' ); ?></p>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'ojex_import_backup' ); ?>
		<input type="hidden" name="action" value="ojex_import_backup" />
		<p>
			<label>
				<input type="radio" name="mode" value="append" checked />
				<?php esc_html_e( 'Solo añadir / actualizar', 'oposiciones-jex' ); ?>
			</label><br />
			<label>
				<input type="radio" name="mode" value="overwrite" />
				<?php esc_html_e( 'Sobrescribir preguntas de bancos existentes', 'oposiciones-jex' ); ?>
			</label>
		</p>
		<textarea name="backup_json" rows="16" class="large-text code" placeholder="{ &quot;materias&quot;: [ ... ] }" required></textarea>
		<?php submit_button( __( 'Restaurar copia', 'oposiciones-jex' ) ); ?>
	</form>
</div>
