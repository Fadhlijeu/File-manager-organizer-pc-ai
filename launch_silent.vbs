Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\PROJECT\File-manager-organizer-pc-ai"
WshShell.Run """C:\Python314\pythonw.exe"" ""D:\PROJECT\File-manager-organizer-pc-ai\desktop_app.py""", 0, False
Set WshShell = Nothing
