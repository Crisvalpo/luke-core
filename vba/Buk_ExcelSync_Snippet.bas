Attribute VB_Name = "Buk_ExcelSync"
' ==============================================================================
' LUKEAPP BUK MIRROR SYNC - VBA MACRO (PIPING STYLE)
' Sincronizacion directa de planillas de dotacion Buk a Luke Core
' ==============================================================================
Option Explicit

Public Const CORE_MIRROR_URL As String = "https://app.lukeapp.cl/mirror/sync/workers"
Public Const LOCAL_MIRROR_URL As String = "http://localhost:3080/mirror/sync/workers"

Public Sub SincronizarDotacionBuk()
    Dim ws As Worksheet
    Dim lastRow As Long, i As Long
    Dim jsonWorkers As String
    Dim http As Object
    Dim url As String
    Dim responseText As String
    Dim rutVal As String, nameVal As String, titleVal As String
    Dim ccVal As String, areaVal As String, phoneVal As String, statusVal As String

    On Error GoTo ErrHandler

    Set ws = ActiveSheet
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row

    If lastRow < 2 Then
        MsgBox "No se encontraron datos de personal en la hoja activa.", vbExclamation, "LukeApp Buk Sync"
        Exit Sub
    End If

    ' Construir JSON en memoria
    jsonWorkers = "{""workers"":["

    For i = 2 To lastRow
        rutVal = Trim(Replace(ws.Cells(i, 1).Value, """", ""))
        nameVal = Trim(Replace(ws.Cells(i, 2).Value, """", ""))
        titleVal = Trim(Replace(ws.Cells(i, 3).Value, """", ""))
        ccVal = Trim(Replace(ws.Cells(i, 4).Value, """", ""))
        areaVal = Trim(Replace(ws.Cells(i, 5).Value, """", ""))
        phoneVal = Trim(Replace(ws.Cells(i, 6).Value, """", ""))
        statusVal = Trim(Replace(ws.Cells(i, 7).Value, """", ""))

        If Len(statusVal) = 0 Then statusVal = "active"

        If Len(rutVal) > 0 Then
            jsonWorkers = jsonWorkers & "{" & _
                """rut"":""" & rutVal & """," & _
                """full_name"":""" & nameVal & """," & _
                """job_title"":""" & titleVal & """," & _
                """cost_center"":""" & ccVal & """," & _
                """area"":""" & areaVal & """," & _
                """phone"":""" & phoneVal & """," & _
                """status"":""" & statusVal & """" & _
                "},"
        End If
    Next i

    If Right(jsonWorkers, 1) = "," Then
        jsonWorkers = Left(jsonWorkers, Len(jsonWorkers) - 1)
    End If
    jsonWorkers = jsonWorkers & "]}"

    ' Enviar HTTP POST a Luke Core
    url = CORE_MIRROR_URL
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json; charset=UTF-8"
    http.send jsonWorkers

    If http.Status = 200 Then
        MsgBox "Dotacion sincronizada exitosamente con Luke Core." & vbCrLf & vbCrLf & _
               "Respuesta: " & http.responseText, vbInformation, "LukeApp Buk Sync"
    Else
        MsgBox "Error de sincronizacion (HTTP " & http.Status & "):" & vbCrLf & http.responseText, vbCritical, "LukeApp Buk Sync"
    End If

    Exit Sub

ErrHandler:
    MsgBox "Ocurrio un error al sincronizar con Luke Core: " & Err.Description, vbCritical, "LukeApp Buk Sync"
End Sub
