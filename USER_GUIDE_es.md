# Guía del usuario de Cocoa Bloom Judging

Esta guía explica cómo usar el sitio web de Cocoa Bloom Judging desde la perspectiva del usuario. Abarca el registro, el inicio de sesión, los paneles de control basados ​​en roles y cada módulo: gestión de usuarios, concursos, envío y gestión de muestras, evaluaciones físicas y sensoriales, notificaciones y resultados.

Nota: Algunas funciones dependen de su rol asignado y de la configuración del administrador (esquema de la base de datos, almacenamiento y permisos). Si no puede acceder a una página, contacte con su administrador.

---

## 1) Primeros pasos

### 1.1 Acceso al sitio

- Abra el sitio en su navegador. La página de inicio ofrece una descripción general y puntos de acceso para registrarse o iniciar sesión.
- La interfaz de usuario está disponible en inglés y español; el idioma preferido se detecta automáticamente, pero puede cambiarse cambiando el idioma del navegador.

### 1.2 Registro

- Vaya a `/register`. - Completar:
- Nombre, correo electrónico, contraseña
- Rol: elija entre "participante", "evaluador", "juez" o (en raras ocasiones) "director" (los administradores son asignados por el personal).
- Teléfono opcional.
- Para evaluadores: puede subir documentos de respaldo durante el registro.
- Envíe el formulario. Su cuenta se creará con el estado "no verificada" y se cerrará su sesión inmediatamente (se requiere aprobación).
- Un administrador debe verificar su perfil antes de poder iniciar sesión.

### 1.3 Inicio de sesión

- Vaya a `/login` e ingrese su correo electrónico y contraseña.
- Si su perfil está verificado, iniciará sesión y será redirigido al Panel de control.
- Si aún no está verificado, el inicio de sesión será rechazado; contacte al administrador o espere la aprobación.

---

## 2) Roles y Paneles de control

Después de iniciar sesión, será redirigido a `/dashboard`. La aplicación muestra un panel de control con roles y una barra lateral de navegación.

- Roles:
- Participante: Enviar muestras, realizar el seguimiento del estado, ver notificaciones y resultados.
- Evaluador: Revisar las muestras asignadas en las fases finales de evaluación (cuando corresponda), ver resultados y notificaciones.
- Juez: Realizar evaluaciones sensoriales de las muestras asignadas, consultar su carga de trabajo y progreso, y ver resultados y notificaciones.
- Director: Gestionar las evaluaciones de principio a fin: recepción de muestras, evaluaciones físicas, asignación de jueces, supervisión de la evaluación, resultados, notificaciones y perfil.
- Administrador: Gestión completa, incluyendo usuarios, concursos, muestras, finanzas, notificaciones y resultados.

La barra lateral cambia según su rol y muestra solo los módulos disponibles. Los elementos comunes incluyen Panel de Control, Resultados, Resultados Finales, Notificaciones y Mi Perfil.

---

## 3) Páginas Públicas

### 3.1 Página de Inicio `/`

- Resumen, acciones para registrarse o iniciar sesión.

### 3.2 Verificación QR `/verify/:trackingCode`

- Cualquier persona puede verificar una muestra escaneando su código QR o visitando la URL.
- Muestra información básica de la muestra, su estado (enviada/recibida/aprobada/evaluada/descalificada) y la fecha de envío.

---

## 4) Trayectoria del Participante

### 4.1 Envío de Muestras `/dashboard/submission`

- Formulario paso a paso:

1. Seleccionar Concurso: elija un concurso disponible (próximo/activo).
2. Origen y Propietario: país, finca, información de contacto; detalles de la cooperativa si corresponde.
3. Información de la Muestra: cantidad (p. ej., 3 kg), material genético, edad del cultivo, hectáreas, humedad, porcentaje de fermentación.
4. Información de Procesamiento: tipo de fermentador, tiempo de fermentación, tipo/tiempo de secado.
5. Pago: PayPal está habilitado actualmente; las tarjetas/Nequi se muestran como próximamente disponibles. Acepte los términos para habilitar el botón de PayPal.

- Proceso de envío:
- Al enviar, el sistema registra su muestra, genera un código de seguimiento único y crea una imagen de código QR que se almacena en el sistema.
- Tras la confirmación del pago (a través de PayPal), el estado de pago de su muestra pasa a ser "completado".
- Tras el envío, verá un resumen de éxito con su código de seguimiento y la URL del código QR.

### 4.2 Seguimiento de Muestras

- Los participantes pueden seguir su estado mediante notificaciones y páginas de resultados. El estado de las evaluaciones físicas y sensoriales progresa con el tiempo.

### 4.3 Resultados `/dashboard/results`

- Consulta los resultados de la competencia que te interesan.
- Incluye las mejores muestras, estadísticas y desgloses detallados cuando estén disponibles.

### 4.4 Notificaciones `/dashboard/notifications`

- Recibe actualizaciones como muestras recibidas, aprobadas/descalificadas, progreso de la evaluación o anuncios de clasificación.
- Marca como leídas/no leídas o elimina notificaciones.

### 4.5 Mi Perfil `/dashboard/profile`

- Consulta los detalles de tu perfil.

---

## 5) Trayectoria del Juez

### 5.1 Panel de Juez `/dashboard/evaluation`

- Muestra las muestras asignadas con su estado (pendiente, en progreso, completada), detalles del concurso, fechas límite y notificaciones recientes. - Seleccione una muestra para abrir el formulario de Evaluación Sensorial.

### 5.2 Evaluación Sensorial

- Formulario completo para evaluar atributos de sabor (aroma, acidez, fruta fresca/marrón, vegetal, floral, madera, especias, frutos secos, caramelo/panela), amargor, astringencia, tostado, defectos y calidad general.
- Guarde su evaluación para actualizar su progreso o complétela al finalizar.

### 5.3 Resultados y Notificaciones

- Los jueces pueden revisar las páginas de resultados aprobados/publicados y las notificaciones de tareas y plazos.

---

## 6) Trayectoria del Evaluador

- Los evaluadores pueden participar en fases de evaluación especiales/finales.
- El panel de control muestra sus tareas y resultados.
- Utilice las páginas de Notificaciones y Resultados para realizar un seguimiento de su actividad.

---

## 7) Trayectoria del Director

Los directores coordinan el proceso de evaluación.

### 7.1 Gestión de Muestras `/dashboard/samples`

- Gestionar todas las muestras enviadas:
- Ver la lista de muestras con los detalles y el estado de los participantes.
- Ver los códigos internos y externos (de seguimiento).
- Descargar el QR cuando esté disponible.
- Actualizar los estados a medida que se reciben las muestras o se pasan a evaluación.

### 7.2 Evaluación Física `/dashboard/physical-evaluation`

- Evaluar físicamente las muestras entrantes antes de la evaluación sensorial:
- Lista de verificación de olores (típicos/atípicos), humedad, métricas de granos/defectos, notas textuales.
- Guardar evaluaciones para actualizar el estado físico de la muestra.
- Aprobar o descalificar muestras según las reglas físicas; los participantes reciben notificaciones cuando se descalifican (con los motivos).

### 7.3 Asignación de Jueces `/dashboard/sample-assignment`

- Asignar muestras aprobadas a los jueces con plazos y seguimiento.

### 7.4 Supervisión de la evaluación `/dashboard/evaluation-supervision`

- Supervisar el progreso general:
- Estado de cada muestra (asignada, evaluando, evaluada), puntuación media y plazos.
- Indicadores clave de rendimiento (KPI) por juez (evaluaciones pendientes/en curso/completadas) y marcas de tiempo.
- Actualizar para ver el estado en tiempo real.

### 7.5 Resultados `/dashboard/results` y Resultados finales `/dashboard/final-results`

- Resultados: Resultados consolidados de la evaluación sensorial con puntuaciones y clasificación.
- Resultados finales: Resultados agregados de la evaluación final; muestra la clasificación, detalles por muestra y permite generar informes PDF de los participantes (con un radar sensorial y métricas físicas opcionales).

### 7.6 Notificaciones `/dashboard/notifications`

- Revisar las notificaciones del sistema y sus prioridades; marcar como leídas/no leídas o eliminar.

### 7.7 Mi Perfil `/dashboard/profile`

- Ver los detalles de tu perfil.

---

## 8) Experiencia de Administrador

Los administradores tienen todas las funciones de Director, además de la gestión de usuarios y concursos.

### 8.1 Gestión de Usuarios `/dashboard/users`

- Ver todos los usuarios (excepto los administradores en la lista predeterminada) y filtrar por rol.
- Activar/Desactivar usuarios (verificación para el registro).
- Eliminar usuarios.
- Para Evaluadores: ver y descargar los documentos subidos.

### 8.2 Gestión de Concursos `/dashboard/contests`

- Crear y editar concursos con:
- Nombre, Descripción, Ubicación
- Fechas (inicio/fin)
- Precios: tarifa de muestra y tarifa de evaluación
- Indicador de evaluación final
- El estado (próximo/activo/completado) se calcula a partir de las fechas.

### 8.3 Gestión financiera `/dashboard/finance`

- Marcador de posición para resúmenes financieros.

---

## 9) Pagos (PayPal)

- En el paso de Pago del Envío de Muestras, seleccione PayPal y acepte los términos.
- Se mostrarán los Botones Inteligentes de PayPal; complete el pago.
- Una función de Supabase Edge verifica el pedido con PayPal y registra el pago en la base de datos.
- El estado del pago de la muestra del participante se actualiza a "Completado".

Si PayPal no está disponible (falta el ID del cliente), verá un mensaje en línea; contacte al administrador.

---

## 10) Notificaciones

- La página de Notificaciones muestra todos los mensajes de su cuenta:
- Tipos: muestra recibida/aprobada/descalificada, asignación de jueces, progreso de la evaluación, hitos del concurso, clasificaciones, etc.
- Prioridades: urgente/alta/media/baja.
- Puede filtrar por tipo/prioridad, marcar como leído/no leído, eliminar o ver el contenido detallado (incluidos los motivos de descalificación, si corresponde).

---

## 11) Resultados

### 11.1 Resultados `/dashboard/results`

- Muestra los resultados en tiempo real de las evaluaciones sensoriales con las muestras mejor clasificadas, un desglose de las puntuaciones, estadísticas y detalles.

### 11.2 Resultados Finales `/dashboard/final-results`

- Agrega los registros de la evaluación final para presentar una clasificación final.
- Al seleccionar un resultado, se muestran los atributos sensoriales detallados, detalles físicos opcionales y un informe PDF descargable.

---

## 12) Verificación basada en QR (Pública)

- Escanea el código QR de la muestra o visita `/verify/:trackingCode`.
- La página muestra la información de la muestra y su estado actual, lo que proporciona transparencia y una verificación a prueba de manipulaciones.

---

## 13) Consejos y solución de problemas

- ¿No puedes iniciar sesión después de registrarte? Es probable que tu perfil necesite la verificación del administrador.
- ¿No aparece el botón de PayPal? El administrador debe configurar el ID de cliente de PayPal en las variables de entorno.
- ¿No encuentra un concurso en la presentación? Debe estar en estado próximo/activo.
- ¿Descalificado en la evaluación física? Revise sus notificaciones para conocer los motivos.
- ¿Resultados vacíos? Es posible que los jueces/evaluadores aún no hayan completado las evaluaciones.

---

## 14) Glosario

- Código de seguimiento: Un código externo único que se utiliza en la verificación pública y de QR.
- Código interno: Un código generado internamente para organizar y anonimizar las muestras.
- Evaluación física: Primera evaluación (olor, humedad, defectos) para aprobar o descalificar las muestras.
- Evaluación sensorial: Los jueces evalúan los atributos de sabor y la calidad general.
- Evaluación final: Etapa avanzada opcional realizada por los evaluadores.

---

## 15) Dónde encontrar cada página

- Público
- Inicio: `/`
- Verificación QR: `/verify/:trackingCode`
- Autorización
- Registro: `/register`
- Inicio de sesión: `/login`
- Panel de control (basado en roles)
- Panel de control: `/dashboard`
- Gestión de usuarios: `/dashboard/users` (admin)
- Gestión de concursos: `/dashboard/contests` (admin/director)
- Gestión de muestras: `/dashboard/samples` (admin/director)
- Evaluación física: `/dashboard/physical-evaluation` (director)
- Asignación de jueces: `/dashboard/sample-assignment` (director)
- Supervisión de la evaluación: `/dashboard/evaluation-supervision` (director)
- Panel de control de jueces (sensorial): `/dashboard/evaluation` (judge)
- Envío de muestras: `/dashboard/submission` (participante)
- Resultados: `/dashboard/results`
- Resultados finales: `/dashboard/final-results`
- Notificaciones: `/dashboard/notifications`
- Mi perfil: `/dashboard/profile`

---

## 16) Notas de configuración del administrador (para contexto)

- La aplicación requiere variables de entorno para Supabase y PayPal, así como depósitos de almacenamiento configurados para códigos QR y documentos del evaluador.
- Aplique las migraciones/políticas de SQL proporcionadas en la carpeta `sqls/` para habilitar RLS y RPC.

Esta guía refleja las rutas de código activas y la estructura de páginas de la aplicación.

---

## 17) Instrucciones detalladas del módulo (paso a paso)

### 17.1 Registro e inicio de sesión

1. Registro

- Complete los campos obligatorios; seleccione un rol.
- Enviar: su perfil aparece como "no verificado". Aún no puede iniciar sesión.
- Un administrador activa su perfil en `/dashboard/users`.

2. Inicio de sesión

- Tras la activación, inicie sesión en `/login`.
- Accederá a `/dashboard` con el menú específico para su rol.

3. Problemas comunes

- Credenciales incorrectas: inténtelo de nuevo o contacte con el soporte técnico.
- No verificado: espere la aprobación del administrador.

### 17.2 Participante: Envío de muestras (todos los pasos)

1. Selección del concurso

- Solo aparecen los concursos en estado próximo/activo.
- Al seleccionar un concurso, se aplican las tarifas; total = tarifa de entrada + tarifa de muestra.

2. Origen y Propietario

- País (obligatorio), Departamento/Municipio/Distrito (opcional), Nombre de la finca.
- Nombre completo del propietario, DNI (opcional), Teléfono (opcional), Correo electrónico (opcional), Dirección (opcional).
- Cooperativa: seleccionar y especificar el nombre (opcional).

3. Información de la muestra

- Cantidad (recomendada por defecto: 3 kg), Material genético, Edad del cultivo, Hectáreas de origen, Humedad, % de fermentación.

4. Procesamiento

- Tipo de fermentador, Tiempo de fermentación (h), Tipo de secado, Tiempo de secado (h).

5. Pago

- Seleccione PayPal y marque "Aceptar términos" para activar el botón.

- Complete la ventana emergente de PayPal; una vez aprobado, el pago se verifica en el servidor y se registra.

6. Página de éxito

- Muestra el concurso, el propietario/finca, el código de seguimiento y la URL del código QR.
- Use el QR en las etiquetas del paquete; los destinatarios escanearán `/verify/:trackingCode`.

Errores y recuperación

- Si se cancela PayPal, puede volver a intentarlo.
- Si se produce un error durante la captura, aparecerá un mensaje; inténtelo de nuevo más tarde o contacte con el soporte técnico.

### 17.3 Director — Gestión de muestras

- Tarjetas de resumen: totales por estado.
- Filtros:
- Búsqueda de texto por código externo, participante u origen.
- Campo de filtro de código interno.
- Menú desplegable de estado (todos/enviados/recibidos/evaluación física/aprobados/descalificados).
- Acciones:
- Actualizar para recargar.
- Recibir muestra: marca la muestra seleccionada como recibida y establece la fecha de recepción.
- Eliminar muestra: elimina una muestra (usar con precaución).

### 17.4 Director — Evaluación Física (criterios y acciones)

Flujo de trabajo

1. Seleccione una muestra con el estado "Recibida" o "Evaluación física".
2. Complete las secciones del formulario:

- Lista de verificación de olores: marque como "Típico" o "Atípico". Los olores atípicos se añaden a la categoría de "Aromas indeseables".
- Humedad (%), granos rotos, planos, afectados o con defectos.
- Granos: bien fermentados o ligeramente fermentados, morados, pizarrosos, moho interno, sobrefermentados.
- Notas (opcional).

Guardar y estado

- Guardar evaluación: almacena la evaluación; el estado de la muestra pasa a ser "Evaluación física" a menos que se descalifique.
- Aprobar muestra: establece el estado en "Aprobado" (listo para la asignación del juez).

Criterios de aprobación/rechazo (descalificar si corresponde):

- Presencia de aromas indeseables. - Humedad < 3,5 % o > 8,0 %.
- Granos quebrados > 10 %.
- Granos/insectos afectados ≥ 1.
- Fermentación adecuada + Fermentación leve < 60 %.
- Granos morados > 15 %.
- Granos pizarrosos > 0 %.
- Granos con moho interno > 0 %.
- Granos sobrefermentados > 0 %.
- Solo advertencia: Granos planos > 15 % (no descalifica).

Notificaciones

- Los motivos de descalificación se guardan; los usuarios pueden verlos en la interfaz de notificaciones.

### 17.5 Director — Asignación de jueces

- Modos: Individual (asignar jueces a una muestra) o Masivo (asignar a varias muestras).
- Jueces disponibles: lista de jueces activos (se muestra la disponibilidad).
- Pasos para la asignación individual:

1. Haga clic en una muestra con el estado "Aprobado". 2. Seleccionar jueces (casillas de verificación).
2. Asignar jueces; la muestra pasa a la fase de asignado/evaluando a medida que los jueces progresan.

Pasos para la asignación masiva:

1. Cambiar al modo masivo.
2. Seleccionar varias muestras aprobadas mediante las casillas de verificación.
3. Seleccionar jueces y asignar.

Leyenda de estado: aprobado → asignado → evaluando → evaluado.

### 17.6 Juez — Panel de control y evaluación sensorial

Panel de control

- Ver recuentos: total/pendiente/en curso/completado; plazos por concurso.
- Hacer clic en una muestra para abrir la evaluación sensorial.

Formulario (escalas de 0 a 10)

- Atributos: cacao, amargor, astringencia, caramelo/panela, totales agrupados (acidez, frutas, vegetal, floral, madera, especias, frutos secos), grado de tueste, total de defectos.
- Los sub-atributos generan totales automáticamente. Un gráfico de radar en vivo visualiza el perfil.
- Comentarios: notas de sabor, recomendaciones y otros aspectos positivos.
- Veredicto: Aprobado o Descalificado (con las razones si es necesario).
- La calidad general se calcula automáticamente a partir de los aspectos positivos menos una pequeña penalización por defectos.
- Al enviar, se guarda la evaluación; el progreso pasa al 100 % y el estado es "Completado".

### 17.7 Director — Supervisión de la Evaluación

- Resumen con filtros: todo/asignado/evaluando/evaluado.
- Por muestra: código interno, participante, concurso, fecha límite, puntuación media, barra de progreso y lista de jueces con estados y fechas.
- Estadísticas rápidas: jueces asignados, recuento de completados/en curso/pendientes.
- Actualizar para obtener los datos más recientes.

### 17.8 Análisis a fondo de las notificaciones

- Filtros: por tipo y prioridad.
- Actualizaciones en tiempo real: las nuevas filas aparecen sin necesidad de recargar.
- Acciones: marcar como leído/no leído, eliminar, marcar todo como leído.
- Vista de detalles:
- Muestra las insignias por tipo/prioridad y una marca de tiempo humanizada.
- Los mensajes descalificados se dividen en mensaje base y motivos con viñetas.

### 17.9 Análisis a fondo de los resultados y los resultados finales

Resultados

- Muestras con mejor puntuación de las evaluaciones sensoriales, con desgloses detallados y estadísticas.

Resultados finales

- Agrega las evaluaciones finales por muestra (puntuación media, fecha más reciente).
- Al seleccionar un elemento, se cargan los detalles físicos (si los hay) y los atributos sensoriales completos para el radar.
- Descargar informe: genera un PDF del participante que incluye el radar y métricas opcionales.

### 17.10 Detalles de verificación QR

- Muestra el estado actual de la muestra e información clave (código de seguimiento, fecha de envío, propietario/granja, concurso).
- Icono de estado: verde para aprobado/evaluado, rojo para descalificado, azul para en tránsito.
- Utilice este enlace en el empaque para permitir una verificación pública transparente.
