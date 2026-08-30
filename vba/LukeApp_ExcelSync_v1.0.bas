' ==============================================================================
' LUKEAPP EXCEL SYNC v1.0 - MODULO OFICIAL UNIFICADO PIPING
' Sincronizacion Bidireccional (Publicar Juntas Push / Actualizar Planilla Pull)
' Version limpia ASCII (Sin acentos ni caracteres especiales)
' ==============================================================================
Option Explicit

Private Const API_BASE_URL As String = "https://app.lukeapp.cl"
Private Const VERSION_PLANTILLA As String = "1.0"

' Token volatil en memoria (destruido automaticamente al cerrar Excel)
Private m_JwtToken As String

' ==============================================================================
' SECCION 1: CALLBACKS DEL RIBBON XML (UI DE EXCEL)
' ==============================================================================

Public Sub SolicitarAccesoRibbon(control As IRibbonControl)
    SolicitarAcceso
End Sub

Public Sub IniciarSesionRibbon(control As IRibbonControl)
    IniciarSesion
End Sub

Public Sub CerrarSesionLukeAppRibbon(control As IRibbonControl)
    CerrarSesion
End Sub

Public Sub PublicarListaJuntasRibbon(control As IRibbonControl)
    PublicarListaJuntas
End Sub

Public Sub ActualizarDesdeNubeRibbon(control As IRibbonControl)
    ActualizarPlanillaDesdeNube
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

Public Sub VerProyectoRibbon(control As IRibbonControl)
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

Public Sub AcercaDeLukeAppRibbon(control As IRibbonControl)
    MsgBox "LukeApp Excel Client - Piping Management" & vbCrLf & _
           "Version: " & VERSION_PLANTILLA & vbCrLf & _
           "Gobierno de Proyectos: Centralizado via Luke Core" & vbCrLf & _
           "API: " & API_BASE_URL & vbCrLf & _
           "Seguridad: JWT 4 Horas (Memoria Volatil)", _
           vbInformation, "Acerca de LukeApp"
End Sub

' ==============================================================================
' SECCION 2: MACROS PRINCIPALES (ACCESIBLES DIRECTAMENTE O POR RIBBON)
' ==============================================================================

' ------------------------------------------------------------------------------
' 1. SOLICITAR ACCESO (Onboarding Zero-Touch via WhatsApp Admin)
' ------------------------------------------------------------------------------
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
               "En cuanto tu acceso sea aprobado, recibiras un mensaje en WhatsApp (" & telefono & ") para que puedas iniciar sesion.", _
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

' ------------------------------------------------------------------------------
' 2. INICIAR SESION (Solicita OTP, precarga JWT 4h y resuelve proyectos)
' ------------------------------------------------------------------------------
Public Sub IniciarSesion()
    Dim usuarioWindows As String
    
    On Error GoTo ManejoError
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    m_JwtToken = ""
    
    If AsegurarTokenValido(usuarioWindows) Then
        ' Resolver proyectos autorizados automáticamente desde Luke Core
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

' ------------------------------------------------------------------------------
' 3. CERRAR SESION (Destruye JWT en memoria)
' ------------------------------------------------------------------------------
Public Sub CerrarSesion()
    m_JwtToken = ""
    MsgBox "Tu sesion ha sido cerrada correctamente." & vbCrLf & _
           "El token en memoria fue eliminado.", vbInformation, "LukeApp Seguridad"
End Sub

' ------------------------------------------------------------------------------
' 4. PUBLICAR LISTA DE JUNTAS A LUKEAPP (Push: Upsert en piping.lista_juntas)
' ------------------------------------------------------------------------------
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
    
    ' 1. Obtener usuario de Windows
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    ' 2. Asegurar Token JWT valido (4 horas)
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    ' 3. Asegurar que haya un proyecto activo seleccionado exclusivamente desde _SISTEMA
    idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    If idProyecto = "" Then
        If Not ActualizarProyectosAutorizados(False) Then Exit Sub
        idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    End If
    
    If idProyecto = "" Then
        MsgBox "No hay ningun proyecto asignado a tu usuario para sincronizar.", vbCritical, "Error de Autorizacion"
        Exit Sub
    End If
    
    ' 4. Construir Payload JSON desde tbl_juntas
    jsonPayload = ConstruirPayloadV1(idProyecto, usuarioWindows, totalFilas)
    If totalFilas = 0 Then
        MsgBox "No se encontraron juntas con 'ID_JUNTA' en la tabla 'tbl_juntas'.", vbExclamation, "LukeApp Sync"
        Exit Sub
    End If
    
    Application.StatusBar = "Sincronizando " & totalFilas & " juntas en proyecto " & idProyecto & "..."
    
    ' 5. Enviar Peticion HTTP a Luke Core API
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/piping/lista-juntas", False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonPayload
    
    ' 6. Procesar Respuesta del Servidor
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

' ------------------------------------------------------------------------------
' 5. ACTUALIZAR PLANILLA DESDE NUBE (Pull: Descarga lista maestra de piping)
' ------------------------------------------------------------------------------
Public Sub ActualizarPlanillaDesdeNube()
    Dim usuarioWindows As String
    Dim idProyecto As String
    Dim http As Object
    Dim respuestaJson As String
    Dim totalJuntas As Long
    
    On Error GoTo ManejoError
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    If Not AsegurarTokenValido(usuarioWindows) Then Exit Sub
    
    idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    If idProyecto = "" Then
        If Not ActualizarProyectosAutorizados(False) Then Exit Sub
        idProyecto = LeerDeSistema("PROYECTO_CODIGO")
    End If
    
    Application.StatusBar = "Descargando lista maestra de juntas desde Luke Core..."
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "GET", API_BASE_URL & "/api/piping/lista-juntas?id_proyecto=" & EscaparJson(idProyecto), False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.send
    
    Application.StatusBar = False
    
    If http.Status = 200 Then
        respuestaJson = http.responseText
        totalJuntas = FusionarJuntasEnTabla(respuestaJson)
        
        GuardarEnSistema "ULTIMA_SYNC", Format(Now, "yyyy-mm-dd hh:nn:ss")
        
        MsgBox "Planilla Sincronizada con Exito desde la Nube:" & vbCrLf & vbCrLf & _
               "- Proyecto: " & idProyecto & " (" & LeerDeSistema("PROYECTO_NOMBRE") & ")" & vbCrLf & _
               "- Juntas Sincronizadas: " & totalJuntas & vbCrLf & _
               "- Estado: Planilla actualizada con la ultima verdad de faena.", _
               vbInformation, "Actualizar Planilla - LukeApp"
    Else
        MsgBox "No fue posible descargar las juntas (" & http.Status & "):" & vbCrLf & http.responseText, vbCritical, "Error al Actualizar Planilla"
    End If
    
    Set http = Nothing
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrio un error al actualizar la planilla:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

' ==============================================================================
' SECCION 3: RESOLUCION CENTRALIZADA DE PROYECTOS Y GESTION DE _SISTEMA
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
    
    ' Parsear proyectos del array JSON
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
    
    ' CASO 1: Solo 1 proyecto asignado -> Auto-seleccion silenciosa
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
    
    ' CASO 2: Multiples proyectos
    ' Si ya tiene uno seleccionado y no forzamos seleccion, verificar que siga valido
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
    
    ' Desplegar selector de proyectos
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

' ------------------------------------------------------------------------------
' HOJA TECNICA _SISTEMA (Estructura Horizontal por Columnas)
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
' SECCION 4: AUTENTICACION Y CONSTRUCTORES INTERNOS
' ==============================================================================

Private Function AsegurarTokenValido(ByVal usuarioWindows As String) As Boolean
    Dim http As Object
    Dim pinIngresado As String
    Dim jsonResp As String
    
    If Len(m_JwtToken) > 20 Then
        AsegurarTokenValido = True
        Exit Function
    End If
    
    ' PASO 1: Solicitar OTP a Luke Core
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/auth/request-otp", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send "{""usuario_windows"": """ & EscaparJson(usuarioWindows) & """}"
    
    If http.Status <> 200 Then
        MsgBox "No fue posible solicitar el PIN de seguridad:" & vbCrLf & vbCrLf & http.responseText & vbCrLf & vbCrLf & _
               "Si eres un usuario nuevo, haz clic en 'Solicitar Acceso' en el Ribbon.", vbCritical, "Error Autenticacion"
        Set http = Nothing
        Exit Function
    End If
    
    ' PASO 2: Solicitar PIN al usuario mediante InputBox
    pinIngresado = InputBox( _
        "Se ha enviado un codigo de acceso de 6 digitos a tu WhatsApp registrado." & vbCrLf & vbCrLf & _
        "Usuario: " & usuarioWindows & vbCrLf & _
        "Vigencia: 5 minutos" & vbCrLf & vbCrLf & _
        "Ingresa el codigo PIN recibido:", _
        "LukeApp - Verificacion de Acceso OTP")
        
    pinIngresado = Trim(pinIngresado)
    If pinIngresado = "" Then
        Set http = Nothing
        Exit Function
    End If
    
    If Len(pinIngresado) <> 6 Or Not IsNumeric(pinIngresado) Then
        MsgBox "El PIN debe contener exactamente 6 digitos numericos.", vbExclamation, "PIN Invalido"
        Set http = Nothing
        Exit Function
    End If
    
    ' PASO 3: Verificar PIN y obtener JWT (4 horas)
    http.Open "POST", API_BASE_URL & "/api/auth/verify-otp", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send "{""usuario_windows"": """ & EscaparJson(usuarioWindows) & """, ""otp"": """ & pinIngresado & """}"
    
    If http.Status = 200 Then
        jsonResp = http.responseText
        m_JwtToken = ExtraerValorJson(jsonResp, "token")
        
        If Len(m_JwtToken) <= 20 Then
            MsgBox "Luke Core respondio, pero no entrego un token valido." & vbCrLf & vbCrLf & jsonResp, vbCritical, "Respuesta Invalida"
            m_JwtToken = ""
            AsegurarTokenValido = False
        Else
            AsegurarTokenValido = True
        End If
    Else
        MsgBox "Codigo PIN incorrecto o expirado:" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Validacion Fallida"
        AsegurarTokenValido = False
    End If
    
    Set http = Nothing
End Function

Private Function ConstruirPayloadV1(ByVal idProyecto As String, ByVal usuarioWindows As String, ByRef totalOut As Long) As String
    Dim tbl As ListObject
    Dim i As Long
    Dim jsonItems As String
    Dim colUuid As Long, colJunta As Long, colTag As Long, colEstado As Long
    Dim vUuid As String, vJunta As String, vTag As String, vEstado As String
    
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("LIST_JUNTAS").ListObjects("tbl_juntas")
    On Error GoTo 0
    
    If tbl Is Nothing Then
        MsgBox "No se encontro la tabla 'tbl_juntas' en la hoja 'LIST_JUNTAS'.", vbCritical, "Error de Estructura"
        totalOut = 0
        Exit Function
    End If
    
    colUuid = ObtenerIndiceColumna(tbl, "UUID")
    colJunta = ObtenerIndiceColumna(tbl, "ID_JUNTA")
    colTag = ObtenerIndiceColumna(tbl, "TAG")
    colEstado = ObtenerIndiceColumna(tbl, "ESTADO")
    
    If colJunta = 0 Then
        MsgBox "La columna 'ID_JUNTA' no existe en 'tbl_juntas'.", vbCritical, "Error de Estructura"
        Exit Function
    End If
    
    totalOut = 0
    For i = 1 To tbl.ListRows.Count
        vJunta = Trim(CStr(tbl.DataBodyRange(i, colJunta).Value))
        
        If vJunta <> "" Then
            vUuid = ""
            If colUuid > 0 Then vUuid = Trim(CStr(tbl.DataBodyRange(i, colUuid).Value))
            
            vTag = ""
            If colTag > 0 Then vTag = Trim(CStr(tbl.DataBodyRange(i, colTag).Value))
            
            vEstado = "ACTIVO"
            If colEstado > 0 Then
                vEstado = Trim(CStr(tbl.DataBodyRange(i, colEstado).Value))
                If vEstado = "" Then vEstado = "ACTIVO"
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
    If posReg > 0 Then
        posReg = InStr(posReg, respuestaJson, "[")
    End If
    
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

' ------------------------------------------------------------------------------
' FUSIONAR LISTA MAESTRA DESDE LA NUBE EN tbl_juntas (PULL COMPLETO)
' ------------------------------------------------------------------------------
Private Function FusionarJuntasEnTabla(ByVal respuestaJson As String) As Long
    Dim tbl As ListObject
    Dim colUuid As Long, colJunta As Long, colTag As Long, colEstado As Long, colFecha As Long
    Dim i As Long, posReg As Long, posItem As Long, posFin As Long
    Dim idJunta As String, uuidVal As String, tagVal As String, estVal As String, fechaVal As String
    Dim dictFilas As Object
    Dim totalProcesadas As Long
    Dim nuevaFila As ListRow
    Dim fechaActual As String
    
    Set dictFilas = CreateObject("Scripting.Dictionary")
    fechaActual = Format(Now, "yyyy-mm-dd hh:nn:ss")
    
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("LIST_JUNTAS").ListObjects("tbl_juntas")
    On Error GoTo 0
    
    If tbl Is Nothing Then
        MsgBox "No se encontro la tabla 'tbl_juntas' en la hoja 'LIST_JUNTAS'.", vbCritical, "Error de Estructura"
        FusionarJuntasEnTabla = 0
        Exit Function
    End If
    
    colUuid = ObtenerIndiceColumna(tbl, "UUID")
    colJunta = ObtenerIndiceColumna(tbl, "ID_JUNTA")
    colTag = ObtenerIndiceColumna(tbl, "TAG")
    colEstado = ObtenerIndiceColumna(tbl, "ESTADO")
    colFecha = ObtenerIndiceColumna(tbl, "FECHA_SYNC")
    
    If colJunta = 0 Then
        MsgBox "La columna 'ID_JUNTA' no existe en 'tbl_juntas'.", vbCritical, "Error de Estructura"
        FusionarJuntasEnTabla = 0
        Exit Function
    End If
    
    ' Indexar filas existentes por ID_JUNTA
    For i = 1 To tbl.ListRows.Count
        idJunta = UCase(Trim(CStr(tbl.DataBodyRange(i, colJunta).Value)))
        If idJunta <> "" And Not dictFilas.Exists(idJunta) Then
            dictFilas.Add idJunta, i
        End If
    Next i
    
    Application.ScreenUpdating = False
    totalProcesadas = 0
    
    posReg = InStr(1, respuestaJson, """registros""", vbTextCompare)
    If posReg > 0 Then posReg = InStr(posReg, respuestaJson, "[")
    
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
            If fechaVal = "" Then fechaVal = fechaActual
            
            If idJunta <> "" Then
                Dim idClave As String
                idClave = UCase(Trim(idJunta))
                
                If dictFilas.Exists(idClave) Then
                    ' Actualizar fila existente
                    Dim filaNum As Long
                    filaNum = dictFilas(idClave)
                    If colUuid > 0 Then tbl.DataBodyRange(filaNum, colUuid).Value = uuidVal
                    If colTag > 0 Then tbl.DataBodyRange(filaNum, colTag).Value = tagVal
                    If colEstado > 0 Then tbl.DataBodyRange(filaNum, colEstado).Value = estVal
                    If colFecha > 0 Then tbl.DataBodyRange(filaNum, colFecha).Value = fechaVal
                Else
                    ' Agregar nueva fila traida desde la nube
                    Set nuevaFila = tbl.ListRows.Add
                    Dim nRow As Long
                    nRow = nuevaFila.Index
                    
                    tbl.DataBodyRange(nRow, colJunta).Value = idJunta
                    If colUuid > 0 Then tbl.DataBodyRange(nRow, colUuid).Value = uuidVal
                    If colTag > 0 Then tbl.DataBodyRange(nRow, colTag).Value = tagVal
                    If colEstado > 0 Then tbl.DataBodyRange(nRow, colEstado).Value = estVal
                    If colFecha > 0 Then tbl.DataBodyRange(nRow, colFecha).Value = fechaVal
                    
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
    
    Set regex = CreateObject("VBScript.RegExp")
    regex.Global = False
    regex.IgnoreCase = True
    regex.Pattern = """" & clave & """\s*:\s*""([^""]+)"""
    
    If regex.Test(json) Then
        Set coincidencias = regex.Execute(json)
        ExtraerValorJson = coincidencias(0).SubMatches(0)
    Else
        ExtraerValorJson = ""
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
