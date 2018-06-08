'
' This script will create a shortcut to the editor on the user desktop
'

Dim fso, shell, linkPath, shortCut, desktopPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = WScript.CreateObject("WScript.Shell")

workingPath = fso.GetAbsolutePathName(".")
desktopPath = shell.SpecialFolders("Desktop")
linkPath = fso.BuildPath(desktopPath, "JZedit.LNK") ' Place link on desktop

Set shortCut = shell.CreateShortcut(linkPath)

shortCut.TargetPath =  fso.BuildPath(workingPath, "start.bat")
shortCut.Arguments = "restart"
'  shortCut.Description = "JZedit"
'  shortCut.HotKey = "ALT+CTRL+J"
shortCut.IconLocation = fso.BuildPath(workingPath + "\client", "favicon.ico") '"C:\Program Files\MyApp\MyProgram.EXE, 2"
'  shortCut.WindowStyle = "1"
shortCut.WorkingDirectory = workingPath
shortCut.Save
