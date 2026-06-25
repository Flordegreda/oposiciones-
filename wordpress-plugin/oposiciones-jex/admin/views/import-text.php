<?php
defined( 'ABSPATH' ) || exit;
$materias = OJEX_Materia_Repository::all_with_counts();
$err = sanitize_text_field( wp_unslash( $_GET['ojex_err'] ?? '' ) );
$ok  = ! empty( $_GET['ojex_ok'] );
$n   = (int) ( $_GET['n'] ?? 0 );
?>
<div class="wrap ojex-admin">
	<h1><?php esc_html_e( 'Importar material (texto)', 'oposiciones-jex' ); ?></h1>

	<?php if ( $ok ) : ?>
		<div class="notice notice-success"><p><?php printf( esc_html__( 'Importadas %d preguntas.', 'oposiciones-jex' ), $n ); ?></p></div>
	<?php elseif ( 'parse' === $err ) : ?>
		<div class="notice notice-error"><p><?php esc_html_e( 'No se detectaron preguntas válidas en el texto.', 'oposiciones-jex' ); ?></p></div>
	<?php elseif ( $err ) : ?>
		<div class="notice notice-error"><p><?php esc_html_e( 'Revisa los campos obligatorios.', 'oposiciones-jex' ); ?></p></div>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php wp_nonce_field( 'ojex_import_text' ); ?>
		<input type="hidden" name="action" value="ojex_import_text" />

		<table class="form-table">
			<tr>
				<th><label for="materia_id"><?php esc_html_e( 'Materia', 'oposiciones-jex' ); ?></label></th>
				<td>
					<select name="materia_id" id="materia_id" required>
						<option value=""><?php esc_html_e( '— Selecciona —', 'oposiciones-jex' ); ?></option>
						<?php foreach ( $materias as $m ) : ?>
							<option value="<?php echo esc_attr( $m['id'] ); ?>"><?php echo esc_html( $m['nombre'] ); ?></option>
						<?php endforeach; ?>
					</select>
					<p class="description">
						<?php esc_html_e( 'Si no existe la materia, créala importando primero una copia JSON o añádela manualmente en la base de datos.', 'oposiciones-jex' ); ?>
					</p>
				</td>
			</tr>
			<tr>
				<th><label for="banco_nombre"><?php esc_html_e( 'Nombre del banco', 'oposiciones-jex' ); ?></label></th>
				<td><input type="text" class="regular-text" name="banco_nombre" id="banco_nombre" required /></td>
			</tr>
			<tr>
				<th><label for="tipo"><?php esc_html_e( 'Tipo', 'oposiciones-jex' ); ?></label></th>
				<td>
					<select name="tipo" id="tipo">
						<option value="teorico"><?php esc_html_e( 'Teórico', 'oposiciones-jex' ); ?></option>
						<option value="practico"><?php esc_html_e( 'Práctico', 'oposiciones-jex' ); ?></option>
					</select>
				</td>
			</tr>
			<tr>
				<th><label for="texto"><?php esc_html_e( 'Texto', 'oposiciones-jex' ); ?></label></th>
				<td>
					<textarea name="texto" id="texto" rows="18" class="large-text code" required placeholder="1. Enunciado...&#10;A) ...&#10;Respuesta: B"></textarea>
				</td>
			</tr>
		</table>

		<?php submit_button( __( 'Importar banco', 'oposiciones-jex' ) ); ?>
	</form>
</div>
