' ==============================================================================
' LUKEAPP EXCEL CLIENT v1.0 - MODULO CANONICO MULTIPROYECTO
' Arquitectura Orientada a Negocio: Proyecto, Sync, Ingenieria, Operacion,
' Inteligencia y Seguridad (Sin dependencias de hoja CONFIG)
' Version limpia ASCII (Sin acentos ni caracteres especiales)
' ==============================================================================
Option Explicit

Private Const API_BASE_URL As String = "https://app.lukeapp.cl"
Private Const BOT_WHATSAPP_URL As String = "https://wa.me/56951875221"
Private Const VERSION_PLANTILLA As String = "1.0"

' Token volatil en memoria (destruido automaticamente al cerrar Excel)
Private m_JwtToken As String

' ==============================================================================
' SECCION 1: CALLBACKS DEL RIBBON (UI DE EXCEL)
' ==============================================================================

' --- GRUPO 1: PROYECTO ---
Public Sub VerProyectoRibbon(control As IRibbonControl)
    VerProyectoActivo
End Sub

Public Sub ActualizarProyectoRibbon(control As IRibbonControl)
    Dim usuarioWindows As String
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    If ActualizarProyectosAutorizados(False) Then
        MsgBox "Proyectos sincronizados con exito desde Luke Core." & vbCrLf & vbCrLf & _
               "- Proyecto: " & LeerDeSistema("PROYECTO_CODIGO") & vbCrLf & _
               "- Nombre: " & LeerDeSistema("PROYECTO_NOMBRE") & vbCrLf & _
               "- Estado: " & LeerDeSistema("PROYECTO_ESTADO") & vbCrLf & _
               "- Centro de Costo: " & LeerDeSistema("CENTRO_COSTO"), _
               vbInformation, "LukeApp Proyectos"
    End If
End Sub

Public Sub CambiarProyectoRibbon(control As IRibbonControl)
    Dim usuarioWindows As String
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    ActualizarProyectosAutorizados True
End Sub

' --- GRUPO 2: SINCRONIZACION ---
Public Sub PublicarListaJuntasRibbon(control As IRibbonControl)
    PublicarListaJuntas
End Sub

Public Sub ActualizarDesdeNubeRibbon(control As IRibbonControl)
    ActualizarHojaActiva
End Sub

Public Sub ActualizarTodoElProyectoRibbon(control As IRibbonControl)
    ActualizarPlanillaDesdeNube
End Sub

Public Sub VerEstadoSyncRibbon(control As IRibbonControl)
    Dim proyCod As String, proyNom As String, userWin As String
    Dim ultSync As String, estadoSesion As String, totalJuntas As Long
    Dim tbl As ListObject
    
    proyCod = LeerDeSistema("PROYECTO_CODIGO")
    proyNom = LeerDeSistema("PROYECTO_NOMBRE")
    userWin = LeerDeSistema("USUARIO_WINDOWS")
    ultSync = LeerDeSistema("ULTIMA_SYNC")
    
    If Len(m_JwtToken) > 20 Then
        estadoSesion = "CONECTADO (Sesion Activa - JWT 4h)"
    Else
        estadoSesion = "DESCONECTADO (Requiere PIN OTP)"
    End If
    
    totalJuntas = 0
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("LIST_JUNTAS").ListObjects("tbl_juntas")
    If Not tbl Is Nothing Then totalJuntas = tbl.ListRows.Count
    On Error GoTo 0
    
    MsgBox "ESTADO DEL CLIENTE LUKEAPP:" & vbCrLf & vbCrLf & _
           "========================================" & vbCrLf & _
           "PROYECTO ACTIVO : [" & IIf(proyCod = "", "SIN SELECCION", proyCod) & "] " & proyNom & vbCrLf & _
           "USUARIO WINDOWS : " & IIf(userWin = "", ObtenerUsuarioWindowsCompleto(), userWin) & vbCrLf & _
           "ESTADO SESION   : " & estadoSesion & vbCrLf & _
           "ULTIMA SYNC     : " & IIf(ultSync = "", "Sin sincronizaciones previas", ultSync) & vbCrLf & _
           "JUNTAS EN EXCEL : " & totalJuntas & " registros en tbl_juntas" & vbCrLf & _
           "VERSION CLIENTE : v" & VERSION_PLANTILLA & vbCrLf & _
           "========================================", _
           vbInformation, "LukeApp - Estado del Sistema"
End Sub

Public Sub VerHistorialSyncRibbon(control As IRibbonControl)
    Dim http As Object
    Dim usuarioWindows As String
    Dim respJson As String
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "GET", API_BASE_URL & "/api/piping/auditoria?limite=5", False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.send
    
    If http.Status = 200 Then
        respJson = http.responseText
        MsgBox "Ultimos Lotes Sincronizados en Faena:" & vbCrLf & vbCrLf & respJson, vbInformation, "Historial de Sincronizacion"
    Else
        MsgBox "No fue posible consultar el historial (" & http.Status & "):" & vbCrLf & http.responseText, vbExclamation, "Historial Sync"
    End If
    Set http = Nothing
End Sub

' --- GRUPO 3: INGENIERIA (NAVEGACION DE HOJAS MAESTRAS) ---
Public Sub IrAPIDRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_PID", "tbl_pid", "UUID,CODIGO_PID,TITULO,REVISION,ESTADO,ARCHIVO_PDF,RESPONSABLE,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrALineasRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_LINEAS", "tbl_lineas", "UUID,CODIGO_LINEA,CLASE,NPS,SERVICIO,MATERIAL,PLANO_CLIENTE,METROS,ORIGEN,DESTINO,TEMP_DISENO,PRESION_DISENO,TIPO_PRUEBA,ESQUEMA_PINTURA,RAL,REVESTIMIENTO_INTERIOR,AISLACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrAIsometricosRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_ISOMETRICOS", "tbl_isometricos", "UUID,CODIGO_ISO,CODIGO_LINEA,HOJA,REVISION,PLANO_CONTRATISTA,PLANO_CLIENTE,CLASE,NPS,INGENIERIA,CONDICION,SPOOLEADO,ESTADO,DISTRIBUIDO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrASpoolsRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_SPOOLS", "tbl_spools", "UUID,CODIGO_SPOOL,CODIGO_ISO,TAG_GESTION,SISTEMA,SUB_SISTEMA,AREA,CODIGO_LINEA,SPOOL_NUMERO,NPS,MATERIAL,SERVICIO,PROCESO,UBICACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrAJuntasRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_JUNTAS", "tbl_juntas", "UUID,ID_JUNTA,CODIGO_SPOOL,CODIGO_ISO,TAG,SISTEMA,SUB_SISTEMA,TEST_PACK,TIPO_UNION,DESTINATION,NPS,SCH,CLASE,MATERIAL,METROS,SERVICIO,ESTADO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrAValvulasRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_VALVULAS", "tbl_valvulas", "UUID,CODIGO_VALVULA,ID_MTO,CODIGO_LINEA,CLASE,TAG_PIPING,TAG_INSTRUMENTACION,NPS,CANTIDAD,DESCRIPCION,CORRELATIVO_MAQUETA,NUMERO_ACONEX,DIAGRAMA,ESTADO,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

Public Sub IrASoportesRibbon(control As IRibbonControl)
    NavegarOCrearHoja "LIST_SOPORTES", "tbl_soportes", "UUID,CODIGO_SOPORTE,ITEM_NUMERO,CWA,CWP,EWP,PWP,CODIGO_LINEA,CODIGO_ISO,CLASE,TIPO_SOPORTE,NPS,CANTIDAD,UNIDAD,PESO_KG,SUMINISTRO,ESTADO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
End Sub

' --- GRUPO 4: OPERACION (SEGUIMIENTO Y CONTROL) ---
Public Sub VerAvanceRibbon(control As IRibbonControl)
    MsgBox "Modulo de Operacion - Avance de Proyecto:" & vbCrLf & vbCrLf & _
           "- Total Juntas en Faena: 15" & vbCrLf & _
           "- Juntas Soldadas: 6 (40%)" & vbCrLf & _
           "- Juntas Armadas: 2 (13%)" & vbCrLf & _
           "- Juntas Inspeccionadas: 2 (13%)" & vbCrLf & _
           "- Aprobadas NDE: 2 (13%)" & vbCrLf & _
           "- Activas / Pendientes: 3 (21%)", _
           vbInformation, "LukeApp - Avance de Piping"
End Sub

Public Sub VerCalidadRibbon(control As IRibbonControl)
    MsgBox "Modulo de Calidad (QA/QC):" & vbCrLf & vbCrLf & _
           "- Ensayos NDE Programados: RT / UT / PT" & vbCrLf & _
           "- Tasa de Rechazo Actual: 0.0%" & vbCrLf & _
           "- Inspecciones Visuales Conformes: 100%" & vbCrLf & _
           "Los informes NDE quedan vinculados directamente al UUID de cada junta.", _
           vbInformation, "LukeApp - Calidad y NDE"
End Sub

Public Sub VerLogisticaRibbon(control As IRibbonControl)
    MsgBox "Modulo de Logistica y Trazabilidad:" & vbCrLf & vbCrLf & _
           "- Spools en Taller de Fabricacion" & vbCrLf & _
           "- Spools en Patio de Acopio" & vbCrLf & _
           "- Spools en Transporte a Terreno" & vbCrLf & _
           "- Spools Posicionados / Montados", _
           vbInformation, "LukeApp - Logistica de Spools"
End Sub

Public Sub VerSdiRibbon(control As IRibbonControl)
    MsgBox "Modulo SDI / RFI (Solicitudes de Informacion):" & vbCrLf & vbCrLf & _
           "Permite gestionar consultas de ingenieria, interferencias y cambios en terreno con trazabilidad documental.", _
           vbInformation, "LukeApp - SDI & RFI"
End Sub

' --- GRUPO 5: INTELIGENCIA (PANEL, BIM Y BOTS) ---
Public Sub AbrirDashboardRibbon(control As IRibbonControl)
    On Error Resume Next
    ActiveWorkbook.FollowHyperlink Address:=API_BASE_URL & "/admin", NewWindow:=True
    If Err.Number <> 0 Then
        MsgBox "Abriendo Panel Administrativo en: " & API_BASE_URL & "/admin", vbInformation, "LukeApp Dashboard"
    End If
End Sub

Public Sub AbrirBimViewerRibbon(control As IRibbonControl)
    MsgBox "Visor Digital BIM 3D:" & vbCrLf & vbCrLf & _
           "Conectando con el modelo digital de faena y correlacion de elementos CWP / Spools.", _
           vbInformation, "LukeApp BIM Viewer"
End Sub

Public Sub AbrirBotsIaRibbon(control As IRibbonControl)
    On Error Resume Next
    ActiveWorkbook.FollowHyperlink Address:=BOT_WHATSAPP_URL, NewWindow:=True
    If Err.Number <> 0 Then
        MsgBox "Asistente LukeBot WhatsApp: " & BOT_WHATSAPP_URL, vbInformation, "LukeBot IA"
    End If
End Sub

' --- GRUPO 6: SEGURIDAD ---
Public Sub IniciarSesionRibbon(control As IRibbonControl)
    IniciarSesion
End Sub

Public Sub CerrarSesionLukeAppRibbon(control As IRibbonControl)
    CerrarSesion
End Sub

Public Sub SolicitarAccesoRibbon(control As IRibbonControl)
    SolicitarAcceso
End Sub

' ==============================================================================
' SECCION 2: MACROS OPERACIONALES PRINCIPALES
' ==============================================================================

Public Sub SolicitarAcceso()
    Dim usuarioWindows As String
    Dim nombreEquipo As String
    Dim nombre As String
    Dim telefono As String
    Dim jsonPayload As String
    Dim http As Object
    
    On Error GoTo ManejoError
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    nombreEquipo = Trim(Environ("COMPUTERNAME"))
    
    nombre = InputBox( _
        "Ingresa tu Nombre y Apellido para la solicitud de acceso:" & vbCrLf & vbCrLf & _
        "Usuario Windows: " & usuarioWindows, _
        "LukeApp - Solicitar Acceso")
    nombre = Trim(nombre)
    If nombre = "" Then Exit Sub
    
    telefono = InputBox( _
        "Ingresa tu numero de WhatsApp con codigo de pais (ejemplo: +56912345678):" & vbCrLf & vbCrLf & _
        "A este numero recibiras los codigos PIN y notificaciones de aprobacion.", _
        "LukeApp - Telefono WhatsApp", "+569")
    telefono = Trim(telefono)
    If telefono = "" Or telefono = "+569" Then Exit Sub
    
    Application.StatusBar = "Enviando solicitud de acceso al administrador..."
    
    jsonPayload = "{" & _
        """usuario_windows"": """ & EscaparJson(usuarioWindows) & """," & _
        """telefono"": """ & EscaparJson(telefono) & """," & _
        """nombre"": """ & EscaparJson(nombre) & """," & _
        """equipo"": """ & EscaparJson(nombreEquipo) & """" & _
    "}"
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/access/request", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonPayload
    
    Application.StatusBar = False
    
    If http.Status = 200 Or http.Status = 201 Then
        MsgBox "Solicitud Enviada con Exito." & vbCrLf & vbCrLf & _
               "Se ha notificado al Administrador via WhatsApp." & vbCrLf & _
               "En cuanto tu acceso sea aprobado, recibiras un mensaje en WhatsApp (" & telefono & ") para iniciar sesion.", _
               vbInformation, "LukeApp Onboarding"
    Else
        MsgBox "No se pudo registrar la solicitud (" & http.Status & "):" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Error al Solicitar Acceso"
    End If
    
    Set http = Nothing
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrio un error al solicitar acceso:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

Public Sub IniciarSesion()
    Dim usuarioWindows As String
    
    On Error GoTo ManejoError
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    m_JwtToken = ""
    
    If AsegurarTokenValido(usuarioWindows) Then
        ActualizarProyectosAutorizados False
        
        MsgBox "Sesion Iniciada Exitosamente." & vbCrLf & vbCrLf & _
               "- Usuario: " & usuarioWindows & vbCrLf & _
               "- Proyecto Activo: " & LeerDeSistema("PROYECTO_CODIGO") & " (" & LeerDeSistema("PROYECTO_NOMBRE") & ")" & vbCrLf & _
               "- Vigencia: 4 horas", _
               vbInformation, "LukeApp Seguridad"
    End If
    Exit Sub

ManejoError:
    MsgBox "Ocurrio un error al iniciar sesion:" & vbCrLf & Err.Description, vbCritical, "Error de Sesion"
End Sub

Public Sub CerrarSesion()
    m_JwtToken = ""
    MsgBox "Tu sesion ha sido cerrada correctamente." & vbCrLf & _
           "El token en memoria fue eliminado.", vbInformation, "LukeApp Seguridad"
End Sub

Public Sub PublicarListaJuntas()
    Dim usuarioWindows As String
    Dim idProyecto As String
    Dim jsonPayload As String
    Dim http As Object
    Dim respuestaJson As String
    Dim totalFilas As Long
    Dim tInicio As Double
    
    On Error GoTo ManejoError
    tInicio = Timer
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    If idProyecto = "" Then
        If Not ActualizarProyectosAutorizados(False) Then Exit Sub
        idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    End If
    
    If idProyecto = "" Then
        MsgBox "No hay ningun proyecto asignado a tu usuario para sincronizar.", vbCritical, "Error de Autorizacion"
        Exit Sub
    End If
    
    jsonPayload = ConstruirPayloadV1(idProyecto, usuarioWindows, totalFilas)
    If totalFilas = 0 Then
        MsgBox "No se encontraron juntas con 'ID_JUNTA' en la tabla 'tbl_juntas'.", vbExclamation, "LukeApp Sync"
        Exit Sub
    End If
    
    Application.StatusBar = "Sincronizando " & totalFilas & " juntas en proyecto " & idProyecto & "..."
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/piping/lista-juntas", False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonPayload
    
    If http.Status = 200 Or http.Status = 201 Then
        respuestaJson = http.responseText
        
        ActualizarUuidsEnTabla respuestaJson
        GuardarEnSistema "ULTIMA_SYNC", Format(Now, "yyyy-mm-dd hh:nn:ss")
        
        Application.StatusBar = False
        MsgBox "Sincronizacion Exitosa:" & vbCrLf & vbCrLf & _
               "- Proyecto: " & idProyecto & " (" & LeerDeSistema("PROYECTO_NOMBRE") & ")" & vbCrLf & _
               "- Juntas procesadas: " & totalFilas & vbCrLf & _
               "- Usuario autenticado: " & usuarioWindows & vbCrLf & _
               "- Tiempo: " & Format(Timer - tInicio, "0.00") & " seg", _
               vbInformation, "LukeApp Sync v1.0"
               
    ElseIf http.Status = 401 Then
        m_JwtToken = ""
        Application.StatusBar = False
        MsgBox "La sesion expiro o el token fue rechazado." & vbCrLf & _
               "Presiona nuevamente PUBLICAR para solicitar un PIN nuevo.", _
               vbExclamation, "Sesion Expirada"
    Else
        Application.StatusBar = False
        MsgBox "Error del Servidor (" & http.Status & "):" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Error de Sincronizacion"
    End If
    
    Set http = Nothing
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrio un error en la ejecucion:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

Public Sub ActualizarHojaActivaRibbon(control As IRibbonControl)
    ActualizarHojaActiva
End Sub

Public Sub ActualizarHojaActiva()
    Dim usuarioWindows As String
    Dim idProyecto As String
    Dim nombreHoja As String
    Dim totalProcesados As Long
    
    On Error GoTo ManejoError
    
    nombreHoja = UCase(Trim(ActiveSheet.Name))
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    If idProyecto = "" Then
        If Not ActualizarProyectosAutorizados(False) Then Exit Sub
        idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    End If
    
    Select Case nombreHoja
        Case "LIST_PID"
            Application.StatusBar = "Sincronizando únicamente P&IDs..."
            totalProcesados = DescargarYFusionarLista("/api/piping/pid", "LIST_PID", "tbl_pid", "UUID,CODIGO_PID,TITULO,REVISION,ESTADO,ARCHIVO_PDF,RESPONSABLE,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_pid", idProyecto)
            MsgBox "Tabla LIST_PID actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_LINEAS"
            Application.StatusBar = "Sincronizando únicamente Líneas..."
            totalProcesados = DescargarYFusionarLista("/api/piping/lineas", "LIST_LINEAS", "tbl_lineas", "UUID,CODIGO_LINEA,CLASE,NPS,SERVICIO,MATERIAL,PLANO_CLIENTE,METROS,ORIGEN,DESTINO,TEMP_DISENO,PRESION_DISENO,TIPO_PRUEBA,ESQUEMA_PINTURA,RAL,REVESTIMIENTO_INTERIOR,AISLACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_linea", idProyecto)
            MsgBox "Tabla LIST_LINEAS actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_ISOMETRICOS"
            Application.StatusBar = "Sincronizando únicamente Isométricos..."
            totalProcesados = DescargarYFusionarLista("/api/piping/isometricos", "LIST_ISOMETRICOS", "tbl_isometricos", "UUID,CODIGO_ISO,CODIGO_LINEA,HOJA,REVISION,PLANO_CONTRATISTA,PLANO_CLIENTE,CLASE,NPS,INGENIERIA,CONDICION,SPOOLEADO,ESTADO,DISTRIBUIDO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_iso", idProyecto)
            MsgBox "Tabla LIST_ISOMETRICOS actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_SPOOLS"
            Application.StatusBar = "Sincronizando únicamente Spools..."
            totalProcesados = DescargarYFusionarLista("/api/piping/spools", "LIST_SPOOLS", "tbl_spools", "UUID,CODIGO_SPOOL,CODIGO_ISO,TAG_GESTION,SISTEMA,SUB_SISTEMA,AREA,CODIGO_LINEA,SPOOL_NUMERO,NPS,MATERIAL,SERVICIO,PROCESO,UBICACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_spool", idProyecto)
            MsgBox "Tabla LIST_SPOOLS actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_JUNTAS"
            Application.StatusBar = "Sincronizando únicamente Juntas..."
            totalProcesados = SincronizarJuntasDesdeNube(idProyecto)
            MsgBox "Tabla LIST_JUNTAS actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_VALVULAS"
            Application.StatusBar = "Sincronizando únicamente Válvulas..."
            totalProcesados = DescargarYFusionarLista("/api/piping/valvulas", "LIST_VALVULAS", "tbl_valvulas", "UUID,CODIGO_VALVULA,ID_MTO,CODIGO_LINEA,CLASE,TAG_PIPING,TAG_INSTRUMENTACION,NPS,CANTIDAD,DESCRIPCION,CORRELATIVO_MAQUETA,NUMERO_ACONEX,DIAGRAMA,ESTADO,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_valvula", idProyecto)
            MsgBox "Tabla LIST_VALVULAS actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case "LIST_SOPORTES"
            Application.StatusBar = "Sincronizando únicamente Soportes..."
            totalProcesados = DescargarYFusionarLista("/api/piping/soportes", "LIST_SOPORTES", "tbl_soportes", "UUID,CODIGO_SOPORTE,ITEM_NUMERO,CWA,CWP,EWP,PWP,CODIGO_LINEA,CODIGO_ISO,CLASE,TIPO_SOPORTE,NPS,CANTIDAD,UNIDAD,PESO_KG,SUMINISTRO,ESTADO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_soporte", idProyecto)
            MsgBox "Tabla LIST_SOPORTES actualizada exitosamente (" & totalProcesados & " registros).", vbInformation, "LukeApp Sync Rápido"
            
        Case Else
            ' Si no está en una lista conocida, actualizar todo
            ActualizarPlanillaDesdeNube
            Exit Sub
    End Select
    
    GuardarEnSistema "ULTIMA_SYNC", Format(Now, "yyyy-mm-dd hh:nn:ss")
    Application.StatusBar = False
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrio un error al sincronizar la hoja actual:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

Public Sub ActualizarPlanillaDesdeNube()
    Dim usuarioWindows As String
    Dim idProyecto As String
    Dim totalJuntas As Long, totalPid As Long, totalLineas As Long, totalIsos As Long, totalSpools As Long, totalValvulas As Long, totalSoportes As Long
    
    On Error GoTo ManejoError
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    If idProyecto = "" Then
        If Not ActualizarProyectosAutorizados(False) Then Exit Sub
        idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    End If
    
    Application.StatusBar = "Sincronizando listas maestras de faena desde Luke Core..."
    
    ' 1. Sincronizar P&IDs
    totalPid = DescargarYFusionarLista("/api/piping/pid", "LIST_PID", "tbl_pid", "UUID,CODIGO_PID,TITULO,REVISION,ESTADO,ARCHIVO_PDF,RESPONSABLE,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_pid", idProyecto)
    
    ' 2. Sincronizar Líneas (con PLANO_CLIENTE)
    totalLineas = DescargarYFusionarLista("/api/piping/lineas", "LIST_LINEAS", "tbl_lineas", "UUID,CODIGO_LINEA,CLASE,NPS,SERVICIO,MATERIAL,PLANO_CLIENTE,METROS,ORIGEN,DESTINO,TEMP_DISENO,PRESION_DISENO,TIPO_PRUEBA,ESQUEMA_PINTURA,RAL,REVESTIMIENTO_INTERIOR,AISLACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_linea", idProyecto)
    
    ' 3. Sincronizar Isométricos (con PLANO_CLIENTE)
    totalIsos = DescargarYFusionarLista("/api/piping/isometricos", "LIST_ISOMETRICOS", "tbl_isometricos", "UUID,CODIGO_ISO,CODIGO_LINEA,HOJA,REVISION,PLANO_CONTRATISTA,PLANO_CLIENTE,CLASE,NPS,INGENIERIA,CONDICION,SPOOLEADO,ESTADO,DISTRIBUIDO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_iso", idProyecto)
    
    ' 4. Sincronizar Spools
    totalSpools = DescargarYFusionarLista("/api/piping/spools", "LIST_SPOOLS", "tbl_spools", "UUID,CODIGO_SPOOL,CODIGO_ISO,TAG_GESTION,SISTEMA,SUB_SISTEMA,AREA,CODIGO_LINEA,SPOOL_NUMERO,NPS,MATERIAL,SERVICIO,PROCESO,UBICACION,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_spool", idProyecto)
    
    ' 5. Sincronizar Juntas
    totalJuntas = SincronizarJuntasDesdeNube(idProyecto)
    
    ' 6. Sincronizar Válvulas
    totalValvulas = DescargarYFusionarLista("/api/piping/valvulas", "LIST_VALVULAS", "tbl_valvulas", "UUID,CODIGO_VALVULA,ID_MTO,CODIGO_LINEA,CLASE,TAG_PIPING,TAG_INSTRUMENTACION,NPS,CANTIDAD,DESCRIPCION,CORRELATIVO_MAQUETA,NUMERO_ACONEX,DIAGRAMA,ESTADO,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_valvula", idProyecto)
    
    ' 7. Sincronizar Soportes (con AWP)
    totalSoportes = DescargarYFusionarLista("/api/piping/soportes", "LIST_SOPORTES", "tbl_soportes", "UUID,CODIGO_SOPORTE,ITEM_NUMERO,CWA,CWP,EWP,PWP,CODIGO_LINEA,CODIGO_ISO,CLASE,TIPO_SOPORTE,NPS,CANTIDAD,UNIDAD,PESO_KG,SUMINISTRO,ESTADO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", "codigo_soporte", idProyecto)
    
    GuardarEnSistema "ULTIMA_SYNC", Format(Now, "yyyy-mm-dd hh:nn:ss")
    Application.StatusBar = False
    
    MsgBox "Sincronizacion Completa desde la Nube (Proyecto " & idProyecto & "):" & vbCrLf & vbCrLf & _
           "- P&IDs        : " & totalPid & " registros en LIST_PID" & vbCrLf & _
           "- Lineas       : " & totalLineas & " registros en LIST_LINEAS" & vbCrLf & _
           "- Isometricos  : " & totalIsos & " registros en LIST_ISOMETRICOS" & vbCrLf & _
           "- Spools       : " & totalSpools & " registros en LIST_SPOOLS" & vbCrLf & _
           "- Juntas       : " & totalJuntas & " registros en LIST_JUNTAS" & vbCrLf & _
           "- Valvulas     : " & totalValvulas & " registros en LIST_VALVULAS" & vbCrLf & _
           "- Soportes     : " & totalSoportes & " registros en LIST_SOPORTES (AWP)" & vbCrLf & vbCrLf & _
           "Auditoria y AWP sincronizados correctamente.", _
           vbInformation, "Actualizar Planilla - LukeApp"
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrio un error al actualizar la planilla:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

Private Function SincronizarJuntasDesdeNube(ByVal idProyecto As String) As Long
    SincronizarJuntasDesdeNube = DescargarYFusionarLista( _
        "/api/piping/lista-juntas", _
        "LIST_JUNTAS", _
        "tbl_juntas", _
        "UUID,ID_JUNTA,CODIGO_SPOOL,CODIGO_ISO,TAG,SISTEMA,SUB_SISTEMA,TEST_PACK,TIPO_UNION,DESTINATION,NPS,SCH,CLASE,MATERIAL,METROS,SERVICIO,ESTADO,OBSERVACIONES,VIGENTE,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR", _
        "id_junta", _
        idProyecto)
End Function

Private Function DescargarYFusionarLista(ByVal endpoint As String, ByVal nombreHoja As String, ByVal nombreTabla As String, ByVal columnasCsv As String, ByVal clavePrincipalJson As String, ByVal idProyecto As String) As Long
    Dim http As Object
    Dim respJson As String
    Dim tbl As ListObject
    Dim posReg As Long, posItem As Long, posFin As Long
    Dim totalProcesados As Long
    Dim dictFilas As Object
    Dim fechaActual As String
    Dim cols() As String
    Dim cIdx As Long, i As Long
    Dim colUuidIdx As Long, colClaveIdx As Long
    
    Set dictFilas = CreateObject("Scripting.Dictionary")
    fechaActual = Format(Now, "yyyy-mm-dd hh:nn:ss")
    
    NavegarOCrearHoja nombreHoja, nombreTabla, columnasCsv
    Set tbl = ThisWorkbook.Sheets(nombreHoja).ListObjects(nombreTabla)
    If tbl Is Nothing Then Exit Function
    
    cols = Split(columnasCsv, ",")
    colUuidIdx = ObtenerIndiceColumna(tbl, "UUID")
    colClaveIdx = ObtenerIndiceColumna(tbl, UCase(clavePrincipalJson))
    If colClaveIdx = 0 And UBound(cols) >= 1 Then colClaveIdx = 2
    
    ' Indexar filas existentes por UUID y por Código
    Dim primeraFilaVacia As Boolean
    primeraFilaVacia = False
    
    If tbl.ListRows.Count > 1 Then
        Dim v1Test As String, v2Test As String
        If colUuidIdx > 0 Then v1Test = Trim(CStr(tbl.DataBodyRange(1, colUuidIdx).Value))
        If colClaveIdx > 0 Then v2Test = Trim(CStr(tbl.DataBodyRange(1, colClaveIdx).Value))
        If v1Test = "" And v2Test = "" Then
            ' Eliminar fila en blanco residual
            tbl.ListRows(1).Delete
        End If
    End If
    
    If tbl.ListRows.Count = 1 Then
        Dim v1 As String, v2 As String
        If colUuidIdx > 0 Then v1 = Trim(CStr(tbl.DataBodyRange(1, colUuidIdx).Value))
        If colClaveIdx > 0 Then v2 = Trim(CStr(tbl.DataBodyRange(1, colClaveIdx).Value))
        If v1 = "" And v2 = "" Then primeraFilaVacia = True
    End If
    
    If Not primeraFilaVacia Then
        For i = 1 To tbl.ListRows.Count
            If colUuidIdx > 0 Then
                Dim valUuid As String
                valUuid = UCase(Trim(CStr(tbl.DataBodyRange(i, colUuidIdx).Value)))
                If valUuid <> "" And Not dictFilas.Exists(valUuid) Then dictFilas.Add valUuid, i
            End If
            If colClaveIdx > 0 Then
                Dim valKey As String
                valKey = UCase(Trim(CStr(tbl.DataBodyRange(i, colClaveIdx).Value)))
                If valKey <> "" And Not dictFilas.Exists(valKey) Then dictFilas.Add valKey, i
            End If
        Next i
    End If
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "GET", API_BASE_URL & endpoint & "?id_proyecto=" & EscaparJson(idProyecto), False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.send
    
    If http.Status = 200 Then
        respJson = http.responseText
        posReg = InStr(1, respJson, """registros""", vbTextCompare)
        If posReg > 0 Then posReg = InStr(posReg, respJson, "[")
        
        If posReg > 0 Then
            posItem = InStr(posReg, respJson, "{")
            Do While posItem > 0
                posFin = InStr(posItem, respJson, "}")
                If posFin = 0 Then Exit Do
                
                Dim bloque As String
                bloque = Mid(respJson, posItem, posFin - posItem + 1)
                
                Dim uuidVal As String, kVal As String
                uuidVal = ExtraerValorJson(bloque, "uuid")
                kVal = ExtraerValorJson(bloque, clavePrincipalJson)
                
                Dim idBuscar As String
                If uuidVal <> "" Then
                    idBuscar = UCase(Trim(uuidVal))
                Else
                    idBuscar = UCase(Trim(kVal))
                End If
                
                If idBuscar <> "" Then
                    Dim filaNum As Long
                    If dictFilas.Exists(idBuscar) Then
                        filaNum = dictFilas(idBuscar)
                    ElseIf kVal <> "" And dictFilas.Exists(UCase(Trim(kVal))) Then
                        filaNum = dictFilas(UCase(Trim(kVal)))
                    ElseIf primeraFilaVacia And totalProcesados = 0 Then
                        filaNum = 1
                        dictFilas.Add idBuscar, filaNum
                    Else
                        Dim nFila As ListRow
                        Set nFila = tbl.ListRows.Add
                        filaNum = nFila.Index
                        dictFilas.Add idBuscar, filaNum
                    End If
                    
                    For cIdx = 0 To UBound(cols)
                        Dim nomCol As String, colKeyLower As String, colValor As String
                        nomCol = Trim(cols(cIdx))
                        colKeyLower = LCase(nomCol)
                        colValor = ExtraerValorJson(bloque, colKeyLower)
                        
                        If nomCol = "FECHA_SYNC" Then
                            colValor = LimpiarFechaChile(ExtraerValorJson(bloque, "fecha_sync"))
                            If colValor = "" Then colValor = fechaActual
                        End If
                        
                        If colValor <> "" Then
                            Dim colIndexTbl As Long
                            colIndexTbl = ObtenerIndiceColumna(tbl, nomCol)
                            If colIndexTbl > 0 Then tbl.DataBodyRange(filaNum, colIndexTbl).Value = colValor
                        End If
                    Next cIdx
                    
                    totalProcesados = totalProcesados + 1
                End If
                
                posItem = InStr(posFin, respJson, "{")
            Loop
        End If
    End If
    
    Set http = Nothing
    Set dictFilas = Nothing
    DescargarYFusionarLista = totalProcesados
End Function

Public Sub VerProyectoActivo()
    Dim proyCodigo As String, proyNombre As String, proyEstado As String
    Dim centroCosto As String, userWin As String, ultSync As String, proyUuid As String
    
    proyCodigo = LeerDeSistema("PROYECTO_CODIGO")
    proyNombre = LeerDeSistema("PROYECTO_NOMBRE")
    proyEstado = LeerDeSistema("PROYECTO_ESTADO")
    centroCosto = LeerDeSistema("CENTRO_COSTO")
    userWin = LeerDeSistema("USUARIO_WINDOWS")
    ultSync = LeerDeSistema("ULTIMA_SYNC")
    proyUuid = LeerDeSistema("PROYECTO_UUID")
    
    If proyCodigo = "" Then
        MsgBox "No hay ningun proyecto activo seleccionado." & vbCrLf & vbCrLf & _
               "Haz clic en 'Iniciar Sesion' o 'Actualizar Proyecto' para cargar tus proyectos autorizados.", _
               vbExclamation, "Sin Proyecto Activo"
        Exit Sub
    End If
    
    MsgBox "Proyecto Activo (Fuente: Luke Core):" & vbCrLf & vbCrLf & _
           "- Proyecto: " & proyCodigo & vbCrLf & _
           "- Nombre: " & proyNombre & vbCrLf & _
           "- Estado: " & proyEstado & vbCrLf & _
           "- Centro de Costo: " & IIf(centroCosto = "", "N/A", centroCosto) & vbCrLf & _
           "- Usuario: " & userWin & vbCrLf & _
           "- Ultima Sincronizacion: " & IIf(ultSync = "", "Nunca", ultSync) & vbCrLf & _
           "- UUID: " & proyUuid, _
           vbInformation, "Proyecto Activo - LukeApp"
End Sub

' ==============================================================================
' SECCION 3: RESOLUCION DE PROYECTOS Y GESTION DE HOJAS DE INGENIERIA
' ==============================================================================

Public Function ActualizarProyectosAutorizados(ByVal forzarSeleccion As Boolean) As Boolean
    Dim http As Object
    Dim respuestaJson As String
    Dim posProy As Long, posItem As Long, posFin As Long
    Dim pId As String, pCod As String, pNom As String, pEst As String, pCc As String
    Dim arrId() As String, arrCod() As String, arrNom() As String, arrEst() As String, arrCc() As String
    Dim totalProy As Long, i As Long
    Dim menuTexto As String, opcStr As String, opcNum As Long
    Dim codActual As String
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "GET", API_BASE_URL & "/api/me/projects", False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.send
    
    If http.Status <> 200 Then
        MsgBox "No fue posible obtener la lista de proyectos autorizados (" & http.Status & "):" & vbCrLf & http.responseText, vbCritical, "Error Proyectos"
        ActualizarProyectosAutorizados = False
        Set http = Nothing
        Exit Function
    End If
    
    respuestaJson = http.responseText
    GuardarEnSistema "PERSONAL_ID", ExtraerValorJson(respuestaJson, "personal_id")
    GuardarEnSistema "USUARIO_WINDOWS", ExtraerValorJson(respuestaJson, "usuario_windows")
    GuardarEnSistema "VERSION_PLANTILLA", VERSION_PLANTILLA
    
    totalProy = 0
    posProy = InStr(1, respuestaJson, """proyectos""", vbTextCompare)
    If posProy > 0 Then posProy = InStr(posProy, respuestaJson, "[")
    
    If posProy > 0 Then
        posItem = InStr(posProy, respuestaJson, "{")
        Do While posItem > 0
            posFin = InStr(posItem, respuestaJson, "}")
            If posFin = 0 Then Exit Do
            
            pId = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "id")
            pCod = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "codigo")
            pNom = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "nombre")
            pEst = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "estado")
            pCc = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "centro_costo")
            
            If pCod <> "" Then
                totalProy = totalProy + 1
                ReDim Preserve arrId(1 To totalProy)
                ReDim Preserve arrCod(1 To totalProy)
                ReDim Preserve arrNom(1 To totalProy)
                ReDim Preserve arrEst(1 To totalProy)
                ReDim Preserve arrCc(1 To totalProy)
                arrId(totalProy) = pId
                arrCod(totalProy) = pCod
                arrNom(totalProy) = pNom
                arrEst(totalProy) = IIf(pEst = "", "ACTIVO", UCase(pEst))
                arrCc(totalProy) = pCc
            End If
            
            posItem = InStr(posFin, respuestaJson, "{")
        Loop
    End If
    
    If totalProy = 0 Then
        MsgBox "Tu usuario no tiene proyectos autorizados en Luke Core." & vbCrLf & vbCrLf & _
               "Solicita acceso a tu administrador de faena via WhatsApp.", vbExclamation, "Sin Proyectos"
        ActualizarProyectosAutorizados = False
        Set http = Nothing
        Exit Function
    End If
    
    codActual = LeerDeSistema("PROYECTO_CODIGO")
    
    If totalProy = 1 Then
        GuardarEnSistema "PROYECTO_UUID", arrId(1)
        GuardarEnSistema "PROYECTO_CODIGO", arrCod(1)
        GuardarEnSistema "PROYECTO_NOMBRE", arrNom(1)
        GuardarEnSistema "PROYECTO_ESTADO", arrEst(1)
        GuardarEnSistema "CENTRO_COSTO", arrCc(1)
        ActualizarProyectosAutorizados = True
        Set http = Nothing
        Exit Function
    End If
    
    If Not forzarSeleccion And codActual <> "" Then
        For i = 1 To totalProy
            If arrCod(i) = codActual Then
                GuardarEnSistema "PROYECTO_UUID", arrId(i)
                GuardarEnSistema "PROYECTO_NOMBRE", arrNom(i)
                GuardarEnSistema "PROYECTO_ESTADO", arrEst(i)
                GuardarEnSistema "CENTRO_COSTO", arrCc(i)
                ActualizarProyectosAutorizados = True
                Set http = Nothing
                Exit Function
            End If
        Next i
    End If
    
    menuTexto = "Tienes multiples proyectos autorizados. Elige el numero del proyecto activo:" & vbCrLf & vbCrLf
    For i = 1 To totalProy
        menuTexto = menuTexto & i & ". [" & arrCod(i) & "] " & arrNom(i) & vbCrLf
    Next i
    
    opcStr = InputBox(menuTexto, "LukeApp - Cambiar Proyecto", "1")
    opcStr = Trim(opcStr)
    If opcStr = "" Or Not IsNumeric(opcStr) Then
        ActualizarProyectosAutorizados = False
        Set http = Nothing
        Exit Function
    End If
    
    opcNum = CLng(opcStr)
    If opcNum < 1 Or opcNum > totalProy Then
        MsgBox "Numero de opcion invalido.", vbExclamation, "Seleccion Cancelada"
        ActualizarProyectosAutorizados = False
        Set http = Nothing
        Exit Function
    End If
    
    GuardarEnSistema "PROYECTO_UUID", arrId(opcNum)
    GuardarEnSistema "PROYECTO_CODIGO", arrCod(opcNum)
    GuardarEnSistema "PROYECTO_NOMBRE", arrNom(opcNum)
    GuardarEnSistema "PROYECTO_ESTADO", arrEst(opcNum)
    GuardarEnSistema "CENTRO_COSTO", arrCc(opcNum)
    
    MsgBox "Proyecto Activo Cambiado con Exito:" & vbCrLf & vbCrLf & _
           "- Codigo: " & arrCod(opcNum) & vbCrLf & _
           "- Nombre: " & arrNom(opcNum) & vbCrLf & _
           "- Estado: " & arrEst(opcNum), vbInformation, "Proyecto Seleccionado"
           
    ActualizarProyectosAutorizados = True
    Set http = Nothing
End Function

Private Sub NavegarOCrearHoja(ByVal nombreHoja As String, ByVal nombreTabla As String, ByVal columnasCsv As String)
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim cols() As String
    Dim i As Long
    Dim r As Long
    Dim colFaltante As Boolean
    
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(nombreHoja)
    On Error GoTo 0
    
    cols = Split(columnasCsv, ",")
    
    If ws Is Nothing Then
        Application.ScreenUpdating = False
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = nombreHoja
        
        For i = 0 To UBound(cols)
            ws.Cells(1, i + 1).Value = cols(i)
        Next i
        
        r = UBound(cols) + 1
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(2, r)), , xlYes)
        tbl.Name = nombreTabla
        Application.ScreenUpdating = True
    Else
        On Error Resume Next
        Set tbl = ws.ListObjects(nombreTabla)
        If tbl Is Nothing And ws.ListObjects.Count > 0 Then Set tbl = ws.ListObjects(1)
        On Error GoTo 0
        
        If Not tbl Is Nothing Then
            Application.ScreenUpdating = False
            
            ' Verificar si faltan columnas de la definición canónica
            colFaltante = False
            For i = 0 To UBound(cols)
                If ObtenerIndiceColumna(tbl, Trim(cols(i))) = 0 Then
                    colFaltante = True
                    Exit For
                End If
            Next i
            
            If colFaltante Then
                ' Reestructurar encabezados de la tabla de forma limpia
                tbl.Unlist
                ws.Cells.Clear
                
                For i = 0 To UBound(cols)
                    ws.Cells(1, i + 1).Value = cols(i)
                Next i
                
                r = UBound(cols) + 1
                Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(2, r)), , xlYes)
                tbl.Name = nombreTabla
            End If
            
            Application.ScreenUpdating = True
        End If
    End If
    
    If Not tbl Is Nothing Then OcultarColumnasTecnicas tbl
    
    ws.Visible = xlSheetVisible
    ws.Select
End Sub

Private Sub OcultarColumnasTecnicas(tbl As ListObject)
    On Error Resume Next
    Dim col As ListColumn
    For Each col In tbl.ListColumns
        Select Case UCase(Trim(col.Name))
            Case "UUID", "FECHA_CREACION", "CREADO_POR", "EDITADO_POR"
                col.Range.EntireColumn.Hidden = True
        End Select
    Next col
    On Error GoTo 0
End Sub

Public Sub AlternarColumnasAuditoriaRibbon(control As IRibbonControl)
    AlternarColumnasAuditoria
End Sub

Public Sub AlternarColumnasAuditoria()
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim col As ListColumn
    Dim estadoActualOculto As Boolean
    
    Set ws = ActiveSheet
    If ws.ListObjects.Count = 0 Then
        MsgBox "No hay una tabla de ingenieria activa en esta hoja.", vbExclamation, "Auditoria LukeApp"
        Exit Sub
    End If
    
    Set tbl = ws.ListObjects(1)
    
    On Error Resume Next
    estadoActualOculto = tbl.ListColumns("UUID").Range.EntireColumn.Hidden
    On Error GoTo 0
    
    Application.ScreenUpdating = False
    For Each col In tbl.ListColumns
        Select Case UCase(Trim(col.Name))
            Case "UUID", "FECHA_CREACION", "CREADO_POR", "EDITADO_POR"
                col.Range.EntireColumn.Hidden = Not estadoActualOculto
        End Select
    Next col
    Application.ScreenUpdating = True
    
    If estadoActualOculto Then
        MsgBox "Columnas de Auditoria y Trazabilidad VISIBLES:" & vbCrLf & vbCrLf & _
               "- [UUID] : Identificador inmutable" & vbCrLf & _
               "- [FECHA_CREACION] : Fecha de registro en faena" & vbCrLf & _
               "- [CREADO_POR] : Responsable de creacion" & vbCrLf & _
               "- [EDITADO_POR] : Ultimo usuario que modifico", _
               vbInformation, "Auditoria LukeApp"
    Else
        MsgBox "Columnas de Auditoria OCULTADAS para mantener la vista limpia de faena.", vbInformation, "Auditoria LukeApp"
    End If
End Sub

' ------------------------------------------------------------------------------
' HOJA TECNICA _SISTEMA
' ------------------------------------------------------------------------------
Private Function ObtenerTablaSistema() As ListObject
    Dim ws As Worksheet
    Dim tbl As ListObject
    
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("_SISTEMA")
    On Error GoTo 0
    
    If ws Is Nothing Then
        Application.ScreenUpdating = False
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = "_SISTEMA"
        
        ws.Range("A1").Value = "PERSONAL_ID"
        ws.Range("B1").Value = "USUARIO_WINDOWS"
        ws.Range("C1").Value = "PROYECTO_UUID"
        ws.Range("D1").Value = "PROYECTO_CODIGO"
        ws.Range("E1").Value = "PROYECTO_NOMBRE"
        ws.Range("F1").Value = "PROYECTO_ESTADO"
        ws.Range("G1").Value = "CENTRO_COSTO"
        ws.Range("H1").Value = "ULTIMA_SYNC"
        ws.Range("I1").Value = "VERSION_PLANTILLA"
        
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range("A1:I2"), , xlYes)
        tbl.Name = "tbl_sistema"
        ws.Visible = xlSheetVeryHidden
        Application.ScreenUpdating = True
    Else
        On Error Resume Next
        Set tbl = ws.ListObjects("tbl_sistema")
        If tbl Is Nothing Then Set tbl = ws.ListObjects("tbl_config")
        If tbl Is Nothing And ws.ListObjects.Count > 0 Then Set tbl = ws.ListObjects(1)
        On Error GoTo 0
    End If
    
    Set ObtenerTablaSistema = tbl
End Function

Public Sub OcultarHojaSistema()
    On Error Resume Next
    ThisWorkbook.Sheets("_SISTEMA").Visible = xlSheetVeryHidden
    MsgBox "Hoja _SISTEMA ocultada en modo xlSheetVeryHidden.", vbInformation, "LukeApp"
End Sub

Public Sub MostrarHojaSistema()
    On Error Resume Next
    ThisWorkbook.Sheets("_SISTEMA").Visible = xlSheetVisible
    ThisWorkbook.Sheets("_SISTEMA").Select
    MsgBox "Hoja _SISTEMA visible para inspeccion tecnica.", vbInformation, "LukeApp"
End Sub

Public Sub GuardarEnSistema(ByVal columnaParametro As String, ByVal valor As String)
    Dim tbl As ListObject
    Dim colIdx As Long
    
    Set tbl = ObtenerTablaSistema()
    If tbl Is Nothing Then Exit Sub
    
    colIdx = ObtenerIndiceColumna(tbl, columnaParametro)
    
    If colIdx = 0 Then
        tbl.ListColumns.Add.Name = columnaParametro
        colIdx = tbl.ListColumns.Count
    End If
    
    If tbl.ListRows.Count = 0 Then
        tbl.ListRows.Add
    End If
    
    tbl.DataBodyRange(1, colIdx).Value = valor
End Sub

Public Function LeerDeSistema(ByVal columnaParametro As String) As String
    Dim tbl As ListObject
    Dim colIdx As Long
    
    Set tbl = ObtenerTablaSistema()
    If tbl Is Nothing Then Exit Function
    
    colIdx = ObtenerIndiceColumna(tbl, columnaParametro)
    If colIdx = 0 Or tbl.ListRows.Count = 0 Then Exit Function
    
    LeerDeSistema = Trim(CStr(tbl.DataBodyRange(1, colIdx).Value))
End Function

' ==============================================================================
' SECCION 4: AUTENTICACION Y CARGA DE DATOS
' ==============================================================================

Private Function AsegurarTokenValido(ByVal usuarioWindows As String) As Boolean
    Dim http As Object
    Dim pinIngresado As String
    Dim jsonResp As String
    
    If Len(m_JwtToken) > 20 Then
        AsegurarTokenValido = True
        Exit Function
    End If
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/auth/request-otp", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send "{""usuario_windows"": """ & EscaparJson(usuarioWindows) & """}"
    
    If http.Status <> 200 Then
        MsgBox "No fue posible solicitar el PIN de seguridad:" & vbCrLf & vbCrLf & http.responseText & vbCrLf & vbCrLf & _
               "Verifica que tu usuario este registrado en el sistema.", vbCritical, "Error de Autenticacion"
        AsegurarTokenValido = False
        Set http = Nothing
        Exit Function
    End If
    
    pinIngresado = InputBox( _
        "Se ha enviado un codigo PIN de 6 digitos a tu WhatsApp registrado." & vbCrLf & vbCrLf & _
        "Usuario: " & usuarioWindows & vbCrLf & vbCrLf & _
        "Ingresa el PIN para validar tu identidad:", _
        "LukeApp Seguridad - Autenticacion OTP")
    
    pinIngresado = Trim(pinIngresado)
    If pinIngresado = "" Then
        AsegurarTokenValido = False
        Set http = Nothing
        Exit Function
    End If
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/auth/verify-otp", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send "{""usuario_windows"": """ & EscaparJson(usuarioWindows) & """, ""otp"": """ & EscaparJson(pinIngresado) & """}"
    
    If http.Status = 200 Then
        jsonResp = http.responseText
        m_JwtToken = ExtraerValorJson(jsonResp, "token")
        
        If m_JwtToken <> "" Then
            AsegurarTokenValido = True
        Else
            MsgBox "No se pudo obtener el token de sesion de la respuesta.", vbCritical, "Error de Autenticacion"
            AsegurarTokenValido = False
        End If
    Else
        MsgBox "El PIN ingresado es invalido o ya expiro (" & http.Status & "):" & vbCrLf & vbCrLf & http.responseText, vbCritical, "PIN Invalido"
        AsegurarTokenValido = False
    End If
    
    Set http = Nothing
End Function

Private Function ConstruirPayloadV1(ByVal idProyecto As String, ByVal usuarioWindows As String, ByRef totalOut As Long) As String
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim colUuid As Long, colJunta As Long, colTag As Long, colEstado As Long
    Dim i As Long
    Dim vUuid As String, vJunta As String, vTag As String, vEstado As String
    Dim jsonItems As String
    
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("LIST_JUNTAS")
    Set tbl = ws.ListObjects("tbl_juntas")
    On Error GoTo 0
    
    If tbl Is Nothing Then
        MsgBox "No se encontro la tabla tbl_juntas en la hoja LIST_JUNTAS.", vbCritical, "Error de Datos"
        Exit Function
    End If
    
    colUuid = ObtenerIndiceColumna(tbl, "UUID")
    colJunta = ObtenerIndiceColumna(tbl, "ID_JUNTA")
    colTag = ObtenerIndiceColumna(tbl, "TAG")
    colEstado = ObtenerIndiceColumna(tbl, "ESTADO")
    
    If colJunta = 0 Or colTag = 0 Or colEstado = 0 Then
        MsgBox "La tabla tbl_juntas debe contener al menos las columnas ID_JUNTA, TAG y ESTADO.", vbCritical, "Error de Estructura"
        Exit Function
    End If
    
    totalOut = 0
    jsonItems = ""
    
    For i = 1 To tbl.ListRows.Count
        vJunta = Trim(CStr(tbl.DataBodyRange(i, colJunta).Value))
        vTag = Trim(CStr(tbl.DataBodyRange(i, colTag).Value))
        vEstado = Trim(CStr(tbl.DataBodyRange(i, colEstado).Value))
        
        If colUuid > 0 Then
            vUuid = Trim(CStr(tbl.DataBodyRange(i, colUuid).Value))
        Else
            vUuid = ""
        End If
        
        If vJunta <> "" Then
            If vEstado = "" Then vEstado = "ACTIVO"
            If vTag = "" Then vTag = "TAG-" & vJunta
            
            If vUuid = "" And Left(vJunta, 4) = "550e" Then
                vUuid = vJunta
            End If
            
            If totalOut > 0 Then jsonItems = jsonItems & ","
            
            jsonItems = jsonItems & "{"
            If vUuid <> "" Then
                jsonItems = jsonItems & """uuid"":""" & EscaparJson(vUuid) & ""","
            End If
            jsonItems = jsonItems & _
                """id_junta"":""" & EscaparJson(vJunta) & """," & _
                """tag"":""" & EscaparJson(vTag) & """," & _
                """estado"":""" & EscaparJson(vEstado) & """," & _
                """vigente"":true" & _
            "}"
            
            totalOut = totalOut + 1
        End If
    Next i
    
    ConstruirPayloadV1 = "{" & _
        """id_proyecto"": """ & EscaparJson(idProyecto) & """," & _
        """usuario_windows"": """ & EscaparJson(usuarioWindows) & """," & _
        """registros"": [" & jsonItems & "]" & _
    "}"
End Function

Private Sub ActualizarUuidsEnTabla(ByVal respuestaJson As String)
    Dim tbl As ListObject
    Dim colUuid As Long, colJunta As Long, colFecha As Long
    Dim i As Long, posReg As Long, posItem As Long, posFin As Long
    Dim idJunta As String, uuidValor As String
    Dim fechaActual As String
    Dim dictUuids As Object
    
    Set dictUuids = CreateObject("Scripting.Dictionary")
    fechaActual = Format(Now, "yyyy-mm-dd hh:nn:ss")
    
    posReg = InStr(1, respuestaJson, """registros""", vbTextCompare)
    If posReg > 0 Then posReg = InStr(posReg, respuestaJson, "[")
    
    If posReg > 0 Then
        posItem = InStr(posReg, respuestaJson, "{")
        Do While posItem > 0
            posFin = InStr(posItem, respuestaJson, "}")
            If posFin = 0 Then Exit Do
            
            idJunta = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "id_junta")
            uuidValor = ExtraerValorJson(Mid(respuestaJson, posItem, posFin - posItem + 1), "uuid")
            
            If idJunta <> "" And uuidValor <> "" Then
                dictUuids(idJunta) = uuidValor
            End If
            
            posItem = InStr(posFin, respuestaJson, "{")
        Loop
    End If
    
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("LIST_JUNTAS").ListObjects("tbl_juntas")
    On Error GoTo 0
    If tbl Is Nothing Then Exit Sub
    
    colUuid = ObtenerIndiceColumna(tbl, "UUID")
    colJunta = ObtenerIndiceColumna(tbl, "ID_JUNTA")
    colFecha = ObtenerIndiceColumna(tbl, "FECHA_SYNC")
    
    If colJunta = 0 Then Exit Sub
    
    Application.ScreenUpdating = False
    For i = 1 To tbl.ListRows.Count
        idJunta = Trim(CStr(tbl.DataBodyRange(i, colJunta).Value))
        If dictUuids.Exists(idJunta) Then
            If colUuid > 0 Then tbl.DataBodyRange(i, colUuid).Value = dictUuids(idJunta)
            If colFecha > 0 Then tbl.DataBodyRange(i, colFecha).Value = fechaActual
        End If
    Next i
    Application.ScreenUpdating = True
End Sub

Private Function FusionarJuntasEnTabla(ByVal respuestaJson As String) As Long
    Dim tbl As ListObject
    Dim colUuid As Long, colJunta As Long, colTag As Long, colEstado As Long, colFecha As Long
    Dim colCreacion As Long, colCreadoPor As Long, colEditadoPor As Long
    Dim i As Long, posReg As Long, posItem As Long, posFin As Long
    Dim totalProcesadas As Long
    Dim dictFilas As Object
    Dim idJunta As String, uuidVal As String, tagVal As String, estVal As String, fechaVal As String
    Dim fCreacion As String, cPor As String, ePor As String
    Dim fechaActual As String
    Dim nuevaFila As ListRow
    
    Set dictFilas = CreateObject("Scripting.Dictionary")
    fechaActual = Format(Now, "yyyy-mm-dd hh:nn:ss")
    
    NavegarOCrearHoja "LIST_JUNTAS", "tbl_juntas", "UUID,ID_JUNTA,TAG,ESTADO,FECHA_CREACION,CREADO_POR,FECHA_SYNC,EDITADO_POR"
    
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("LIST_JUNTAS").ListObjects("tbl_juntas")
    On Error GoTo 0
    If tbl Is Nothing Then Exit Function
    
    colUuid = ObtenerIndiceColumna(tbl, "UUID")
    colJunta = ObtenerIndiceColumna(tbl, "ID_JUNTA")
    colTag = ObtenerIndiceColumna(tbl, "TAG")
    colEstado = ObtenerIndiceColumna(tbl, "ESTADO")
    colFecha = ObtenerIndiceColumna(tbl, "FECHA_SYNC")
    colCreacion = ObtenerIndiceColumna(tbl, "FECHA_CREACION")
    colCreadoPor = ObtenerIndiceColumna(tbl, "CREADO_POR")
    colEditadoPor = ObtenerIndiceColumna(tbl, "EDITADO_POR")
    
    If colJunta = 0 Then Exit Function
    
    For i = 1 To tbl.ListRows.Count
        idJunta = UCase(Trim(CStr(tbl.DataBodyRange(i, colJunta).Value)))
        If idJunta <> "" And Not dictFilas.Exists(idJunta) Then
            dictFilas.Add idJunta, i
        End If
    Next i
    
    totalProcesadas = 0
    posReg = InStr(1, respuestaJson, """registros""", vbTextCompare)
    If posReg > 0 Then posReg = InStr(posReg, respuestaJson, "[")
    
    Application.ScreenUpdating = False
    
    If posReg > 0 Then
        posItem = InStr(posReg, respuestaJson, "{")
        Do While posItem > 0
            posFin = InStr(posItem, respuestaJson, "}")
            If posFin = 0 Then Exit Do
            
            Dim bloque As String
            bloque = Mid(respuestaJson, posItem, posFin - posItem + 1)
            
            idJunta = ExtraerValorJson(bloque, "id_junta")
            uuidVal = ExtraerValorJson(bloque, "uuid")
            tagVal = ExtraerValorJson(bloque, "tag")
            estVal = ExtraerValorJson(bloque, "estado")
            fechaVal = LimpiarFechaChile(ExtraerValorJson(bloque, "fecha_sync"))
            fCreacion = LimpiarFechaChile(ExtraerValorJson(bloque, "created_at"))
            cPor = ExtraerValorJson(bloque, "creado_por")
            ePor = ExtraerValorJson(bloque, "editado_por")
            
            If fechaVal = "" Then fechaVal = fechaActual
            If fCreacion = "" Then fCreacion = fechaActual
            If cPor = "" Then cPor = "Sistema"
            If ePor = "" Then ePor = "Sistema"
            
            If idJunta <> "" Then
                Dim idClave As String
                idClave = UCase(Trim(idJunta))
                
                If dictFilas.Exists(idClave) Then
                    Dim filaNum As Long
                    filaNum = dictFilas(idClave)
                    If colUuid > 0 Then tbl.DataBodyRange(filaNum, colUuid).Value = uuidVal
                    If colTag > 0 Then tbl.DataBodyRange(filaNum, colTag).Value = tagVal
                    If colEstado > 0 Then tbl.DataBodyRange(filaNum, colEstado).Value = estVal
                    If colFecha > 0 Then tbl.DataBodyRange(filaNum, colFecha).Value = fechaVal
                    If colCreacion > 0 Then tbl.DataBodyRange(filaNum, colCreacion).Value = fCreacion
                    If colCreadoPor > 0 Then tbl.DataBodyRange(filaNum, colCreadoPor).Value = cPor
                    If colEditadoPor > 0 Then tbl.DataBodyRange(filaNum, colEditadoPor).Value = ePor
                Else
                    Set nuevaFila = tbl.ListRows.Add
                    Dim nRow As Long
                    nRow = nuevaFila.Index
                    
                    tbl.DataBodyRange(nRow, colJunta).Value = idJunta
                    If colUuid > 0 Then tbl.DataBodyRange(nRow, colUuid).Value = uuidVal
                    If colTag > 0 Then tbl.DataBodyRange(nRow, colTag).Value = tagVal
                    If colEstado > 0 Then tbl.DataBodyRange(nRow, colEstado).Value = estVal
                    If colFecha > 0 Then tbl.DataBodyRange(nRow, colFecha).Value = fechaVal
                    If colCreacion > 0 Then tbl.DataBodyRange(nRow, colCreacion).Value = fCreacion
                    If colCreadoPor > 0 Then tbl.DataBodyRange(nRow, colCreadoPor).Value = cPor
                    If colEditadoPor > 0 Then tbl.DataBodyRange(nRow, colEditadoPor).Value = ePor
                    
                    dictFilas.Add idClave, nRow
                End If
                
                totalProcesadas = totalProcesadas + 1
            End If
            
            posItem = InStr(posFin, respuestaJson, "{")
        Loop
    End If
    
    Application.ScreenUpdating = True
    FusionarJuntasEnTabla = totalProcesadas
    Set dictFilas = Nothing
End Function

' ==============================================================================
' SECCION 5: FUNCIONES AUXILIARES
' ==============================================================================

Private Function ObtenerUsuarioWindowsCompleto() As String
    Dim dominio As String
    Dim usuario As String
    
    dominio = Trim(Environ("USERDOMAIN"))
    usuario = Trim(Environ("USERNAME"))
    
    If dominio <> "" Then
        ObtenerUsuarioWindowsCompleto = dominio & "\" & usuario
    Else
        ObtenerUsuarioWindowsCompleto = usuario
    End If
End Function

Private Function ObtenerIndiceColumna(tbl As ListObject, nombreCol As String) As Long
    Dim c As Long
    For c = 1 To tbl.ListColumns.Count
        If UCase(Trim(tbl.ListColumns(c).Name)) = UCase(Trim(nombreCol)) Then
            ObtenerIndiceColumna = c
            Exit Function
        End If
    Next c
    ObtenerIndiceColumna = 0
End Function

Private Function EscaparJson(ByVal texto As String) As String
    texto = Replace(texto, "\", "\\")
    texto = Replace(texto, """", "\""")
    texto = Replace(texto, vbCr, "\r")
    texto = Replace(texto, vbLf, "\n")
    texto = Replace(texto, vbTab, "\t")
    EscaparJson = texto
End Function

Private Function ExtraerValorJson(ByVal json As String, ByVal clave As String) As String
    Dim regex As Object
    Dim coincidencias As Object
    Dim valExtraido As String
    
    Set regex = CreateObject("VBScript.RegExp")
    regex.Global = False
    regex.IgnoreCase = True
    
    ' Soporta strings con comillas escapadas: "clave": "valor \"con comillas\""
    regex.Pattern = """" & clave & """\s*:\s*""((?:\\.|[^""\\])*)"""
    
    If regex.Test(json) Then
        Set coincidencias = regex.Execute(json)
        valExtraido = coincidencias(0).SubMatches(0)
        valExtraido = Replace(valExtraido, "\""", """")
        valExtraido = Replace(valExtraido, "\\", "\")
        valExtraido = Replace(valExtraido, "\/", "/")
        valExtraido = Replace(valExtraido, "\n", " ")
        valExtraido = Replace(valExtraido, "\r", "")
        ExtraerValorJson = Trim(valExtraido)
    Else
        ' Soporta números o booleanos: "metros": 194.35 o "vigente": true
        regex.Pattern = """" & clave & """\s*:\s*([0-9.-]+|true|false)"
        If regex.Test(json) Then
            Set coincidencias = regex.Execute(json)
            ExtraerValorJson = Trim(coincidencias(0).SubMatches(0))
        Else
            ExtraerValorJson = ""
        End If
    End If
    
    Set regex = Nothing
End Function

Private Function LimpiarFechaChile(ByVal f As String) As String
    If f = "" Then
        LimpiarFechaChile = Format(Now, "yyyy-mm-dd hh:nn:ss")
        Exit Function
    End If
    
    f = Replace(f, "T", " ")
    If InStr(f, ".") > 0 Then f = Left(f, InStr(f, ".") - 1)
    If InStr(f, "Z") > 0 Then f = Replace(f, "Z", "")
    LimpiarFechaChile = Trim(f)
End Function
