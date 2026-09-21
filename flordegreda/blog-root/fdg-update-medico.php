<?php
/**
 * One-shot: update médico 1845 article. DELETE after use.
 */
require __DIR__ . '/wp/wp-load.php';

if ( ( $_GET['token'] ?? '' ) !== 'fdg-update-medico-2026' ) {
	status_header( 403 );
	exit( 'Forbidden' );
}

$title = 'Veinte reales por salir de la cama: la vida de un médico de pueblo en 1845';
$slug  = 'veinte-reales-medico-pueblo-1845';

$content = <<<'HTML'
<p>Hay una cifra en este viejo documento que lo resume casi todo. Si en 1845 querías que el médico de Salvatierra de los Barros acudiera a tu casa pasadas las diez de la noche, tenías que pagarle <strong>veinte reales</strong>. De día, la misma visita costaba dos. Diez veces más por sacarlo de la cama.</p>

<p>No hace falta saber mucho de historia para entender ese número. Detrás hay un hombre cansado, unos caminos oscuros, un candil y la certeza de que el sueño de un médico también tiene precio. Y a partir de ahí, tirando del hilo, aparece la vida entera de un pueblo extremeño hace casi dos siglos.</p>

<h2>El médico que casi no hizo falta contratar</h2>

<p>En la primavera de 1845, el Ayuntamiento de Salvatierra de los Barros tenía un pequeño asunto entre manos. Su médico y cirujano titular, <strong>Don Manuel Sánchez Calvo</strong>, llevaba ya tiempo ejerciendo en la villa, y su continuidad se daba por descontada. En realidad no hacía falta volver a nombrarlo.</p>

<p>Y aun así lo hicieron por escrito. Querían dejar negro sobre blanco las condiciones de su trabajo —y el propio médico también lo prefería así—. Gracias a esa cautela de hace ciento ochenta años, hoy podemos leer con detalle cómo se cuidaba la salud de un pueblo cuando no había seguridad social, ni hospitales cercanos, ni casi nada más que un hombre con dos títulos y mucho oficio.</p>

<h2>Un sueldo que llegaba tarde y un pago en trigo</h2>

<p>El médico cobraba de las arcas municipales —de los llamados fondos de Propios— <strong>2.200 reales al año por su plaza de médico</strong> y <strong>1.100 por la de cirujano</strong>. Sonaba bien, pero había trampa: todo ese dinero no se pagaba mes a mes, sino de golpe, en el último trimestre del año. Es decir, trabajabas y esperabas.</p>

<p>Por eso el sostén de verdad estaba en otra parte: en las <strong>igualas</strong>. Era una especie de seguro médico casero. Cada familia que quisiera se «igualaba» con el médico pagándole una cuota anual, y a cambio tenía derecho a su asistencia. La cuota no podía bajar de <strong>cinco reales por persona</strong>… y aquí está uno de esos detalles que te trasladan de época de golpe: podía pagarse en dinero <strong>o en trigo</strong>, según acordaran las partes. En un pueblo agrícola, el grano valía tanto como la moneda.</p>

<p>Las igualas se cobraban en agosto, cuando la cosecha ya estaba recogida y las casas tenían con qué pagar. Y si alguien no pagaba, el médico tenía que reclamar la deuda él mismo, aunque —eso sí— con el respaldo judicial del Ayuntamiento de su parte. El pueblo prestaba su fuerza para que el médico cobrara lo suyo.</p>

<h2>Curar era también avisar de la muerte</h2>

<p>Lo que se le exigía a cambio no era poco. Don Manuel estaba obligado a atender cualquier caso de medicina o cirugía que surgiera en el pueblo y en todo su término. Debía atender <strong>gratis a los más pobres</strong> —los «pobres de solemnidad», los que no tenían absolutamente nada— y plantar cara a las epidemias y contagios cuando la salud pública lo pidiera, aun a riesgo de su propia piel.</p>

<p>Pero hay una obligación que hoy nos suena extrañísima y que dice mucho de aquella mentalidad: el médico tenía que <strong>avisar a tiempo a la familia cuando un enfermo entraba en peligro de muerte</strong>. No para rendirse, sino para que el moribundo pudiera confesarse, recibir los sacramentos y poner en orden sus asuntos —«sus negocios espirituales y temporales», decía el documento— antes del final. El médico cuidaba el cuerpo, pero también avisaba al alma.</p>

<p>Se le pedía, además, administrar el bautismo de urgencia a los recién nacidos en peligro, y se le prohibía de forma tajante cooperar en abortos e infanticidios. No podía marcharse del pueblo más de una noche si dejaba enfermos desatendidos, y para cualquier ausencia larga necesitaba permiso del alcalde, con obligación de volver corriendo si había una urgencia.</p>

<h2>La tarifa nocturna y las operaciones que no entraban en el trato</h2>

<p>Para quien no estaba igualado, había precios cerrados, pagaderos por adelantado o en el acto: cuatro reales la primera visita, dos las siguientes… y los famosos veinte si tocaba madrugada. Partos y operaciones quedaban fuera de esa tarifa: su precio lo fijaba el médico según la dificultad del caso y las posibilidades de cada familia.</p>

<p>Y luego estaban las intervenciones mayores —cataratas, amputaciones y cosas de esa gravedad—, que no entraban en la obligación ordinaria ni siquiera para los vecinos igualados. Eran palabras mayores, y se trataban aparte.</p>

<h2>El hombre bajo el título</h2>

<p>Lo más entrañable del documento es que nos deja incluso ver la cara del médico. Cuando registró sus títulos ante el Ayuntamiento, quedó constancia de sus señas: era <strong>natural de Jabugo</strong>, en la sierra de Huelva, un joven de unos veinticinco años, alto, de pelo negro y ojos oscuros.</p>

<p>Se había formado en el <strong>Colegio de Medicina y Cirugía de Cádiz</strong>, uno de los grandes centros de su tiempo, donde se examinó y aprobó en 1844. Reunía la doble titulación —médico y cirujano— que un pueblo necesitaba para bastarse a sí mismo. En 1845 aquel muchacho moreno llegado de la sierra onubense era, para los vecinos de Salvatierra de los Barros, la diferencia entre curarse y no curarse.</p>

<h2>El día que se marchó</h2>

<p>La historia, como tantas de pueblo, tiene una despedida. El 27 de septiembre de 1847, Don Manuel escribió al Ayuntamiento para renunciar a su plaza. No lo movía el dinero ni un desencuentro, sino <strong>«motivos de familia»</strong> que le impedían asegurar su continuidad para el año siguiente. Fiel hasta el final a lo pactado en su contrata, avisaba con tiempo para que el pueblo pudiera buscar sustituto y no quedara desatendido.</p>

<p>Pero lo que convierte esa carta en algo memorable son sus últimas líneas. Tras agradecer el aprecio y las consideraciones que le habían dispensado la corporación y todos los vecinos, prometía que, <strong>si algún día desaparecían las causas que le obligaban a marcharse, volvería a pedir aquella misma plaza con preferencia a cualquier otra más ventajosa</strong>. Renunciaba a un futuro mejor pagado, decía, como prueba del afecto que siempre les conservaría.</p>

<p>El Ayuntamiento aceptó la renuncia tres días después, el 30 de septiembre. Y en el mismo acuerdo dejó ver que el cariño era mutuo: se apresuró a pedir licencia al Jefe Político para cubrir la vacante «á fin de que no carezca el vecindario tiempo alguno de facultativo». Que el pueblo no pasara ni un solo día sin médico.</p>

<p>No sabemos si Don Manuel llegó a volver. Pero en esas líneas escritas hace casi dos siglos queda algo que ningún archivo puede desgastar.</p>

<h2>Lo que cabe en un papel viejo</h2>

<p>Uno abre un documento de 1845 esperando datos y burocracia, y se encuentra con la vida. El precio del sueño interrumpido. El trigo convertido en moneda. La atención gratis a quien no tenía nada. El aviso de la muerte para arreglar el alma. Un médico joven, recién llegado, cargando sobre sus hombros con la salud de todo un pueblo. Y, al final, una despedida escrita con el corazón.</p>

<p>Rescatar estos papeles del olvido es, en el fondo, devolverle la voz a esa gente: a los que cuidaban y a los que eran cuidados. Porque nuestra historia no está solo en los grandes acontecimientos. También está, y quizá sobre todo, en veinte reales por salir de la cama una noche de invierno, y en un médico que habría vuelto a su pueblo antes que ir a ningún otro sitio mejor.</p>
HTML;

$existing = get_page_by_path( $slug, OBJECT, 'post' );
if ( ! $existing ) {
	$q = new WP_Query(
		array(
			'name'           => $slug,
			'post_type'      => 'post',
			'post_status'    => 'any',
			'posts_per_page' => 1,
		)
	);
	if ( $q->have_posts() ) {
		$existing = $q->posts[0];
	}
}

$postarr = array(
	'post_title'   => $title,
	'post_name'    => $slug,
	'post_content' => $content,
	'post_status'  => 'publish',
	'post_type'    => 'post',
	'post_author'  => 1,
);

if ( $existing ) {
	$postarr['ID'] = $existing->ID;
	$post_id       = wp_update_post( $postarr, true );
	$action        = 'updated';
} else {
	$post_id = wp_insert_post( $postarr, true );
	$action  = 'created';
}

if ( is_wp_error( $post_id ) ) {
	header( 'Content-Type: text/plain; charset=utf-8' );
	echo 'ERROR: ' . $post_id->get_error_message();
	exit;
}

$cat = get_term_by( 'slug', 'notas', 'category' );
if ( ! $cat ) {
	$cat = get_term_by( 'name', 'Notas', 'category' );
}
if ( $cat && ! is_wp_error( $cat ) ) {
	wp_set_post_categories( $post_id, array( (int) $cat->term_id ) );
}

if ( has_action( 'litespeed_purge_post' ) ) {
	do_action( 'litespeed_purge_post', $post_id );
} elseif ( has_action( 'litespeed_purge_all' ) ) {
	do_action( 'litespeed_purge_all' );
}

header( 'Content-Type: application/json; charset=utf-8' );
echo wp_json_encode(
	array(
		'ok'     => true,
		'action' => $action,
		'id'     => (int) $post_id,
		'url'    => get_permalink( $post_id ),
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);
