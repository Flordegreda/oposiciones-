Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = "F:\JEX\oposicion-app"
sh.CurrentDirectory = root
distHtml = root & "\dist\index.html"
electron = root & "\node_modules\electron\dist\electron.exe"
If fso.FileExists(distHtml) And fso.FileExists(electron) Then
  sh.Run """" & electron & """ .", 1, False
Else
  sh.Run "cmd /c npm run dev", 0, False
End If
