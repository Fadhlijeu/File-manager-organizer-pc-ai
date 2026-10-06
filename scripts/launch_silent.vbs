Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strProjectDir = fso.GetParentFolderName(strScriptDir)
oShell.CurrentDirectory = strProjectDir
oShell.Run Chr(34) & "C:\Python314\pythonw.exe" & Chr(34) & " " & Chr(34) & strProjectDir & "\main.py" & Chr(34), 0, False
Set oShell = Nothing
