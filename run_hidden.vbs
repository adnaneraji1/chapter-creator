Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentFolder = fso.GetParentFolderName(WScript.ScriptFullName)

shell.CurrentDirectory = currentFolder

shell.Run "pyw server.py", 0, False
WScript.Sleep 3000
shell.Run """C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"" --app=http://127.0.0.1:5000", 0, False