' ==============================================================================
' LUKEAPP EXCEL SYNC v1.0 — MÓDULO UNIFICADO PIPING
' Incluye: Lógica de Sincronización + Callbacks de Ribbon XML + Onboarding WhatsApp
' ==============================================================================
Option Explicit

Private Const API_BASE_URL As String = "https://app.lukeapp.cl"

' Token volátil en memoria (destruido automáticamente al cerrar Excel)
Private m_JwtToken As String

' ==============================================================================
' SECCIÓN 1: CALLBACKS DEL RIBBON XML (UI DE EXCEL)
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
    ThisWorkbook.RefreshAll
    MsgBox "Planilla actualizada desde los orígenes de datos locales.", vbInformation, "LukeApp"
End Sub

Public Sub VerProyectoRibbon(control As IRibbonControl)
    Dim idProy As String, nomProy As String, emp As String, disc As String
    idProy = LeerConfiguracion("ID_PROYECTO")
    nomProy = LeerConfiguracion("NOMBRE_PROYECTO")
    emp = LeerConfiguracion("EMPRESA")
    disc = LeerConfiguracion("DISCIPLINA")
    
    MsgBox "Parámetros del Proyecto Activo:" & vbCrLf & vbCrLf & _
           "• ID Proyecto: " & idProy & vbCrLf & _
           "• Nombre: " & nomProy & vbCrLf & _
           "• Empresa (Tenant): " & emp & vbCrLf & _
           "• Disciplina: " & disc & vbCrLf & vbCrLf & _
           "Usuario Windows: " & ObtenerUsuarioWindowsCompleto(), _
           vbInformation, "Configuración del Proyecto"
End Sub

Public Sub AcercaDeLukeAppRibbon(control As IRibbonControl)
    MsgBox "LukeApp Excel Client — Piping Management" & vbCrLf & _
           "Versión: 1.0 (Zero-Touch WhatsApp Onboarding)" & vbCrLf & _
           "API: " & API_BASE_URL & vbCrLf & _
           "Seguridad: JWT 4 Horas (Volátil en Memoria)", _
           vbInformation, "Acerca de LukeApp"
End Sub

' ==============================================================================
' SECCIÓN 2: MACROS PRINCIPALES (ACCESIBLES DIRECTAMENTE O POR RIBBON)
' ==============================================================================

' ------------------------------------------------------------------------------
' 1. SOLICITAR ACCESO (Onboarding Zero-Touch vía WhatsApp Admin)
' ------------------------------------------------------------------------------
Public Sub SolicitarAcceso()
    Dim usuarioWindows As String
    Dim nombreEquipo As String
    Dim nombre As String
    Dim telefono As String
    Dim tenantSlug As String
    Dim jsonPayload As String
    Dim http As Object
    
    On Error GoTo ManejoError
    
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    nombreEquipo = Trim(Environ("COMPUTERNAME"))
    tenantSlug = LeerConfiguracion("EMPRESA")
    If tenantSlug = "" Then tenantSlug = "dem"
    
    nombre = InputBox( _
        "Ingresa tu Nombre y Apellido para la solicitud de acceso:" & vbCrLf & vbCrLf & _
        "Usuario Windows: " & usuarioWindows, _
        "LukeApp — Solicitar Acceso")
    nombre = Trim(nombre)
    If nombre = "" Then Exit Sub
    
    telefono = InputBox( _
        "Ingresa tu número de WhatsApp con código de país (ejemplo: +56912345678):" & vbCrLf & vbCrLf & _
        "A este número recibirás los códigos PIN y notificaciones de aprobación.", _
        "LukeApp — Teléfono WhatsApp", "+569")
    telefono = Trim(telefono)
    If telefono = "" Or telefono = "+569" Then Exit Sub
    
    Application.StatusBar = "Enviando solicitud de acceso al administrador..."
    
    jsonPayload = "{" & _
        """usuario_windows"": """ & EscaparJson(usuarioWindows) & """," & _
        """telefono"": """ & EscaparJson(telefono) & """," & _
        """nombre"": """ & EscaparJson(nombre) & """," & _
        """equipo"": """ & EscaparJson(nombreEquipo) & """," & _
        """tenant"": """ & EscaparJson(tenantSlug) & """" & _
    "}"
    
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/access/request", False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonPayload
    
    Application.StatusBar = False
    
    If http.Status = 200 Or http.Status = 201 Then
        MsgBox "¡Solicitud Enviada con Éxito!" & vbCrLf & vbCrLf & _
               "Se ha notificado al Administrador vía WhatsApp." & vbCrLf & _
               "En cuanto tu acceso sea aprobado, recibirás un mensaje en WhatsApp (" & telefono & ") para que puedas iniciar sesión.", _
               vbInformation, "LukeApp Onboarding"
    Else
        MsgBox "No se pudo registrar la solicitud (" & http.Status & "):" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Error al Solicitar Acceso"
    End If
    
    Set http = Nothing
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrió un error al solicitar acceso:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

' ------------------------------------------------------------------------------
' 2. INICIAR SESIÓN (Solicita OTP y precarga JWT 4h)
' ------------------------------------------------------------------------------
Public Sub IniciarSesion()
    Dim usuarioWindows As String
    
    On Error GoTo ManejoError
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    m_JwtToken = ""
    
    If AsegurarTokenValido(usuarioWindows) Then
        MsgBox "¡Sesión Iniciada Exitosamente!" & vbCrLf & vbCrLf & _
               "• Usuario: " & usuarioWindows & vbCrLf & _
               "• Vigencia: 4 horas" & vbCrLf & _
               "• Estado: Listo para publicar datos.", _
               vbInformation, "LukeApp Seguridad"
    End If
    Exit Sub

ManejoError:
    MsgBox "Ocurrió un error al iniciar sesión:" & vbCrLf & Err.Description, vbCritical, "Error de Sesión"
End Sub

' ------------------------------------------------------------------------------
' 3. CERRAR SESIÓN (Destruye JWT en memoria)
' ------------------------------------------------------------------------------
Public Sub CerrarSesion()
    m_JwtToken = ""
    MsgBox "Tu sesión ha sido cerrada correctamente." & vbCrLf & _
           "El token en memoria fue eliminado.", vbInformation, "LukeApp Seguridad"
End Sub

' ------------------------------------------------------------------------------
' 4. PUBLICAR LISTA DE JUNTAS A LUKEAPP (Upsert en piping.lista_juntas)
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
    
    ' 1. Obtener usuario de Windows con Dominio
    usuarioWindows = ObtenerUsuarioWindowsCompleto()
    
    ' 2. Leer ID_PROYECTO desde la tabla tbl_config en hoja CONFIG
    idProyecto = LeerConfiguracion("ID_PROYECTO")
    If idProyecto = "" Then
        MsgBox "No se encontró el parámetro 'ID_PROYECTO' en la tabla 'tbl_config' de la hoja CONFIG.", vbCritical, "Error de Configuración"
        Exit Sub
    End If
    
    ' 3. Asegurar Token JWT válido (4 horas) vía WhatsApp OTP
    If Not AsegurarTokenValido(usuarioWindows) Then
        Exit Sub
    End If
    
    ' 4. Construir Payload JSON desde tbl_juntas
    jsonPayload = ConstruirPayloadV1(idProyecto, usuarioWindows, totalFilas)
    If totalFilas = 0 Then
        MsgBox "No se encontraron juntas con 'ID_JUNTA' en la tabla 'tbl_juntas'.", vbExclamation, "LukeApp Sync"
        Exit Sub
    End If
    
    Application.StatusBar = "Sincronizando " & totalFilas & " juntas con Luke Core..."
    
    ' 5. Enviar Petición HTTP a Luke Core API
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", API_BASE_URL & "/api/piping/lista-juntas", False
    http.setRequestHeader "Authorization", "Bearer " & m_JwtToken
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonPayload
    
    ' 6. Procesar Respuesta del Servidor
    If http.Status = 200 Or http.Status = 201 Then
        respuestaJson = http.responseText
        
        ' Escribir los UUIDs y fecha de sincronización de vuelta en la tabla
        ActualizarUuidsEnTabla respuestaJson
        
        Application.StatusBar = False
        MsgBox "Sincronización Exitosa:" & vbCrLf & vbCrLf & _
               "• Proyecto: " & idProyecto & vbCrLf & _
               "• Juntas procesadas: " & totalFilas & vbCrLf & _
               "• Usuario autenticado: " & usuarioWindows & vbCrLf & _
               "• Tiempo: " & Format(Timer - tInicio, "0.00") & " seg", _
               vbInformation, "LukeApp Sync v1.0"
               
    ElseIf http.Status = 401 Then
        m_JwtToken = ""
        Application.StatusBar = False
        MsgBox "La sesión expiró o el token fue rechazado." & vbCrLf & _
               "Presiona nuevamente PUBLICAR para solicitar un PIN nuevo.", _
               vbExclamation, "Sesión Expirada"
    Else
        Application.StatusBar = False
        MsgBox "Error del Servidor (" & http.Status & "):" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Error de Sincronización"
    End If
    
    Set http = Nothing
    Exit Sub

ManejoError:
    Application.StatusBar = False
    MsgBox "Ocurrió un error en la ejecución:" & vbCrLf & Err.Description, vbCritical, "Error VBA"
End Sub

' ==============================================================================
' SECCIÓN 3: AUTENTICACIÓN Y CONSTRUCTORES INTERNOS
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
               "Si eres un usuario nuevo, haz clic en 'Solicitar Acceso' en el Ribbon.", vbCritical, "Error Autenticación"
        Set http = Nothing
        Exit Function
    End If
    
    ' PASO 2: Solicitar PIN al usuario mediante InputBox
    pinIngresado = InputBox( _
        "Se ha enviado un código de acceso de 6 dígitos a tu WhatsApp registrado." & vbCrLf & vbCrLf & _
        "Usuario: " & usuarioWindows & vbCrLf & _
        "Vigencia: 5 minutos" & vbCrLf & vbCrLf & _
        "Ingresa el código PIN recibido:", _
        "LukeApp — Verificación de Acceso OTP")
        
    pinIngresado = Trim(pinIngresado)
    If pinIngresado = "" Then
        Set http = Nothing
        Exit Function
    End If
    
    If Len(pinIngresado) <> 6 Or Not IsNumeric(pinIngresado) Then
        MsgBox "El PIN debe contener exactamente 6 dígitos numéricos.", vbExclamation, "PIN Inválido"
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
            MsgBox "Luke Core respondió, pero no entregó un token válido." & vbCrLf & vbCrLf & jsonResp, vbCritical, "Respuesta Inválida"
            m_JwtToken = ""
            AsegurarTokenValido = False
        Else
            AsegurarTokenValido = True
        End If
    Else
        MsgBox "Código PIN incorrecto o expirado:" & vbCrLf & vbCrLf & http.responseText, vbCritical, "Validación Fallida"
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
        MsgBox "No se encontró la tabla 'tbl_juntas' en la hoja 'LIST_JUNTAS'.", vbCritical, "Error de Estructura"
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

' ==============================================================================
' SECCIÓN 4: FUNCIONES AUXILIARES
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

Private Function LeerConfiguracion(ByVal parametro As String) As String
    Dim tbl As ListObject
    Dim i As Long
    
    On Error Resume Next
    Set tbl = ThisWorkbook.Sheets("CONFIG").ListObjects("tbl_config")
    On Error GoTo 0
    
    If tbl Is Nothing Then Exit Function
    
    For i = 1 To tbl.ListRows.Count
        If UCase(Trim(CStr(tbl.DataBodyRange(i, 1).Value))) = UCase(Trim(parametro)) Then
            LeerConfiguracion = Trim(CStr(tbl.DataBodyRange(i, 2).Value))
            Exit Function
        End If
    Next i
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
