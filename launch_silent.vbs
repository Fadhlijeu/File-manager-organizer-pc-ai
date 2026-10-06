Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
oShell.Run "wscript.exe " & Chr(34) & strDir & "\scripts\launch_silent.vbs" & Chr(34), 0, False
Set oShell = Nothing
