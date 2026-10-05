Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\PROJECT\File-manager-organizer-pc-ai"
oShell.Run Chr(34) & "C:\Python314\pythonw.exe" & Chr(34) & " " & Chr(34) & "D:\PROJECT\File-manager-organizer-pc-ai\desktop_app.py" & Chr(34), 0, False
Set oShell = Nothing
