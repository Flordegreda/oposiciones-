<?php
/**
 * One-shot: publish article from markdown. DELETE after use.
 */
require __DIR__ . '/wp/wp-load.php';

if ( ( $_GET['token'] ?? '' ) !== 'fdg-insert-article-2026' ) {
	status_header( 403 );
	exit( 'Forbidden' );
}

$title = 'Una finca para 130 excombatientes';
$slug  = 'una-finca-para-130-excombatientes';

$content = <<<'HTML'
<p class="fdg-dek"><em>Cómo el Ayuntamiento de Salvatierra de los Barros compró la dehesa «Jara y Torviscal» para repartirla (1940–1941)</em></p>

<p>En el libro de actas del Ayuntamiento de Salvatierra de los Barros hay un hilo que atraviesa dos años enteros y que, leído del tirón, cuenta una historia poco conocida: la de una corporación municipal que se endeudó en trescientas mil pesetas para comprar una dehesa a los jesuitas y parcelarla entre <strong>ciento treinta excombatientes</strong> y otros vecinos necesitados. La operación arranca en el verano de 1940 y sigue viva a lo largo de todo 1941. Este artículo reconstruye ese expediente a partir de los propios acuerdos municipales, respetando lo que las actas dicen —y señalando lo que callan.</p>

<h2>El marco: colonizar y asentar en la posguerra</h2>

<p>Para entender por qué un ayuntamiento rural se lanza a semejante compromiso financiero conviene situar la escena. España acababa de salir de la Guerra Civil y el nuevo régimen había hecho de la política de colonización agraria una de sus banderas sociales. En octubre de 1939 se había creado el <strong>Instituto Nacional de Colonización (INC)</strong>, y el 25 de noviembre de 1940 se aprobó la <strong>Ley de Colonización de Interés Local</strong> (B.O. del Estado núm. 345), que permitía a ayuntamientos y particulares acometer parcelaciones con el auxilio técnico del Instituto y con anticipos reintegrables.</p>

<p>El asentamiento de excombatientes —los veteranos del ejército vencedor— figuraba entre las prioridades de aquella política. En Salvatierra de los Barros, el proyecto se inscribe de lleno en ese clima: las mismas actas de la época recogen misas por «los caídos por Dios y por la Patria» y aportaciones a suscripciones patrióticas. La compra de la finca se concibe, en el lenguaje de los acuerdos, como una «obra puramente social».</p>

<h2>1940: la génesis de la operación</h2>

<p>El expediente tiene una fecha de partida precisa. El <strong>28 de junio de 1940</strong>, el Banco de Crédito Local de España comunica al Ayuntamiento que su Consejo de Administración ha informado favorablemente la petición de un crédito de trescientas mil pesetas «para la compra de una finca rústica, con destino a su parcelación, entre ex-combatientes y labradores de esta villa».</p>

<p>A partir de ahí, la maquinaria administrativa se pone en marcha con rapidez. El <strong>3 de julio</strong> la corporación manda instruir el presupuesto extraordinario necesario; el <strong>12 de julio</strong> se examinan sus preliminares, ya con la finca identificada —«Jara y Corbizal», en las grafías vacilantes del amanuense— y con la compra «concertada con la Compañía de Jesús». El presupuesto ordinario que da cobertura al gasto se había aprobado el 12 de agosto y sería autorizado por el Delegado de Hacienda el 16 de octubre de aquel año.</p>

<p>El otoño de 1940 es de gestiones intensas. Una comisión municipal viaja a Badajoz entre el 26 y el 29 de octubre para la adquisición de la finca; el alcalde, don Joaquín Rodríguez Giles, se desplaza a Madrid a resolver el anticipo del crédito. Las actas registran hasta los gastos de estos viajes —582,70 pesetas de estancia del alcalde en la capital, 497,50 de la comisión en Badajoz—, pequeños detalles que dan la medida del esfuerzo.</p>

<h2>La compra a los jesuitas</h2>

<p>El <strong>3 de noviembre de 1940</strong>, en sesión extraordinaria, el alcalde da cuenta de sus gestiones en Madrid «en relación con la compra de la finca rústica a la Compañía de Jesús sita en este término municipal, para asentar a excombatientes». Y aquí aparece el dato que da título a esta historia. El acuerdo declara la urgencia de disponer de las trescientas mil pesetas «destinadas a la adquisición de una finca rústica para asentar a <strong>130 excombatientes</strong>, mitigando así la precaria situación en que se halla un sinnúmero de familias». La carta del Banco transcrita en la misma acta lo confirma con idéntica cifra: la finalidad es «asentar a ciento treinta excombatientes en una finca rústica».</p>

<p>Como la operación de crédito principal todavía no tenía todas las autorizaciones de la superioridad, el Banco articuló una solución puente: un <strong>anticipo</strong> sobre las rentas de unos títulos de deuda que el Ayuntamiento poseía. La entidad puso a disposición del municipio 280.000 pesetas —reservándose el resto para gastos de escritura y de emisión de cédulas hasta completar las 300.000— y con esa suma se formalizó el contrato de compra a la Compañía de Jesús. La dehesa pasaba así a manos públicas; la posesión efectiva se fija poco después, el 28 de noviembre de 1940.</p>

<h2>El préstamo: medio siglo de deuda</h2>

<p>Apenas nueve días más tarde, el <strong>12 de noviembre de 1940</strong>, la corporación aprobó por unanimidad el proyecto de contrato definitivo del préstamo con el Banco de Crédito Local, un documento de veintidós cláusulas que las actas reproducen íntegramente y que permite conocer al detalle las condiciones del compromiso:</p>

<ul>
<li><strong>Importe:</strong> 300.000 pesetas, destinadas a la adquisición de la finca «para obra social», más gastos de escritura y conceptos anejos.</li>
<li><strong>Plazo:</strong> cincuenta años, en cincuenta anualidades iguales, con pagos trimestrales.</li>
<li><strong>Coste:</strong> interés del 5 % anual más una comisión del 0,50 % —en total, 5,50 %—, además de un 4 % de quebranto por la emisión de las Cédulas de Crédito Local y un 0,50 % por una sola vez en concepto de estudio del expediente.</li>
<li><strong>Garantía:</strong> la pignoración de seis láminas de Deuda Perpetua Interior al 4 %, con un valor nominal conjunto de 552.246,92 pesetas, más los Derechos de Matadero del municipio.</li>
<li><strong>Fuero:</strong> los tribunales de Madrid, para cualquier litigio derivado del contrato.</li>
</ul>

<p>Es un compromiso considerable para un ayuntamiento pequeño: cincuenta anualidades que hipotecaban las finanzas municipales durante medio siglo, garantizadas con casi todo el patrimonio en títulos de la corporación. La dimensión de la apuesta dice mucho sobre la importancia política y social que se atribuía al proyecto.</p>

<h2>1941: administrar una finca que aún no se reparte</h2>

<p>Aquí es donde el relato se complica, y donde se aprecia la distancia entre el propósito y su ejecución. Durante todo 1941 el Ayuntamiento es ya propietario de la dehesa, pero el reparto en parcelas no llega a materializarse. Las actas lo dejan escrito sin ambages: en la sesión de <strong>1 de marzo de 1941</strong> se autoriza vender las hierbas «en virtud de no haberse verificado la parcelación entre los excombatientes y otros necesitados», con el fin de sacarle rendimiento entre tanto.</p>

<p>Y eso es, en la práctica, lo que ocupa a la corporación durante meses: administrar provisionalmente una finca cuyo destino final aún no ha podido cumplirse. El expediente de aprovechamientos de 1941 es abundante:</p>

<ul>
<li>Se <strong>liquida con los herederos de don Juan Caro González</strong>, anteriores usufructuarios, el disfrute de hierbas, pastos y montanera desde la compra hasta fin de febrero; la liquidación arroja un saldo de 4.983,75 pesetas a favor del Ayuntamiento.</li>
<li>Se autoriza el <strong>carboneo</strong> de las leñas y la venta del corcho del reducido arbolado.</li>
<li>Se sacan a la venta los <strong>aprovechamientos de verano</strong> —espigas, gramas y pastos—, en dos intentos de concierto directo que quedan desiertos por falta de licitadores.</li>
<li>Se fijan <strong>rentas a los aparceros</strong> que ya tenían sembrada la finca: el quinto de lo producido en «La Jara» y el cuarto en «El Torviscal».</li>
<li>Se vende el <strong>fruto de bellotas</strong> de la próxima montanera, adjudicado por concierto directo a don Julián Benítez Vigano en 12.050 pesetas.</li>
</ul>

<p>La tutela institucional del proyecto sigue siendo visible en los detalles: cuando en septiembre de 1941 se cierra la liquidación con los antiguos usufructuarios, el acto se verifica en Badajoz «ante la Delegación Provincial de Ex Combatientes», por disposición del Gobernador Civil, con el delegado provincial de ese organismo entre los firmantes. La finca seguía siendo, a todos los efectos, un asunto de excombatientes.</p>

<h2>La apuesta por la colonización oficial</h2>

<p>El paso más ambicioso de 1941 llega en la sesión de <strong>17 de septiembre</strong>. Amparándose en la Ley de Colonización de Interés Local de 1940 y en la Orden del Ministerio de Agricultura de 24 de marzo de 1941, la corporación acuerda solicitar del Instituto Nacional de Colonización el auxilio técnico y un <strong>anticipo reintegrable de 150.000 pesetas</strong> para colonizar «El Torviscal» —de cabida en torno a 283 hectáreas—, que «será parcelada y destinada a proporcionar el asentamiento de un buen número de ex-combatientes, modestos agricultores vecinos [y] pequeños agricultores» necesitados.</p>

<p>El acuerdo incluye, además, un detalle revelador de hasta dónde llegaba la ambición del proyecto. La corporación no se limita a repartir la tierra tal cual: propone transformarla. Los terrenos, dedicados entonces a pastos con encinas, deberían convertirse «en viñedo, o por lo menos la mayor parte de los mismos, ya que por la calidad del suelo hay que presumir que pegaría muy bien en ellos esa plantación», con el doble fin de aumentar la producción en beneficio de los colonos y de revalorizar la finca. No se trataba, por tanto, de un simple reparto de parcelas, sino de un plan de reconversión agrícola en toda regla.</p>

<p>Es la traducción del propósito inicial al lenguaje de la política estatal de colonización: el municipio, que había comprado la finca por su cuenta y riesgo, buscaba ahora el respaldo del Instituto para convertir el plan —parcelación y viñedo incluidos— en realidad sobre el terreno.</p>

<h2>Lo que las actas no cuentan</h2>

<p>Un relato honesto exige señalar también los límites de las fuentes. Las actas permiten seguir con precisión la compra y la financiación, pero dejan preguntas abiertas que solo otra documentación podrá responder:</p>

<ul>
<li>No consta el <strong>precio exacto de la compra</strong> a la Compañía de Jesús, ni la fecha y el notario de la escritura de compraventa.</li>
<li>No aparece la <strong>superficie total</strong> de la dehesa: solo se cita «El Torviscal», con unas 283 hectáreas, y una veintena de hectáreas repobladas; la cabida de «La Jara» queda sin precisar.</li>
<li>No se conoce la <strong>respuesta del Instituto Nacional de Colonización</strong> a la solicitud de septiembre de 1941.</li>
<li>Y, sobre todo, <strong>ninguna acta de 1941 registra la adjudicación efectiva de parcelas</strong> a excombatientes concretos, con nombres y lotes. El plan de los ciento treinta asentamientos está perfectamente documentado como intención; su cumplimiento sobre el terreno, si llegó a producirse, pertenece a un capítulo posterior que estas páginas no alcanzan.</li>
</ul>

<p>Conviene añadir una cautela de método: la finca aparece en el libro con grafías muy variables —«Jara y Corbizal», «Corbiscal», «Corviscal», «Cortiseal»—, todas ellas del actual «Jara y Torviscal». Y el valor nominal de las láminas pignoradas se transcribe en un lugar como 552.246,92 pesetas y en otro como 555.246,92: una discrepancia menor que solo el cotejo con el original despejará.</p>

<h2>Coda: la vieja cuestión de la tierra</h2>

<p>No conviene olvidar el trasfondo. El 25 de marzo de 1936, en Salvatierra de los Barros, los yunteros ocuparon la dehesa del Portero. No fue un caso aislado: aquella primavera, por toda la provincia de Badajoz, miles de campesinos sin tierra se echaron al campo a ocupar fincas en demanda de lo que consideraban suyo, en el gran movimiento que el historiador Francisco Espinosa Maestre estudió en <em>La primavera del Frente Popular</em>. Extremadura era uno de los corazones del latifundio y del jornalero sin tierra, y esa hambre de tierra estaba en la raíz misma del conflicto que se avecinaba.</p>

<p>La colonización que ahora emprendía el nuevo régimen no continuaba aquel impulso, sino que lo invertía. Deshecha la reforma agraria de la República, el modelo franquista no expropiaba el latifundio: compraba o colonizaba, con respeto a la gran propiedad, y elegía con cuidado a quién iba la tierra. Y ahí está la paradoja que da a esta historia su relieve: las parcelas se repartían, de forma selectiva, entre los veteranos del ejército vencedor, no entre los jornaleros y yunteros que aquella primavera habían ocupado el Portero. El mismo problema de fondo; una respuesta que miraba justo al lado contrario de quienes lo habían protagonizado.</p>

<p>Que un ayuntamiento de en torno a 4.000 habitantes se endeudara a medio siglo para asentar a 130 familias —acaso una de cada siete personas del pueblo— da la medida de hasta qué punto la cuestión de la tierra seguía sin resolverse. Y a lo grande no se resolvería: el latifundio extremeño sobrevivió, y el campo terminaría vaciándose por la emigración de las décadas siguientes. Que precisamente el problema de la tierra, germen en gran medida de la contienda, no llegara a solucionarse ni siquiera con la voluntad —y la deuda— de un municipio entero, es quizá lo más elocuente de todo el episodio.</p>

<h2>Una dehesa con memoria</h2>

<p>La compra de «Jara y Torviscal» es, a la vez, una operación financiera de calado y una decisión cargada de significado histórico. Un ayuntamiento modesto se endeuda a cincuenta años para poner tierra pública al servicio de un reparto que la posguerra convirtió en prioridad. El propósito quedó escrito con una nitidez poco frecuente en la documentación municipal: ciento treinta familias, una dehesa comprada a los jesuitas, la ayuda del Estado colonizador.</p>

<p>Que ese reparto se cumpliera o no, y de qué modo, es precisamente lo que invita a seguir tirando del hilo en los archivos. Pero el punto de partida ya no admite dudas: en 1940 y 1941, la dehesa «Jara y Torviscal» se compró para repartirla entre excombatientes, y las actas del Ayuntamiento de Salvatierra de los Barros lo dicen, negro sobre blanco, más de una vez.</p>

<hr>

<p><em>Fuentes primarias: Libro de actas del Ayuntamiento de Salvatierra de los Barros, sesiones de 1940 y 1941 (sesiones ordinarias, supletorias y extraordinarias de la Comisión Gestora; presidencia de D. Joaquín Rodríguez Giles; secretaría interina de D. Fernando Vera Flores).</em></p>

<p><em>Bibliografía: Francisco Espinosa Maestre, <cite>La primavera del Frente Popular. Los campesinos de Badajoz y el origen de la guerra civil (marzo-julio de 1936)</cite>, Barcelona, Crítica, 2007.</em></p>
HTML;

$existing = get_page_by_path( $slug, OBJECT, 'post' );
$postarr  = array(
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

// Soft-delete the welcome post if still around.
$welcome = get_page_by_path( 'abrir-el-cuaderno', OBJECT, 'post' );
if ( $welcome && (int) $welcome->ID !== (int) $post_id ) {
	wp_trash_post( $welcome->ID );
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
